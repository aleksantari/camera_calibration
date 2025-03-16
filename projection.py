#!/usr/bin/env python3
import cv2
import numpy as np
import open3d as o3d
import argparse

def main():
    parser = argparse.ArgumentParser(
        description="Generate and visualize a 3D point cloud using a color and depth image."
    )
    parser.add_argument('--color', type=str, default="normal.jpg",
                        help="Path to the color image (default: normal.jpg)")
    parser.add_argument('--depth', type=str, default="depth.jpg",
                        help="Path to the depth image (default: depth.jpg)")
    parser.add_argument('--calib', type=str, default="calib_params.npz",
                        help="Path to the calibration parameters file (default: calib_params.npz)")
    parser.add_argument('--depth_scale', type=float, default=1.0,
                        help="Scale factor to convert depth values to metric units (default: 1.0)")
    args = parser.parse_args()

    # Load calibration parameters
    calib_data = np.load(args.calib)
    intrinsic = calib_data['intrinsic']  # Expected shape: (3, 3)
    fx = intrinsic[0, 0]
    fy = intrinsic[1, 1]
    cx = intrinsic[0, 2]
    cy = intrinsic[1, 2]

    print("Loaded intrinsic matrix:")
    print(intrinsic)

    # Load color image and convert from BGR to RGB
    color_img = cv2.imread(args.color)
    if color_img is None:
        print("Error: Unable to load color image:", args.color)
        return
    color_img = cv2.cvtColor(color_img, cv2.COLOR_BGR2RGB)

    # Load depth image with unchanged flag to preserve original values
    depth_img = cv2.imread(args.depth, cv2.IMREAD_UNCHANGED)
    if depth_img is None:
        print("Error: Unable to load depth image:", args.depth)
        return

    # If depth image has multiple channels, convert it to grayscale (single channel)
    if len(depth_img.shape) > 2:
        depth_img = cv2.cvtColor(depth_img, cv2.COLOR_BGR2GRAY)

    # Convert depth to float and apply scaling factor
    depth_img = depth_img.astype(np.float32) * args.depth_scale

    height, width = depth_img.shape[:2]

    # Create a grid of pixel coordinates (u, v)
    u = np.arange(width)
    v = np.arange(height)
    uu, vv = np.meshgrid(u, v)

    # Flatten arrays for vectorized computation
    uu = uu.flatten()
    vv = vv.flatten()
    depth_flat = depth_img.flatten()

    # Only use valid depth points (non-zero)
    valid = depth_flat > 0
    uu = uu[valid]
    vv = vv[valid]
    depth_flat = depth_flat[valid]

    # Compute 3D points in the camera coordinate system:
    #   x = (u - cx) * z / fx, y = (v - cy) * z / fy, z = depth
    x = (uu - cx) * depth_flat / fx
    y = (vv - cy) * depth_flat / fy
    z = depth_flat

    points = np.stack((x, y, z), axis=-1)

    # Retrieve corresponding colors for valid points
    color_img_flat = color_img.reshape(-1, 3)
    colors = color_img_flat[valid] / 255.0  # Normalize to [0, 1]

    # Create an Open3D point cloud and assign points and colors
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points)
    pcd.colors = o3d.utility.Vector3dVector(colors)

    # Visualize the point cloud
    o3d.visualization.draw_geometries(
        [pcd],
        window_name="3D Point Cloud",
        width=800,
        height=600,
        left=50,
        top=50,
        point_show_normal=False
    )

if __name__ == "__main__":
    main()
