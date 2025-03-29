"use client"

import React from "react"

import type { FunctionComponent } from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Camera,
  Upload,
  Download,
  Trash2,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  ImagePlus,
  RotateCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

// Define types for our application
type ImageData = {
  id: string
  src: string
  blob?: Blob
  isValid?: boolean
  isApproved?: boolean
  corners?: number[][]
}

type CalibrationResult = {
  intrinsicMatrix: number[][]
  distortionCoefficients: number[]
  reprojectionError: number
  yml: Blob
}

const CameraCalibration: FunctionComponent = () => {
  // Configuration state
  const [squareSize, setSquareSize] = useState(30)
  const [boardWidth, setBoardWidth] = useState(8)
  const [boardHeight, setBoardHeight] = useState(6)
  const [useWebcam, setUseWebcam] = useState(false)
  const [imagesToCapture, setImagesToCapture] = useState(10)
  const [outputFileName, setOutputFileName] = useState("calibration info")

  // Workflow state
  const [currentStep, setCurrentStep] = useState<"config" | "collection" | "verification" | "calibration" | "analysis">(
    "config",
  )
  const [isCapturing, setIsCapturing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Images state
  const [images, setImages] = useState<ImageData[]>([])
  const [verifiedImages, setVerifiedImages] = useState<ImageData[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  // Update the distortionCoefficients state to only include k3
  const [fixK3, setFixK3] = useState(false)

  // Analysis state
  const [testImage, setTestImage] = useState<ImageData | null>(null)
  const [correctedImage, setCorrectedImage] = useState<string | null>(null)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const testImageInputRef = useRef<HTMLInputElement>(null)

  // Initialize webcam when useWebcam is true
  useEffect(() => {
    let stream: MediaStream | null = null

    if (useWebcam && isCapturing) {
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
          setErrorMessage("Failed to access webcam. Please check permissions.")
        })
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [useWebcam, isCapturing])

  // Helper function to generate a unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15)
  }

  // Capture image from webcam
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

    // Convert to blob for API calls
    canvas.toBlob((blob) => {
      if (blob) {
        setImages((prev) => [
          ...prev,
          {
            id: generateId(),
            src: imageDataUrl,
            blob: blob,
            isValid: undefined,
            isApproved: false,
          },
        ])
      }
    }, "image/png")
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const newImage: ImageData = {
            id: generateId(),
            src: event.target.result as string,
            blob: file,
            isValid: undefined,
            isApproved: false,
          }
          setImages((prev) => [...prev, newImage])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // Handle test image upload
  const handleTestImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setTestImage({
          id: generateId(),
          src: event.target.result as string,
          blob: file,
        })

        // If we have calibration results, automatically undistort the image
        if (calibrationResult) {
          undistortImage(file)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // Remove image
  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  // Start capturing images
  const startCapturing = () => {
    setIsCapturing(true)
    setCurrentStep("collection")
  }

  // Verify corner detection for all images
  const verifyCornerDetection = async () => {
    if (images.length < 10) {
      setErrorMessage("Please capture or upload at least 10 images for calibration.")
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      // Create a FormData object to send to the backend
      const formData = new FormData()
      formData.append("boardWidth", boardWidth.toString())
      formData.append("boardHeight", boardHeight.toString())

      // Add all images to the form data
      images.forEach((image, index) => {
        if (image.blob) {
          formData.append("images", image.blob, `image_${index}.png`)
        }
      })

      // Call the Flask backend directly for corner detection
      console.log("Calling Flask backend directly for corner detection...")
      const response = await fetch("http://127.0.0.1:5000/api/detect-corners", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Direct backend error (${response.status}):`, errorText)
        throw new Error(`Corner detection failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Received data from Flask backend:", data)

      // Transform the response to match our frontend's expected format
      // The backend returns { valid: [true, false, ...] }
      const results = data.valid.map((isValid: boolean) => ({
        isValid,
        corners: [], // Backend doesn't return corner coordinates
      }))

      // Update images with verification results
      const updatedImages = images.map((image, index) => ({
        ...image,
        isValid: index < results.length ? results[index].isValid : false,
        corners: index < results.length ? results[index].corners : [],
      }))

      setImages(updatedImages)
      setCurrentStep("verification")

      // Check if we have enough valid images
      const validCount = updatedImages.filter((img) => img.isValid).length
      if (validCount < 10) {
        setErrorMessage(`Only ${validCount} valid images detected. Please capture more images (at least 10 required).`)
      }
    } catch (error) {
      console.error("Verification error:", error)
      setErrorMessage(`Failed to verify corner detection: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Toggle approval for a single image
  const toggleApproval = (id: string) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, isApproved: !img.isApproved } : img)))
  }

  // Approve all valid images
  const approveAllValid = () => {
    setImages((prev) => prev.map((img) => (img.isValid ? { ...img, isApproved: true } : img)))
  }

  // Calibrate camera
  const calibrate = async () => {
    const approvedImages = images.filter((img) => img.isApproved)

    if (approvedImages.length < 10) {
      setErrorMessage("Please approve at least 10 valid images for calibration.")
      return
    }

    setIsCalibrating(true)
    setErrorMessage(null)

    try {
      // Create a FormData object to send to the backend
      const formData = new FormData()
      formData.append("squareSize", squareSize.toString())
      formData.append("boardWidth", boardWidth.toString())
      formData.append("boardHeight", boardHeight.toString())
      formData.append("fixK3", fixK3.toString())

      // Add all approved images to the form data
      approvedImages.forEach((image, index) => {
        if (image.blob) {
          formData.append("images", image.blob, `image_${index}.png`)
        }
      })

      // Call the Flask backend directly for calibration
      console.log("Calling Flask backend directly for calibration...")
      const response = await fetch("http://127.0.0.1:5000/api/calibrate", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Calibration error (${response.status}):`, errorText)
        throw new Error(`Calibration failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Received calibration data:", data)

      // Extract calibration data from the response
      const calibrationResult = {
        intrinsicMatrix: data.calibrationData.intrinsics,
        distortionCoefficients: data.calibrationData.dist_coeffs[0],
        reprojectionError: data.reprojectionError,
        yml: new Blob(["Calibration data will be downloaded separately"], { type: "application/octet-stream" }),
      }

      setCalibrationResult(calibrationResult)
      setCurrentStep("analysis")
    } catch (error) {
      console.error("Calibration error:", error)
      setErrorMessage(`Calibration failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsCalibrating(false)
    }
  }

  // Recalibrate with updated distortion coefficients
  const recalibrate = async () => {
    if (!calibrationResult) return

    setIsCalibrating(true)
    setErrorMessage(null)

    try {
      // Create a FormData object to send to the backend
      const formData = new FormData()
      formData.append("squareSize", squareSize.toString())
      formData.append("boardWidth", boardWidth.toString())
      formData.append("boardHeight", boardHeight.toString())
      formData.append("fixK3", fixK3.toString())

      // Add all approved images to the form data
      const approvedImages = images.filter((img) => img.isApproved)
      approvedImages.forEach((image, index) => {
        if (image.blob) {
          formData.append("images", image.blob, `image_${index}.png`)
        }
      })

      console.log("Recalibrating with fixK3:", fixK3)

      // Call the Flask backend directly for recalibration
      const response = await fetch("http://127.0.0.1:5000/api/calibrate", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Recalibration error (${response.status}):`, errorText)
        throw new Error(`Recalibration failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Received recalibration data:", data)

      // Update calibration result with new values
      setCalibrationResult({
        intrinsicMatrix: data.calibrationData.intrinsics,
        distortionCoefficients: data.calibrationData.dist_coeffs[0],
        reprojectionError: data.reprojectionError,
        yml: new Blob(["Calibration data will be downloaded separately"], { type: "application/octet-stream" }),
      })

      // If we have a test image, update the undistorted version
      if (testImage?.blob) {
        undistortImage(testImage.blob)
      }
    } catch (error) {
      console.error("Recalibration error:", error)
      setErrorMessage(`Recalibration failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsCalibrating(false)
    }
  }

  // Undistort a test image using the calibration results
  const undistortImage = async (imageBlob: Blob) => {
    if (!calibrationResult) return

    setIsProcessing(true)

    try {
      // Create a FormData object to send to the backend
      const formData = new FormData()
      formData.append("image", imageBlob)

      // Call the Flask backend directly for undistortion
      console.log("Calling Flask backend directly for undistortion...")
      const response = await fetch("http://127.0.0.1:5000/api/undistort", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Undistortion error (${response.status}):`, errorText)
        throw new Error(`Undistortion failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const undistortedImageBase64 = data.undistortedImage

      // If we have a base64 image, convert it to a data URL
      if (undistortedImageBase64) {
        setCorrectedImage(`data:image/jpeg;base64,${undistortedImageBase64}`)
      } else {
        throw new Error("No undistorted image returned from the server")
      }
    } catch (error) {
      console.error("Undistortion error:", error)
      setErrorMessage(`Failed to undistort image: ${error instanceof Error ? error.message : String(error)}`)
      setCorrectedImage(null)
    } finally {
      setIsProcessing(false)
    }
  }

  // Download calibration file
  const downloadCalibration = () => {
    if (!calibrationResult) return

    // Call the Flask backend directly for the calibration file
    console.log("Downloading calibration file directly from Flask backend...")
    fetch("http://127.0.0.1:5000/api/calibration-file")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to download calibration file: ${response.status}`)
        }
        return response.blob()
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${outputFileName}.yml`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      })
      .catch((error) => {
        console.error("Download error:", error)
        setErrorMessage(
          `Failed to download calibration file: ${error instanceof Error ? error.message : String(error)}`,
        )
      })
  }

  // Calculate the number of valid and approved images
  const validImagesCount = images.filter((img) => img.isValid).length
  const approvedImagesCount = images.filter((img) => img.isApproved).length
  const totalImagesCount = images.length

  // Render the appropriate step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "config":
        return (
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

                {useWebcam && (
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
                )}

                <Button onClick={startCapturing} className="glass-button w-full py-6 mt-4">
                  {useWebcam ? (
                    <>
                      <Camera className="mr-2 h-5 w-5" />
                      Start Capturing with Webcam
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Upload Calibration Images
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )

      case "collection":
        return (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-purple-light">
                {useWebcam ? "Capture Calibration Images" : "Upload Calibration Images"}
              </CardTitle>
              <CardDescription>
                {useWebcam
                  ? `Capture at least 10 images of the chessboard from different angles (${images.length}/${imagesToCapture} captured)`
                  : `Upload at least 10 images of the chessboard from different angles (${images.length} uploaded)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {useWebcam ? (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black/40 rounded-lg overflow-hidden border border-purple/20 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                    <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline muted />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-purple-light">
                      {images.length} / {imagesToCapture} images captured
                    </span>
                    <Button onClick={captureImage} disabled={images.length >= imagesToCapture} className="glass-button">
                      <Camera className="mr-2 h-4 w-4" />
                      Capture Image
                    </Button>
                  </div>

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

              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-purple-light mb-2">Collected Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((image, index) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.src || "/placeholder.svg"}
                          alt={`Calibration image ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-md border border-purple/20"
                        />
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                onClick={() => setCurrentStep("config")}
                variant="outline"
                className="border-purple/30 text-purple-light"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Configuration
              </Button>

              <Button
                onClick={verifyCornerDetection}
                disabled={images.length < 10 || isProcessing}
                className={cn("glass-button", isProcessing && "opacity-80")}
              >
                {isProcessing ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify Corner Detection
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )

      case "verification":
        return (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-purple-light">Verify Chessboard Corner Detection</CardTitle>
              <CardDescription>Approve images where the chessboard corners are correctly detected</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between bg-secondary/50 p-3 rounded-lg border border-purple/20">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-purple-light">Valid: {validImagesCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-purple-light">Invalid: {totalImagesCount - validImagesCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple"></div>
                    <span className="text-sm text-purple-light">Approved: {approvedImagesCount}</span>
                  </div>
                </div>

                <Button
                  onClick={approveAllValid}
                  variant="outline"
                  className="border-purple/30 text-purple-light"
                  disabled={validImagesCount === 0}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve All Valid
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className={cn(
                      "relative group cursor-pointer rounded-md overflow-hidden border",
                      image.isValid
                        ? "border-green-500/50"
                        : image.isValid === false
                          ? "border-red-500/50"
                          : "border-purple/20",
                      image.isApproved && "ring-2 ring-purple",
                    )}
                    onClick={() => image.isValid && toggleApproval(image.id)}
                  >
                    <img
                      src={image.src || "/placeholder.svg"}
                      alt={`Calibration image ${index + 1}`}
                      className={cn("w-full aspect-square object-cover", !image.isValid && "opacity-50")}
                    />

                    {/* Status indicator */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {image.isValid === true && (
                        <div className="bg-green-500 text-white p-1 rounded-full">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      {image.isValid === false && (
                        <div className="bg-red-500 text-white p-1 rounded-full">
                          <X className="h-3 w-3" />
                        </div>
                      )}
                      {image.isApproved && (
                        <div className="bg-purple text-white p-1 rounded-full">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* Approval overlay */}
                    {image.isValid && (
                      <div
                        className={cn(
                          "absolute inset-0 bg-purple/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                          image.isApproved && "opacity-100 bg-purple/40",
                        )}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-background/50 backdrop-blur-sm border-white/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleApproval(image.id)
                          }}
                        >
                          {image.isApproved ? "Remove Approval" : "Approve Image"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                onClick={() => setCurrentStep("collection")}
                variant="outline"
                className="border-purple/30 text-purple-light"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Collection
              </Button>

              <Button
                onClick={calibrate}
                disabled={approvedImagesCount < 10 || isCalibrating}
                className={cn("glass-button", isCalibrating && "opacity-80")}
              >
                {isCalibrating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Calibrating...
                  </>
                ) : (
                  <>
                    Calibrate Camera
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )

      case "analysis":
        return (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-purple-light">Calibration Results & Analysis</CardTitle>
              <CardDescription>
                Review calibration results, test with new images, and adjust distortion coefficients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {calibrationResult && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-purple-light">Intrinsic Matrix</h3>
                      <div className="bg-secondary/50 p-3 rounded-lg border border-purple/20 font-mono text-sm">
                        {calibrationResult.intrinsicMatrix.map((row, i) => (
                          <div key={i} className="flex">
                            {row.map((val, j) => (
                              <div key={j} className="w-1/3 p-1">
                                {val.toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      <h3 className="text-lg font-medium text-purple-light">Distortion Coefficients</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-secondary/50 p-3 rounded-lg border border-purple/20">
                          <div>
                            <div className="font-medium text-purple-light mb-2">Distortion Coefficients</div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                              <div className="text-purple-light">
                                k1: {calibrationResult.distortionCoefficients[0].toFixed(4)}
                              </div>
                              <div className="text-purple-light">
                                k2: {calibrationResult.distortionCoefficients[1].toFixed(4)}
                              </div>
                              <div className="text-purple-light">
                                p1: {calibrationResult.distortionCoefficients[2].toFixed(4)}
                              </div>
                              <div className="text-purple-light">
                                p2: {calibrationResult.distortionCoefficients[3].toFixed(4)}
                              </div>
                              <div className="text-purple-light">
                                k3: {calibrationResult.distortionCoefficients[4].toFixed(4)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50 border border-purple/20">
                          <Checkbox
                            id="fixK3"
                            checked={fixK3}
                            onCheckedChange={(checked) => setFixK3(checked === true)}
                          />
                          <Label htmlFor="fixK3" className="text-purple-light">
                            Fix K3 at zero (recommended for most cameras)
                          </Label>
                        </div>

                        <div className="pt-2">
                          <Button onClick={recalibrate} className="glass-button w-full" disabled={isCalibrating}>
                            {isCalibrating ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                Recalibrating...
                              </>
                            ) : (
                              <>
                                <RotateCw className="mr-2 h-4 w-4" />
                                Recalibrate Camera
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-purple-light">Test Undistortion</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple/30 text-purple-light"
                          onClick={() => testImageInputRef.current?.click()}
                        >
                          <ImagePlus className="mr-2 h-4 w-4" />
                          Upload Test Image
                        </Button>
                        <input
                          ref={testImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleTestImageUpload}
                          className="hidden"
                        />
                      </div>

                      {testImage ? (
                        <div className="space-y-4">
                          <Tabs defaultValue="original" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="original">Original</TabsTrigger>
                              <TabsTrigger value="corrected">Corrected</TabsTrigger>
                            </TabsList>
                            <TabsContent value="original" className="mt-2">
                              <div className="aspect-video bg-black/40 rounded-lg overflow-hidden border border-purple/20">
                                <img
                                  src={testImage.src || "/placeholder.svg"}
                                  alt="Original test image"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </TabsContent>
                            <TabsContent value="corrected" className="mt-2">
                              <div className="aspect-video bg-black/40 rounded-lg overflow-hidden border border-purple/20">
                                {correctedImage ? (
                                  <img
                                    src={correctedImage || "/placeholder.svg"}
                                    alt="Corrected test image"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-purple-light/60">
                                    {isProcessing ? (
                                      <div className="flex flex-col items-center">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mb-2"></div>
                                        <span>Processing image...</span>
                                      </div>
                                    ) : (
                                      <span>No corrected image available</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      ) : (
                        <div className="aspect-video bg-black/40 rounded-lg overflow-hidden border border-purple/20 flex items-center justify-center text-purple-light/60">
                          <div className="text-center">
                            <ImagePlus className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <span>Upload a test image to see undistortion results</span>
                          </div>
                        </div>
                      )}

                      <div className="bg-secondary/50 p-3 rounded-lg border border-purple/20">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-purple-light">Reprojection Error</h4>
                          <span className="text-sm text-purple-light/80">Lower is better</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={Math.min(100, calibrationResult.reprojectionError * 100)}
                              className="h-2"
                            />
                            <span className="text-purple-light font-mono w-16 text-right">
                              {calibrationResult.reprojectionError.toFixed(3)}
                            </span>
                          </div>
                          <p className="text-xs text-purple-light/80">
                            A reprojection error below 0.5 pixels is generally considered good for most applications.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                onClick={() => setCurrentStep("verification")}
                variant="outline"
                className="border-purple/30 text-purple-light"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Verification
              </Button>

              <Button onClick={downloadCalibration} className="glass-button" disabled={!calibrationResult}>
                <Download className="mr-2 h-4 w-4" />
                Download Calibration File
              </Button>
            </CardFooter>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-3 text-white">Camera Calibration Tool</h1>
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

        {/* Workflow Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center max-w-3xl w-full">
            {["config", "collection", "verification", "calibration", "analysis"].map((step, index) => (
              <React.Fragment key={step}>
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2",
                    currentStep === step
                      ? "bg-purple border-purple text-white"
                      : index < ["config", "collection", "verification", "calibration", "analysis"].indexOf(currentStep)
                        ? "bg-purple/20 border-purple/50 text-purple-light"
                        : "bg-secondary/50 border-purple/20 text-purple-light/50",
                  )}
                >
                  {index + 1}
                </div>
                {index < 4 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5",
                      index < ["config", "collection", "verification", "calibration"].indexOf(currentStep)
                        ? "bg-purple/50"
                        : "bg-purple/20",
                    )}
                  ></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {renderStepContent()}

      {errorMessage && (
        <div className="mt-4 p-4 rounded-md text-center backdrop-blur-md border bg-red-500/20 text-red-300 border-red-500/30">
          {errorMessage}
        </div>
      )}
    </div>
  )
}

export default CameraCalibration

