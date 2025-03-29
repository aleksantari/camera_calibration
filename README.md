![image_alt](https://github.com/aleksantari/camera_calibration/blob/7e231ef17c1bbb6a11f1ed1b3a9d88dbce23812f/img/Screenshot%202025-03-29%20at%2012.34.15%E2%80%AFPM.png)
# Camera Calibration Tool with Web GUI

I build this project with the OpenCV camera calibration open-source framework. It provides a web-based GUI for calibrating your camera by detecting a chessboard pattern in images. Users can either **upload a set of images** of a chessboard or **use their laptop’s webcam** to capture images in real time. Once you collect enough images, the tool generates a `.yml` file containing your camera’s intrinsic parameters and distortion coefficients.

---

## Camera Calibration Fundamentals

Camera calibration is the process of estimating the parameters of a camera model. These parameters fall into two categories:

### Intrinsic Parameters
Intrinsic parameters define the internal characteristics of the camera:
- **Focal Lengths (fx, fy):** How strongly the camera converges light.
- **Principal Point (cx, cy):** The optical center of the image.
- **Skew Coefficient:** (usually 0) represents the non-orthogonality of the sensor axes.

These parameters are organized into the **intrinsic matrix**.

### Extrinsic Parameters
Extrinsic parameters describe the camera’s position and orientation in the world:
- **Rotation Vectors (rvecs):** Represent the camera’s rotation relative to the calibration pattern.
- **Translation Vectors (tvecs):** Represent the camera’s position relative to the pattern.

### Distortion Models
Real-world lenses introduce distortions, which are typically modeled as:

#### Radial Distortion
Radial distortion causes straight lines to appear curved. It is typically modeled as:
  
$$
x_{\text{distorted}} = x (1 + k_1 r^2 + k_2 r^4 + k_3 r^6)
$$
$$
y_{\text{distorted}} = y (1 + k_1 r^2 + k_2 r^4 + k_3 r^6)
$$

Where:
- $r^2 = x^2 + y^2$
- $k_1$, $k_2$, and $k_3$ are the radial distortion coefficients.

#### Tangential Distortion
Tangential distortion occurs if the lens and the image sensor are not perfectly parallel. It is modeled as:

$$
x_{\text{tangent}} = 2p_1xy + p_2(r^2 + 2x^2)
$$
$$
y_{\text{tangent}} = p_1(r^2 + 2y^2) + 2p_2xy
$$

Where:
- $p_1$ and $p_2$ are the tangential distortion coefficients.

---

## Features
![image_alt](https://github.com/aleksantari/camera_calibration/blob/fd0c626c64555b1f03481de0310e77dd51627a40/img/Screenshot%202025-03-29%20at%2012.34.41%E2%80%AFPM.png)

- **Chessboard Configuration**: Customize the chessboard size (rows/columns) and the physical square size (mm).
- **Multiple Image Sources**: Upload images from your file system or capture them directly from your webcam.
- **Minimum Images Requirement**: While a minimum of 10 images is required, using over 30 images is recommended for more accurate calibration.
- **Checkerboard Corner Detection**: The tool automatically detects chessboard corners in each image.

![image_alt](https://github.com/aleksantari/camera_calibration/blob/fd0c626c64555b1f03481de0310e77dd51627a40/img/Screenshot%202025-03-29%20at%2012.35.38%E2%80%AFPM.png)

- **Image Verification**: Users can review and approve images that have valid corner detections.
- **Recalibration Options**:  
  - Recalibrate using updated parameters.
  - Option to fix the $k_3$ distortion coefficient at 0.
- **Undistortion Visualization**: Upload and visualize an undistorted version of an image while recalibrating.

![image_alt](https://github.com/aleksantari/camera_calibration/blob/fd0c626c64555b1f03481de0310e77dd51627a40/img/Screenshot%202025-03-29%20at%2012.36.05%E2%80%AFPM.png)

- **Calibration File Download**: Automatically generates and allows downloading a `.yml` file with calibration parameters.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/aleksantari/camera_calibration.git
cd camera_calibration
```

### 2. Set Up the Backend

1. Navigate into the backend directory:

   ```bash
   cd backend
   ```

2. Create a new Conda environment from the `environment.yml` and install additional packages:

   ```bash
   conda env create -f environment.yml
   conda activate camera-calibration
   pip install -r requirements.txt
   ```

3. Run the Flask backend:

   ```bash
   python app.py
   ```

   My was backend was available at http://127.0.0.1:5000. **YOURS MAY BE DIFFERENT** take note.

### 3. Set Up the Frontend

1. Open a new terminal (keeping the backend running) and navigate to the `frontend` directory:

   ```bash
   cd ../frontend
   ```

2. Create a **.env.local** file in the `frontend` root and add the following line to specify your backend URL:

   ```
   NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
   ```

   > **Note:** CHANGE the URL as needed.

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the Next.js development server:

   ```bash
   npm next dev
   ```

   By default, the frontend will be served at **http://localhost:3000**.

---

## Usage

1. **Open Your Browser**  
   Navigate to [http://localhost:3000](http://localhost:3000).

2. **Configure Your Chessboard**
   - Enter the square size (in millimeters).
   - Set the number of columns (width) and rows (height) of your chessboard.
   - Specify the output file name (defaults to `calibration info`).

3. **Choose Image Source**
   - **Upload Images**: Click the upload area to select images (at least 10 images are required, but using 30+ is recommended).
   - **Use Webcam**: Toggle to use the webcam, set the number of images to capture, then click **Start Capturing**.

4. **Review and Approve Images**
   - Check the **Calibration Images** section.
   - Remove any unwanted images by clicking the trash icon.
   - Approve images that have valid chessboard corner detections.

5. **Calibrate**
   - Once you have at least 10 approved images, click the **Calibrate** button.
   - The backend will process your images and return the calibration data (including intrinsic parameters, distortion coefficients, and reprojection error).
   - Calibration results are displayed on the frontend, and you can download the full calibration file as a `.yml`.

6. **Recalibration and Undistortion**
   - Use the **Recalibrate** option to update the calibration if needed.
   - Toggle the option to fix \(k_3\) at 0 if desired.
   - Upload a test image to visualize its undistorted version as you recalibrate.

---

## License

This project open-source licensed under the [MIT Liense].

---

> **Enjoy!**  
> If you have any questions, suggestions, or issues, please open an issue on GitHub or reach out on LinkedIn (aleksantari).

