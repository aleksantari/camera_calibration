#!/usr/bin/env python3
import cv2
import glob
import copy
import numpy as np
import argparse

def load_images(filenames):
    imgs = []
    for filename in filenames:
        img = cv2.imread(filename)
        if img is None:
            print("Warning: could not load", filename)
        else:
            imgs.append(img)
    return imgs

def get_chessboard_points(chessboard_shape, dx, dy):
    # Create 3D points for the chessboard pattern
    return [[(i % chessboard_shape[0]) * dx, (i // chessboard_shape[0]) * dy, 0] 
            for i in range(np.prod(chessboard_shape))]

def main():
    parser = argparse.ArgumentParser(description='Camera calibration script')
    parser.add_argument('--fix_k3', action='store_true',
                        help='Fix the third radial distortion coefficient (k3) to 0')
    parser.add_argument('--calib_dir', type=str, default='./left',
                        help='Directory containing calibration images (.jpg)')
    parser.add_argument('--pattern_size', type=str, default='8x6',
                        help='Chessboard pattern size as NxM (default 8x6)')
    parser.add_argument('--square_size', type=float, default=30.0,
                        help='Size of one chessboard square (default 30)')
    parser.add_argument('--output', type=str, default='calib_params.npz',
                        help='Output filename for calibration parameters')
    args = parser.parse_args()
    
    # Parse the chessboard pattern size
    try:
        dims = args.pattern_size.split('x')
        pattern_size = (int(dims[0]), int(dims[1]))
    except Exception as e:
        print("Error parsing pattern_size. Use format NxM, e.g., 8x6.")
        return

    # Load all JPEG images from the specified directory
    filenames = sorted(glob.glob(f"{args.calib_dir}/*.jpg"))
    if not filenames:
        print("No images found in directory:", args.calib_dir)
        return
    imgs = load_images(filenames)

    # Find chessboard corners in each image
    # cv2.findChessboardCorners returns a tuple (found, corners)
    corners = [cv2.findChessboardCorners(img, pattern_size) for img in imgs]
    # Make a deep copy for refinement
    corners2 = copy.deepcopy(corners)

    # Define termination criteria for cornerSubPix
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.01)
    
    # Convert images to grayscale (cv2.imread loads images in BGR format)
    imgs_gray = [cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) for img in imgs]
    # Refine corners using cornerSubPix for images where corners were found
    cornersRefined = []
    for gray, cor in zip(imgs_gray, corners2):
        if cor[0]:
            refined = cv2.cornerSubPix(gray, cor[1], (8,6), (-1,-1), criteria)
            cornersRefined.append(refined)
        else:
            cornersRefined.append([])

    # (Optional) Draw chessboard corners on the images for verification
    imgs_draw = [img.copy() for img in imgs]
    for i, cor in enumerate(corners):
        if cor[0]:
            cv2.drawChessboardCorners(imgs_draw[i], pattern_size, cor[1], cor[0])
            # You can display these images with cv2.imshow if desired.

    # Create the object points for the chessboard pattern
    real_points = get_chessboard_points(pattern_size, args.square_size, args.square_size)
    
    # Retrieve only the valid corners (where the chessboard was found)
    valid_corners = [cor[1] for cor in corners if cor[0]]
    if not valid_corners:
        print("No valid chessboard corners found!")
        return
    num_valid_images = len(valid_corners)
    
    # Prepare object points and image points arrays
    object_points = np.array([real_points for _ in range(num_valid_images)], dtype=np.float32)
    image_points = np.array(valid_corners, dtype=np.float32)
    
    # Use the size of the first image (in (width, height) order)
    h, w = imgs[0].shape[:2]
    image_size = (w, h)
    
    # Set calibration flags (fix k3 if requested)
    flags = 0
    if args.fix_k3:
        flags |= cv2.CALIB_FIX_K3

    # Calibrate the camera
    ret, intrinsics, dist_coeffs, rvecs, tvecs = cv2.calibrateCamera(
        object_points, image_points, image_size, None, None, flags=flags)
    
    # Compute extrinsic matrices (rotation matrices and translation vectors)
    extrinsics = [np.hstack((cv2.Rodrigues(rvec)[0], tvec)) for rvec, tvec in zip(rvecs, tvecs)]
    
    # Save the calibration parameters to a .npz file
    np.savez(args.output, intrinsic=intrinsics, extrinsic=extrinsics, dist_coeffs=dist_coeffs)
    
    # Print calibration results
    print("Corners standard intrinsics:\n", intrinsics)
    print("Corners standard dist_coefs:\n", dist_coeffs)
    print("RMS error from calibrateCamera:\n", ret)
    
    # Calculate total reprojection error manually
    mean_error = 0
    for i in range(len(object_points)):
        projected_points, _ = cv2.projectPoints(object_points[i], rvecs[i], tvecs[i], intrinsics, dist_coeffs)
        error = cv2.norm(image_points[i], projected_points, cv2.NORM_L2) / len(projected_points)
        mean_error += error
    mean_error /= len(object_points)
    print("Total reprojection error: {}".format(mean_error))

if __name__ == "__main__":
    main()
