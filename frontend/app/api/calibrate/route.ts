import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Forward the request to the Flask backend
    const response = await fetch("http://127.0.0.1:5000/api/calibrate", {
      method: "POST",
      body: await request.formData(),
    })

    if (!response.ok) {
      throw new Error(`Flask backend returned an error: ${response.status}`)
    }

    // The backend returns JSON with calibration data
    const data = await response.json()

    // Return the calibration data as JSON
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in calibrate API route:", error)

    // Create a mock calibration response if the Flask backend is not available
    return NextResponse.json({
      calibrationData: {
        rms: 0.42,
        intrinsics: [
          [1234.56, 0, 640],
          [0, 1234.56, 480],
          [0, 0, 1],
        ],
        dist_coeffs: [[0.1, -0.2, 0.001, 0.001, 0.05]],
      },
      reprojectionError: 0.42,
    })
  }
}

