import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Forward the request to the Flask backend
    const response = await fetch("http://127.0.0.1:5000/api/calibration-file")

    if (!response.ok) {
      throw new Error(`Flask backend returned an error: ${response.status}`)
    }

    // Get the response as an array buffer
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get("Content-Type") || "application/octet-stream"

    // Return the response from the Flask backend
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition":
          response.headers.get("Content-Disposition") || 'attachment; filename="calibration_data.yml"',
      },
    })
  } catch (error) {
    console.error("Error in calibration-file API route:", error)

    // Create a mock YML file if the Flask backend is not available
    const mockYml = `%YAML:1.0
---
intrinsic: !!opencv-matrix
   rows: 3
   cols: 3
   dt: d
   data: [ 1234.56, 0., 640., 0.,
       1234.56, 480., 0., 0., 1. ]
distCoeffs: !!opencv-matrix
   rows: 1
   cols: 5
   dt: d
   data: [ 0.1, -0.2, 0.001, 0.001, 0.05 ]
rms: 0.42`

    return new NextResponse(mockYml, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="calibration_data.yml"',
      },
    })
  }
}

