"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/lib/components/ui/button"
import { Camera, RefreshCw, X, Check, Image as ImageIcon } from "lucide-react"

export interface FilterPreset {
  id: string
  name: string
  cssFilter: string
}

export const PRESET_FILTERS: FilterPreset[] = [
  { id: "normal", name: "Normal", cssFilter: "none" },
  { id: "golden_hour", name: "Golden Hour", cssFilter: "sepia(0.4) saturate(1.4) brightness(1.1) hue-rotate(-15deg) contrast(1.1)" },
  { id: "vintage", name: "Vintage", cssFilter: "sepia(0.6) contrast(1.1) brightness(0.9) saturate(0.8)" },
  { id: "bw", name: "B&W", cssFilter: "grayscale(1) contrast(1.2)" },
  { id: "cinematic", name: "Cinematic", cssFilter: "contrast(1.2) saturate(1.2) brightness(0.9) sepia(0.2) hue-rotate(-10deg)" },
  { id: "vivid", name: "Vivid", cssFilter: "saturate(1.5) contrast(1.1)" },
  { id: "cyberpunk", name: "Cyberpunk", cssFilter: "saturate(1.8) hue-rotate(90deg) contrast(1.2)" },
  { id: "dreamy", name: "Dreamy", cssFilter: "brightness(1.1) contrast(0.9) saturate(1.2) blur(0.5px)" },
]

interface CameraCaptureProps {
  allowedFilters?: string[] // array of filter IDs allowed by host
  onCapture: (file: File) => void
  onClose: () => void
}

export function CameraCapture({ allowedFilters, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [activeFilterId, setActiveFilterId] = useState<string>("normal")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  
  const availableFilters = allowedFilters && allowedFilters.length > 0
    ? PRESET_FILTERS.filter(f => allowedFilters.includes(f.id) || f.id === "normal")
    : PRESET_FILTERS

  const activeFilter = availableFilters.find(f => f.id === activeFilterId) || availableFilters[0]

  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      })
      setStream(newStream)
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      alert("Could not access camera. Please check permissions.")
    }
  }, [facingMode])

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user")
  }

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Set canvas dimensions to match video source
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Apply the active CSS filter to the canvas context
    ctx.filter = activeFilter.cssFilter
    
    // If front camera, we might want to mirror it, but usually native video handles it via CSS.
    // If we want the saved image to be mirrored for 'user' facing mode:
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Get image data
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
    setCapturedImage(dataUrl)
    
    // Convert to File
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `snap_${Date.now()}.jpg`, { type: "image/jpeg" })
        setCapturedFile(file)
      }
    }, "image/jpeg", 0.92)
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setCapturedFile(null)
  }

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile)
      // Clean up stream before closing
      if (stream) stream.getTracks().forEach(track => track.stop())
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col sm:p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 z-10 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close camera" className="text-white hover:bg-white/20 rounded-full">
          <X className="h-6 w-6" />
        </Button>
        <div className="flex gap-4">
          {!capturedImage && (
            <Button variant="ghost" size="icon" onClick={toggleCamera} aria-label="Flip camera" className="text-white hover:bg-white/20 rounded-full">
              <RefreshCw className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Viewfinder */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black sm:rounded-2xl sm:border border-white/10">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover transition-all duration-300 ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            style={{ filter: activeFilter.cssFilter }}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="h-48 bg-black shrink-0 flex flex-col justify-center pb-8 pt-4">
        {!capturedImage ? (
          <>
            {/* Filter Carousel */}
            <div className="flex overflow-x-auto px-4 pb-4 gap-3 no-scrollbar snap-x">
              {availableFilters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilterId(filter.id)}
                  className={`flex flex-col items-center gap-1 shrink-0 snap-center transition-all ${activeFilterId === filter.id ? "scale-110" : "opacity-60 scale-90"}`}
                >
                  <div 
                    className={`w-14 h-14 rounded-full border-2 overflow-hidden bg-slate-800 ${activeFilterId === filter.id ? "border-orange-500" : "border-white/20"}`}
                  >
                    <div 
                      className="w-full h-full bg-[url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=200&h=200&fit=crop')] bg-cover bg-center"
                      style={{ filter: filter.cssFilter }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-white">{filter.name}</span>
                </button>
              ))}
            </div>

            {/* Shutter Button */}
            <div className="flex justify-center">
              <button
                onClick={takePhoto}
                aria-label="Take photo"
                className="w-16 h-16 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:scale-95 transition-transform"
              >
                <div className="w-full h-full bg-white rounded-full" />
              </button>
            </div>
          </>
        ) : (
          /* Confirm / Retake Controls */
          <div className="flex items-center justify-center gap-12">
            <Button variant="ghost" onClick={handleRetake} className="text-white flex flex-col items-center gap-1 h-auto py-2 hover:bg-white/10">
              <RefreshCw className="h-6 w-6" />
              <span className="text-xs">Retake</span>
            </Button>
            <Button onClick={handleConfirm} className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-16 h-16 shadow-lg shadow-orange-500/20">
              <Check className="h-8 w-8" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
