# backend/calibration.py
import cv2
import numpy as np
import tempfile
import os

def get_object_points(board_width, board_height, square_size):
    """
    Create a single set of 3D object points for the chessboard pattern.
    """
    objp = np.zeros((board_height * board_width, 3), np.float32)
    objp[:, :2] = np.mgrid[0:board_width, 0:board_height].T.reshape(-1, 2)
    return objp * square_size

def detect_corners(images, board_width, board_height, criteria=None):
    """
    Detect chessboard corners in a list of images.
    Returns a list where each element is either the refined corner data (if found) or None.
    """
    if criteria is None:
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.01)
    pattern_size = (board_width, board_height)
    detected = []
    for img in images:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        found, corners = cv2.findChessboardCorners(gray, pattern_size)
        if found:
            refined = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), criteria)
            detected.append(refined)
        else:
            detected.append(None)
    return detected

def calibrate_camera(images, detected_corners, board_width, board_height, square_size, flags=0):
    """
    Calibrates the camera using only the images with valid detected corners.
    Returns a dictionary containing calibration parameters.
    """
    objp = get_object_points(board_width, board_height, square_size)
    obj_points_list = []
    img_points_list = []
    
    for corners in detected_corners:
        if corners is not None:
            obj_points_list.append(objp)
            img_points_list.append(corners)
            
    if len(obj_points_list) < 10:
        raise ValueError("At least 10 valid images are required for calibration.")
    
    # Use the size of the first valid image.
    valid_idx = next(i for i, d in enumerate(detected_corners) if d is not None)
    h, w = images[valid_idx].shape[:2]
    ret, intrinsics, dist_coeffs, rvecs, tvecs = cv2.calibrateCamera(
        obj_points_list, img_points_list, (w, h), None, None, flags=flags
    )
    
    return {
        "rms": ret,
        "intrinsics": intrinsics,
        "dist_coeffs": dist_coeffs,
        "rvecs": rvecs,
        "tvecs": tvecs,
        "object_points": obj_points_list,
        "image_points": img_points_list,
    }

def save_calibration_to_yml(calib_data, output_filename):
    """
    Saves the calibration data to a temporary YAML file and returns its byte content.
    """
    with tempfile.NamedTemporaryFile(suffix=".yml", delete=False) as temp_file:
        temp_filename = temp_file.name

    fs = cv2.FileStorage(temp_filename, cv2.FILE_STORAGE_WRITE)
    fs.write("intrinsic", calib_data["intrinsics"])
    fs.write("distCoeffs", calib_data["dist_coeffs"])
    fs.write("rms", calib_data["rms"])
    fs.release()

    with open(temp_filename, "rb") as f:
        yml_bytes = f.read()
    os.remove(temp_filename)
    return yml_bytes

def compute_reprojection_error(calib_data):
    """
    Computes and returns the mean reprojection error over all calibration images.
    """
    total_error = 0
    for i in range(len(calib_data["object_points"])):
        projected_points, _ = cv2.projectPoints(
            calib_data["object_points"][i],
            calib_data["rvecs"][i],
            calib_data["tvecs"][i],
            calib_data["intrinsics"],
            calib_data["dist_coeffs"]
        )
        error = cv2.norm(calib_data["image_points"][i], projected_points, cv2.NORM_L2) / len(projected_points)
        total_error += error
    return total_error / len(calib_data["object_points"])

def undistort_image(image, calib_data):
    """
    Undistorts the provided image using the calibration data.
    """
    h, w = image.shape[:2]
    new_camera_matrix, roi = cv2.getOptimalNewCameraMatrix(
        calib_data["intrinsics"], calib_data["dist_coeffs"], (w, h), 1, (w, h)
    )
    return cv2.undistort(image, calib_data["intrinsics"], calib_data["dist_coeffs"], None, new_camera_matrix)
