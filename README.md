
![Screenshot 2025-03-17 at 12 45 56 AM](https://github.com/user-attachments/assets/d342c20a-b03f-4143-b1ba-fd066113ecbd)

A camera calibration tool with web gui. Users can either **upload a set of images** of a chessboard or **use their laptop’s webcam** to capture images in real time. Once you collect enough images, the tool generates a `.yml` file containing your camera’s intrinsic parameters and distortion coefficients.

---


## Features

- **Chessboard Configuration**: Customize the chessboard size (rows/columns) and the physical square size (mm).  
- **Multiple Image Sources**: Either upload images from your file system or capture them directly from your webcam.  
- **Minimum 10 Images**: Ensures enough viewpoints for accurate calibration.  
- **Automated Download**: Generates a `.yml` file with camera parameters for easy integration into other computer vision projects.

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
2. Create a new Conda environment from the `environment.yml` and `requirements.txt`:
   ```bash
   conda env create -f environment.yml
   conda activate camera-calibration
   pip install -r requirements.txt
   ```
3. Run the Flask backend:
   ```bash
   python app.py
   ```
   The backend will be available at **http://127.0.0.1:5000**.

### 3. Set Up the Frontend

1. Open a new terminal (leaving the backend running) and navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npx next dev
   ```
   By default, the frontend will be served at **http://localhost:3000**.

---

## Usage

1. **Open Your Browser**  
   Go to [http://localhost:3000](http://localhost:3000).

2. **Configure Your Chessboard**

   ![Screenshot 2025-03-17 at 12 46 43 AM](https://github.com/user-attachments/assets/7293b2b1-51be-4b0c-97a7-4c39b9e46d5c)

   - Enter the size of each square (in millimeters).  
   - Set the number of columns (width) and rows (height) for your chessboard.  
   - Specify the output file name (defaults to `calibration info`).

4. **Choose Image Source**

   ![Screenshot 2025-03-17 at 12 47 25 AM](https://github.com/user-attachments/assets/3a318839-cf63-496e-bae7-b6640396c04b)
   ![Screenshot 2025-03-17 at 12 47 47 AM](https://github.com/user-attachments/assets/54f05744-31b2-4413-aac3-923981c9316f)

   - **Toggle** between **Upload Images** or **Use Webcam**:
     - **Upload Images**: Click the upload area to select images (at least 10).  
     - **Use Webcam**: Adjust the slider for how many images you want, then click **Start Capturing** to display your webcam feed. Capture images until you reach your desired count.

5. **Review Captured Images**
   ![Screenshot 2025-03-17 at 12 48 22 AM](https://github.com/user-attachments/assets/2701a025-893f-46f1-b769-d2e6cb212944)

   - You can see your uploaded or captured images in the **Calibration Images** section.  
   - Click the **trash icon** to remove an image if needed.

8. **Calibrate**  
   - Once you have at least 10 images, the **Calibrate** button becomes active.  
   - Clicking **Calibrate** sends your images and parameters to the Flask backend.  
   - If successful, a `.yml` file containing the calibration parameters will automatically download.

9. **Results**  
   - A success or error message will appear at the bottom of the page.  
   - You can re-capture or re-upload images as needed to improve your calibration results.

---

## License

This project is licensed under the [MIT License].

---

> **Enjoy!** If you have any questions, suggestions or issues, please open an issue on GitHub or reach out on linkedin/aleksantari.

