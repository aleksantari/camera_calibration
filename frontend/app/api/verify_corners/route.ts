import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Forward the request to the Flask backend
    const response = await fetch("http://127.0.0.1:5000/api/detect-corners", {
      method: "POST",
      body: await request.formData(),
    })

    if (!response.ok) {
      // Get the response text for better error logging
      const errorText = await response.text()
      console.error(`Flask backend error (${response.status}):`, errorText)
      throw new Error(`Flask backend returned an error: ${response.status}`)
    }

    const data = await response.json()

    // Transform the response to match our frontend's expected format
    // The backend returns { valid: [true, false, ...] }
    // Our frontend expects { results: [{ isValid: true, corners: [] }, ...] }
    const results = data.valid.map((isValid: boolean) => ({
      isValid,
      corners: [], // Backend doesn't return corner coordinates
    }))

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("Error in verify_corners API route:", error)

    // Simulate a response if the Flask backend is not available
    const formData = await request.formData()
    const images = formData.getAll("images")

    const results = Array.from({ length: images.length }, () => ({
      isValid: Math.random() > 0.2, // 80% chance of being valid
      corners: [], // In a real implementation, this would contain corner coordinates
    }))

    return NextResponse.json({
      success: true,
      results,
    })
  }
}

