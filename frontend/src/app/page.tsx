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

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageDataUrl = canvas.toDataURL("image/png")
    setImages((prev) => [...prev, imageDataUrl])
  }

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

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const startCapturing = () => {
    setIsCapturing(true)
    setImages([])
  }

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
      })

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
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold mb-1 text-white">Camera Calibration!</h1>
        <h1 className="text-xl font-bold mb-1 text-white">created by ALEKSANTARI</h1>
        <p className="text-purple-light/80 mb-6 max-w-2xl mx-auto">
          Calibrate your camera by capturing images of a chessboard pattern from different angles. For best results,
          ensure the entire chessboard is visible in each image and capture from various perspectives.
        </p>
        <div className="flex justify-center items-center gap-6 mb-8">
          <a href="https://github.com/aleksantari" target="_blank" rel="noopener noreferrer" className="social-button">
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
            className="social-button"
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-purple-light">Chessboard Configuration</CardTitle>
            <CardDescription>Set the physical properties of your calibration chessboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="squareSize" className="text-purple-light">
                Square Size (mm)
              </Label>
              <Input
                id="squareSize"
                type="number"
                value={squareSize}
                onChange={(e) => setSquareSize(Number(e.target.value))}
                min={1}
                className="bg-secondary/50 border-purple/30 focus:border-purple focus:ring-purple"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="boardWidth" className="text-purple-light">
                  Board Width (columns)
                </Label>
                <Input
                  id="boardWidth"
                  type="number"
                  value={boardWidth}
                  onChange={(e) => setBoardWidth(Number(e.target.value))}
                  min={3}
                  className="bg-secondary/50 border-purple/30 focus:border-purple focus:ring-purple"
                />
              </div>
              <div>
                <Label htmlFor="boardHeight" className="text-purple-light">
                  Board Height (rows)
                </Label>
                <Input
                  id="boardHeight"
                  type="number"
                  value={boardHeight}
                  onChange={(e) => setBoardHeight(Number(e.target.value))}
                  min={3}
                  className="bg-secondary/50 border-purple/30 focus:border-purple focus:ring-purple"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="outputFileName" className="text-purple-light">
                Output File Name
              </Label>
              <Input
                id="outputFileName"
                value={outputFileName}
                onChange={(e) => setOutputFileName(e.target.value)}
                placeholder="calibration info"
                className="bg-secondary/50 border-purple/30 focus:border-purple focus:ring-purple"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-purple-light">Image Source</CardTitle>
            <CardDescription>Choose between uploading images or using your webcam</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/50 border border-purple/20">
              <Switch
                id="useWebcam"
                checked={useWebcam}
                onCheckedChange={setUseWebcam}
                className="glass-switch data-[state=checked]:bg-purple"
              />
              <Label htmlFor="useWebcam" className="text-purple-light font-medium">
                {useWebcam ? "Use Webcam" : "Upload Images"}
              </Label>
            </div>

            {useWebcam ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-purple-light">Number of Images to Capture: {imagesToCapture}</Label>
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
                    <div className="relative aspect-video bg-black/40 rounded-lg overflow-hidden border border-purple/20 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                      <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline muted />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-purple-light">
                        {images.length} / {imagesToCapture} images captured
                      </span>
                      <Button
                        onClick={captureImage}
                        disabled={images.length >= imagesToCapture}
                        className="glass-button"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Capture Image
                      </Button>
                    </div>

                    {images.length >= imagesToCapture && (
                      <div className="text-center text-purple font-medium">All required images captured!</div>
                    )}
                  </div>
                ) : (
                  <Button onClick={startCapturing} className="glass-button w-full py-6">
                    <Camera className="mr-2 h-5 w-5" />
                    Start Capturing
                  </Button>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 glass-button border-dashed"
                >
                  <div className="flex flex-col items-center">
                    <Upload className="h-8 w-8 mb-2" />
                    <span>Click to upload images</span>
                    <span className="text-xs text-purple-light/80 mt-1">(Minimum 10 images required)</span>
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
      <Card className="mt-8 glass-card">
        <CardHeader>
          <CardTitle className="text-purple-light">Calibration Images</CardTitle>
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
                    className="w-full aspect-square object-cover rounded-md border border-purple/20"
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
            <div className="text-center py-12 text-purple-light/60">
              No images available. Please {useWebcam ? "capture" : "upload"} some images.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={calibrate}
            disabled={images.length < 10 || isCalibrating}
            className={cn("glass-button min-w-40 py-6 text-lg", isCalibrating ? "opacity-80" : "animate-pulse")}
          >
            {isCalibrating ? (
              <>
                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Calibrating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Calibrate
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {calibrationResult && (
        <div
          className={cn(
            "mt-4 p-4 rounded-md text-center backdrop-blur-md border",
            calibrationResult.includes("successful")
              ? "bg-green-500/20 text-green-300 border-green-500/30"
              : "bg-red-500/20 text-red-300 border-red-500/30",
          )}
        >
          {calibrationResult}
        </div>
      )}
    </div>
  )
}

