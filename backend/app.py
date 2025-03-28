# backend/app.py
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import io
import cv2
import numpy as np
import base64

from calibration import (
    detect_corners,
    calibrate_camera,
    save_calibration_to_yml,
    undistort_image,
    compute_reprojection_error,
)

app = Flask(__name__)
CORS(app)

# Global variable to store calibration data
calibration_data = None

@app.route("/api/detect-corners", methods=["POST"])
def detect_corners_endpoint():
    """
    Processes images to detect chessboard corners.
    Returns a JSON response containing:
      - valid: a list of booleans indicating whether valid corners were found for each image.
    """
    try:
        board_width = int(request.form["boardWidth"])
        board_height = int(request.form["boardHeight"])
        files = request.files.getlist("images")
        if not files:
            return jsonify({"error": "No images provided"}), 400

        images = []
        for f in files:
            np_img = np.frombuffer(f.read(), np.uint8)
            img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
            if img is not None:
                images.append(img)

        detected = detect_corners(images, board_width, board_height)
        valid = [c is not None for c in detected]

        return jsonify({"valid": valid})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/calibrate", methods=["POST"])
def calibrate_endpoint():
    """
    Calibrates the camera using approved images.
    Expects:
      - boardWidth, boardHeight, squareSize, outputFileName, and an optional 'fixK3' flag.
      - Images (multipart/form-data).
    Returns a JSON response containing:
      - calibrationData: global calibration data (intrinsics, distortion coefficients, etc.)
      - reprojectionError: the mean reprojection error.
    """
    global calibration_data
    try:
        board_width = int(request.form["boardWidth"])
        board_height = int(request.form["boardHeight"])
        square_size = float(request.form["squareSize"])
        fix_k3 = request.form.get("fixK3", "false").lower() == "true"
        flags = cv2.CALIB_FIX_K3 if fix_k3 else 0

        files = request.files.getlist("images")
        if not files:
            return jsonify({"error": "No images provided"}), 400

        images = []
        for f in files:
            np_img = np.frombuffer(f.read(), np.uint8)
            img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
            if img is not None:
                images.append(img)

        detected = detect_corners(images, board_width, board_height)
        valid_corners = [d for d in detected if d is not None]
        if len(valid_corners) < 10:
            return jsonify({"error": "At least 10 valid images are required for calibration"}), 400

        calibration_data = calibrate_camera(images, detected, board_width, board_height, square_size, flags=flags)
        reprojection_error = compute_reprojection_error(calibration_data)
        
        # Convert numpy arrays to lists for JSON serialization.
        calib_json = {
            "rms": calibration_data["rms"],
            "intrinsics": calibration_data["intrinsics"].tolist(),
            "dist_coeffs": calibration_data["dist_coeffs"].tolist(),
            "rvecs": [rvec.tolist() for rvec in calibration_data["rvecs"]],
            "tvecs": [tvec.tolist() for tvec in calibration_data["tvecs"]],
        }
        return jsonify({
            "calibrationData": calib_json,
            "reprojectionError": reprojection_error
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/calibration-file", methods=["GET"])
def calibration_file_endpoint():
    """
    Returns the global calibration data as a downloadable YAML file.
    """
    global calibration_data
    if calibration_data is None:
        return jsonify({"error": "Camera is not calibrated yet."}), 400
    yml_bytes = save_calibration_to_yml(calibration_data, "calibration_data")
    return send_file(
        io.BytesIO(yml_bytes),
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name="calibration_data.yml",
    )

@app.route("/api/undistort", methods=["POST"])
def undistort_endpoint():
    """
    Undistorts the provided image using the stored calibration data.
    Expects an image file (multipart/form-data).
    Returns a JSON response with the undistorted image as a base64-encoded JPEG.
    """
    global calibration_data
    try:
        if calibration_data is None:
            return jsonify({"error": "Camera is not calibrated yet."}), 400

        file = request.files.get("image")
        if file is None:
            return jsonify({"error": "No image provided"}), 400

        np_img = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        if image is None:
            return jsonify({"error": "Invalid image."}), 400

        undistorted = undistort_image(image, calibration_data)
        _, buffer = cv2.imencode(".jpg", undistorted)
        undistorted_b64 = base64.b64encode(buffer).decode("utf-8")
        return jsonify({"undistortedImage": undistorted_b64})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
