import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Forward the request to the Flask backend
    const response = await fetch("http://127.0.0.1:5000/api/undistort", {
      method: "POST",
      body: await request.formData(),
    })

    if (!response.ok) {
      throw new Error(`Flask backend returned an error: ${response.status}`)
    }

    // The backend returns JSON with a base64-encoded image
    const data = await response.json()

    // Return the base64 image data
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in undistort API route:", error)

    // Return a fallback response if the Flask backend is not available
    try {
      const formData = await request.formData()
      const image = formData.get("image") as File

      if (!image) {
        return NextResponse.json({ error: "No image provided" }, { status: 400 })
      }

      // Convert the original image to base64
      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64Image = buffer.toString("base64")

      return NextResponse.json({
        undistortedImage: base64Image,
      })
    } catch (fallbackError) {
      console.error("Error in undistort API route fallback:", fallbackError)
      return NextResponse.json({ error: "Failed to process image" }, { status: 500 })
    }
  }
}

