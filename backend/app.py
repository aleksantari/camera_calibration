# backend/app.py
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import io
import cv2
import numpy as np

from calibration import calibrate_camera

app = Flask(__name__)
CORS(app)  # Enable CORS for local dev if frontend is on a different port (3000 vs 5000)

@app.route("/api/calibrate", methods=["POST"])
def calibrate():
    """
    Handles the POST request from the Next.js frontend. 
    Expects multipart/form-data containing:
      - squareSize
      - boardWidth
      - boardHeight
      - outputFileName
      - images (list of image files)
    Returns a .yml file as an attachment.
    """
    try:
        # 1. Parse form data
        square_size = float(request.form["squareSize"])
        board_width = int(request.form["boardWidth"])
        board_height = int(request.form["boardHeight"])
        output_filename = request.form["outputFileName"]

        # 2. Retrieve images from request.files
        files = request.files.getlist("images")
        if not files:
            return jsonify({"error": "No images provided"}), 400

        # 3. Decode each image in memory
        images = []
        for f in files:
            in_memory_file = f.read()
            np_img = np.frombuffer(in_memory_file, np.uint8)
            img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
            if img is not None:
                images.append(img)

        if len(images) < 10:
            return jsonify({"error": "At least 10 images are required for calibration"}), 400

        # 4. Run calibration
        yml_bytes = calibrate_camera(images, board_width, board_height, square_size, output_filename)

        # 5. Return the file as a download
        return send_file(
            io.BytesIO(yml_bytes),
            mimetype="application/octet-stream",
            as_attachment=True,
            download_name=f"{output_filename}.yml",
        )

    except Exception as e:
        print("Calibration error:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
