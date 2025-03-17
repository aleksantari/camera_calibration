"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Camera, Upload, Download, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function CameraCalibration() {
  const [squareSize, setSquareSize] = useState(30)
  const [boardWidth, setBoardWidth] = useState(8)
  const [boardHeight, setBoardHeight] = useState(6)
  const [useWebcam, setUseWebcam] = useState(false)
  const [imagesToCapture, setImagesToCapture] = useState(10)
  const [outputFileName, setOutputFileName] = useState("calibration info")
  const [images, setImages] = useState<string[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationResult, setCalibrationResult] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // effect to handle webcam initialization when useWebcam is enabled
  useEffect(() => {
    let stream: MediaStream | null = null

    if (useWebcam) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((mediaStream) => {
          stream = mediaStream
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream
            videoRef.current.play()
          }
        })
        .catch((error) => {
          console.error("Error accessing webcam:", error)
        })
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop()) // stop webcam steam when unmounted
      }
    }
  }, [useWebcam])

  // function to capture image from webcam
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    //set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // convert canvas image to a data url
    const imageDataUrl = canvas.toDataURL("image/png")
    setImages((prev) => [...prev, imageDataUrl])
  }

  // handle file upload for calibration images
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: string[] = []

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string)
          if (newImages.length === files.length) {
            setImages((prev) => [...prev, ...newImages])
          }
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // remove an image from the image list
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  //  start capturing images (clears previous images)
  const startCapturing = () => {
    setIsCapturing(true)
    setImages([])
  }

  // function to send images to backend for calibration
  const calibrate = async () => {
    if (images.length < 10) {
      alert("Please capture or upload at least 10 images for calibration.")
      return
    }

    setIsCalibrating(true)

    try {
      // Prepare data to send to Flask backend
      const formData = new FormData()
      formData.append("squareSize", squareSize.toString())
      formData.append("boardWidth", boardWidth.toString())
      formData.append("boardHeight", boardHeight.toString())
      formData.append("outputFileName", outputFileName)

      // Convert base64 images to blobs and append to formData
      images.forEach((image, index) => {
        const blob = dataURLtoBlob(image)
        formData.append("images", blob, `image_${index}.png`)
      })

      // Send to Flask backend
      const response = await fetch("http://127.0.0.1:5000/api/calibrate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Calibration failed")
      }

      // Handle successful calibration
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      // Create download link
      const a = document.createElement("a")
      a.href = url
      a.download = `${outputFileName}.yml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setCalibrationResult("Calibration successful! File downloaded.")
    } catch (error) {
      console.error("Calibration error:", error)
      setCalibrationResult("Calibration failed. Please try again.")
    } finally {
      setIsCalibrating(false)
    }
  }

  // Helper function to convert data URL to Blob
  const dataURLtoBlob = (dataURL: string) => {
    const arr = dataURL.split(",")
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }

    return new Blob([u8arr], { type: mime })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-5xl font-bold text-center mb-2">Camera Calibration</h1>
      <h2 className="text-3xl text-center mb-2">by Aleksantari</h2>
      <p className="text-center text-gray-600 mb-8">
        Calibrate your camera by capturing images of a chessboard pattern from different angles. For best results,
        ensure the entire chessboard is visible in each image and capture from various perspectives.
      </p>

      <div className="flex justify-center items-center gap-4 mb-8">
        <a
          href="https://github.com/aleksantari"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-github"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
            <path d="M9 18c-4.51 2-5-2-7-2"></path>
          </svg>
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/aleksantari/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-linkedin"
          >
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
            <rect width="4" height="12" x="2" y="9"></rect>
            <circle cx="4" cy="4" r="2"></circle>
          </svg>
          LinkedIn
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Chessboard Configuration</CardTitle>
            <CardDescription>Set the physical properties of your calibration chessboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="squareSize">Square Size (mm)</Label>
              <Input
                id="squareSize"
                type="number"
                value={squareSize}
                onChange={(e) => setSquareSize(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="boardWidth">Board Width (columns)</Label>
                <Input
                  id="boardWidth"
                  type="number"
                  value={boardWidth}
                  onChange={(e) => setBoardWidth(Number(e.target.value))}
                  min={3}
                />
              </div>
              <div>
                <Label htmlFor="boardHeight">Board Height (rows)</Label>
                <Input
                  id="boardHeight"
                  type="number"
                  value={boardHeight}
                  onChange={(e) => setBoardHeight(Number(e.target.value))}
                  min={3}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="outputFileName">Output File Name</Label>
              <Input
                id="outputFileName"
                value={outputFileName}
                onChange={(e) => setOutputFileName(e.target.value)}
                placeholder="calibration info"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image Source</CardTitle>
            <CardDescription>Choose between uploading images or using your webcam</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="useWebcam" checked={useWebcam} onCheckedChange={setUseWebcam} />
              <Label htmlFor="useWebcam">{useWebcam ? "Use Webcam" : "Upload Images"}</Label>
            </div>

            {useWebcam ? (
              <div className="space-y-4">
                <div>
                  <Label>Number of Images to Capture: {imagesToCapture}</Label>
                  <Slider
                    value={[imagesToCapture]}
                    min={10}
                    max={30}
                    step={1}
                    onValueChange={(value) => setImagesToCapture(value[0])}
                    className="mt-2"
                  />
                </div>

                {isCapturing ? (
                  <div className="space-y-4">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline muted />
                    </div>

                    <div className="flex justify-between items-center">
                      <span>
                        {images.length} / {imagesToCapture} images captured
                      </span>
                      <Button onClick={captureImage} disabled={images.length >= imagesToCapture}>
                        <Camera className="mr-2 h-4 w-4" />
                        Capture Image
                      </Button>
                    </div>

                    {images.length >= imagesToCapture && (
                      <div className="text-center text-green-600">All required images captured!</div>
                    )}
                  </div>
                ) : (
                  <Button onClick={startCapturing}>
                    <Camera className="mr-2 h-4 w-4" />
                    Start Capturing
                  </Button>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-32 border-dashed"
                >
                  <div className="flex flex-col items-center">
                    <Upload className="h-8 w-8 mb-2" />
                    <span>Click to upload images</span>
                    <span className="text-xs text-gray-500 mt-1">(Minimum 10 images required)</span>
                  </div>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image Gallery */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Calibration Images</CardTitle>
          <CardDescription>
            {images.length > 0
              ? `${images.length} images collected${images.length < 10 ? " (minimum 10 required)" : ""}`
              : "No images collected yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image || "/placeholder.svg"}
                    alt={`Calibration image ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-md"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No images available. Please {useWebcam ? "capture" : "upload"} some images.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={calibrate}
            disabled={images.length < 10 || isCalibrating}
            className={cn("min-w-32", isCalibrating && "opacity-80")}
          >
            {isCalibrating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Calibrating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Calibrate
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {calibrationResult && (
        <div
          className={cn(
            "mt-4 p-4 rounded-md text-center",
            calibrationResult.includes("successful") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
          )}
        >
          {calibrationResult}
        </div>
      )}
    </div>
  )
}

