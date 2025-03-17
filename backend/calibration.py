# backend/calibration.py
import cv2
import numpy as np
import tempfile
import os

def calibrate_camera(images, board_width, board_height, square_size, output_filename):
    """
    Runs the camera calibration using the provided images and chessboard configuration.
    Returns the contents of a .yml file as bytes.
    """
    # Define chessboard pattern size
    pattern_size = (board_width, board_height)

    # Termination criteria for refining corner locations
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.01)

    # Prepare object points for a single chessboard image.
    object_points_3d = []
    for i in range(board_height):
        for j in range(board_width):
            object_points_3d.append([j * square_size, i * square_size, 0])
    object_points_3d = np.array(object_points_3d, dtype=np.float32)

    # Lists to store the object points and image points from all images.
    obj_points_list = []
    img_points_list = []

    # Process each image.
    for img in images:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        found, corners = cv2.findChessboardCorners(gray, pattern_size)
        if found:
            refined_corners = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), criteria)
            obj_points_list.append(object_points_3d)
            img_points_list.append(refined_corners)

    if not obj_points_list or not img_points_list:
        raise ValueError("No valid chessboard corners found in the provided images.")

    # Calibrate the camera using the first image size.
    h, w = images[0].shape[:2]
    ret, intrinsics, dist_coeffs, rvecs, tvecs = cv2.calibrateCamera(
        obj_points_list, img_points_list, (w, h), None, None
    )

    # Create a temporary file to store the calibration parameters.
    with tempfile.NamedTemporaryFile(suffix=".yml", delete=False) as temp_file:
        temp_filename = temp_file.name

    # Write calibration data to the temporary file.
    fs = cv2.FileStorage(temp_filename, cv2.FILE_STORAGE_WRITE)
    fs.write("intrinsic", intrinsics)
    fs.write("distCoeffs", dist_coeffs)
    fs.write("rms", ret)
    fs.release()

    # Read the contents of the temporary file.
    with open(temp_filename, "rb") as f:
        yml_bytes = f.read()

    # Clean up the temporary file.
    os.remove(temp_filename)

    return yml_bytes
