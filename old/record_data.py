#!/usr/bin/env python3
import cv2
import os
import time
import subprocess
import argparse

def main():
    parser = argparse.ArgumentParser(description="Record calibration images and optionally run camera calibration.")
    parser.add_argument('--fix_k3', action='store_true',
                        help="If set, pass --fix_k3 to camera_calibration.py to fix the third radial distortion coefficient.")
    parser.add_argument('--calib_folder', type=str, default="calibration_images",
                        help="Folder to store calibration images (default: calibration_images)")
    parser.add_argument('--camera_calib_script', type=str, default="camera_calibration.py",
                        help="Path to the camera calibration script (default: camera_calibration.py)")
    args = parser.parse_args()
    
    # Create the calibration images folder if it doesn't exist
    if not os.path.exists(args.calib_folder):
        os.makedirs(args.calib_folder)
        print(f"Created folder: {args.calib_folder}")
    
    # Open the webcam (device 0)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Unable to access the camera.")
        return

    print("Instructions:")
    print("  Press 'r' to start recording images.")
    print("  Press 's' to stop recording images.")
    print("  Press 'c' to run the calibration script (camera_calibration.py).")
    print("  Press 'q' to quit.")

    recording = False
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break
        
        cv2.imshow("Camera Feed", frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('r'):
            if not recording:
                recording = True
                print("Recording started...")
        elif key == ord('s'):
            if recording:
                recording = False
                print("Recording stopped.")
        elif key == ord('c'):
            print("Calling calibration script...")
            # Build the command to run camera_calibration.py with the proper calibration folder.
            command = ["python", args.camera_calib_script, "--calib_dir", args.calib_folder]
            if args.fix_k3:
                command.append("--fix_k3")
            subprocess.run(command)
        elif key == ord('q'):
            print("Exiting.")
            break
        
        # If recording is active, save frames at a controlled rate.
        if recording:
            filename = os.path.join(args.calib_folder, f"img_{frame_count:04d}.jpg")
            cv2.imwrite(filename, frame)
            print(f"Saved {filename}")
            frame_count += 1
            time.sleep(0.5)  # Adjust the delay as needed

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
