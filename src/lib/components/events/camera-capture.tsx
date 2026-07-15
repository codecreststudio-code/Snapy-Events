"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/lib/components/ui/button"
import { Camera, RefreshCw, X, Check, Video, Square, Play, Pause, Zap, ZapOff, Grid3x3, ZoomIn } from "lucide-react"

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
  allowVideo?: boolean
  maxVideoDuration?: number // limit in seconds (e.g. 10, 20, 30)
  onCapture: (file: File) => void
  onClose: () => void
}

export function CameraCapture({
  allowedFilters,
  allowVideo = false,
  maxVideoDuration = 30,
  onCapture,
  onClose,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [activeFilterId, setActiveFilterId] = useState<string>("normal")
  const [captureMode, setCaptureMode] = useState<"photo" | "video">("photo")

  // Enhanced camera controls
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [zoomSupported, setZoomSupported] = useState(false)
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number }>({ min: 1, max: 1, step: 0.1 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showGrid, setShowGrid] = useState(false)

  // Photo state
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  // Video recording state
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [videoRecordingTime, setVideoRecordingTime] = useState(0)
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  const [capturedFile, setCapturedFile] = useState<File | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null)

  const availableFilters = allowedFilters && allowedFilters.length > 0
    ? PRESET_FILTERS.filter(f => allowedFilters.includes(f.id) || f.id === "normal")
    : PRESET_FILTERS

  const activeFilter = availableFilters.find(f => f.id === activeFilterId) || availableFilters[0]

  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: allowVideo, // request audio if video mode is enabled
      }
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        // Critical: the live viewfinder must never be audible. When allowVideo
        // is true the stream also carries a live mic track — an unmuted
        // <video> would play that mic audio back out of the speakers in real
        // time, which the (still-recording) mic then picks up again, causing
        // the echo/feedback loop guests reported while recording video.
        videoRef.current.muted = true
      }

      // Reset/detect enhanced controls (torch + zoom) for the new track
      const [videoTrack] = newStream.getVideoTracks()
      const capabilities = (videoTrack?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number; step: number } }) | undefined)
      setTorchOn(false)
      if (capabilities?.torch) {
        setTorchSupported(true)
      } else {
        setTorchSupported(false)
      }
      if (capabilities?.zoom) {
        setZoomSupported(true)
        setZoomRange({ min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step || 0.1 })
        setZoomLevel(capabilities.zoom.min)
      } else {
        setZoomSupported(false)
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      alert("Could not access camera. Please check permissions.")
    }
  }, [facingMode, allowVideo])

  const toggleTorch = async () => {
    if (!stream) return
    const [videoTrack] = stream.getVideoTracks()
    if (!videoTrack) return
    try {
      const next = !torchOn
      await videoTrack.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch (err) {
      console.error("Failed to toggle flashlight:", err)
    }
  }

  const handleZoomChange = async (value: number) => {
    setZoomLevel(value)
    if (!stream) return
    const [videoTrack] = stream.getVideoTracks()
    if (!videoTrack) return
    try {
      await videoTrack.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] })
    } catch (err) {
      console.error("Failed to apply zoom:", err)
    }
  }

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop())
      if (videoTimerRef.current) clearInterval(videoTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user")
  }

  // --- PHOTO CAPTURE ---
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    ctx.filter = activeFilter.cssFilter
    
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
    setCapturedImage(dataUrl)
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `snap_${Date.now()}.jpg`, { type: "image/jpeg" })
        setCapturedFile(file)
      }
    }, "image/jpeg", 0.92)
  }

  // --- VIDEO RECORDING ---
  const startVideoRecording = () => {
    if (!stream) return
    recordedChunksRef.current = []

    let mimeType = "video/webm"
    if (!MediaRecorder.isTypeSupported("video/webm")) {
      if (MediaRecorder.isTypeSupported("video/mp4")) mimeType = "video/mp4"
      else mimeType = ""
    }

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType || "video/webm" })
      const ext = blob.type.includes("mp4") ? "mp4" : "webm"
      const file = new File([blob], `video_${Date.now()}.${ext}`, { type: blob.type || "video/webm" })
      
      setRecordedVideoBlob(blob)
      setRecordedVideoUrl(URL.createObjectURL(blob))
      setCapturedFile(file)
    }

    recorder.start(250)
    setIsRecordingVideo(true)
    setVideoRecordingTime(0)

    videoTimerRef.current = setInterval(() => {
      setVideoRecordingTime((prev) => {
        if (prev + 1 >= maxVideoDuration) {
          stopVideoRecording()
          return maxVideoDuration
        }
        return prev + 1
      })
    }, 1000)
  }

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current)
      videoTimerRef.current = null
    }
    setIsRecordingVideo(false)
  }

  const handleRetake = () => {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl)
    setCapturedImage(null)
    setRecordedVideoBlob(null)
    setRecordedVideoUrl(null)
    setCapturedFile(null)
    setVideoRecordingTime(0)
    setIsVideoPlaying(false)
  }

  const toggleVideoPlayback = () => {
    if (!previewVideoRef.current) return
    if (isVideoPlaying) {
      previewVideoRef.current.pause()
      setIsVideoPlaying(false)
    } else {
      previewVideoRef.current.play()
      setIsVideoPlaying(true)
    }
  }

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile)
      if (stream) stream.getTracks().forEach(track => track.stop())
      onClose()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const hasPreview = Boolean(capturedImage || recordedVideoUrl)

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col sm:p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 z-10 bg-gradient-to-b from-black/70 to-transparent absolute top-0 left-0 right-0">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close camera" className="text-white hover:bg-white/20 rounded-full">
          <X className="h-6 w-6" />
        </Button>

        {/* Mode Switcher Tabs */}
        {allowVideo && !hasPreview && !isRecordingVideo && (
          <div className="flex items-center bg-black/60 border border-white/20 rounded-full p-1 backdrop-blur-md">
            <button
              onClick={() => setCaptureMode("photo")}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                captureMode === "photo" ? "bg-white text-black shadow-md" : "text-white/70 hover:text-white"
              }`}
            >
              Photo
            </button>
            <button
              onClick={() => setCaptureMode("video")}
              className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                captureMode === "video" ? "bg-red-600 text-white shadow-md" : "text-white/70 hover:text-white"
              }`}
            >
              Video
            </button>
          </div>
        )}

        {/* Live Timer indicator when recording video */}
        {isRecordingVideo && (
          <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-mono font-bold animate-pulse">
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>{formatTime(videoRecordingTime)} / {formatTime(maxVideoDuration)}</span>
          </div>
        )}

        <div className="flex gap-2">
          {!hasPreview && (
            <button
              onClick={() => setShowGrid((g) => !g)}
              aria-label="Toggle grid"
              aria-pressed={showGrid}
              className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors ${showGrid ? "bg-white/30 text-white" : "text-white hover:bg-white/20"}`}
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
          )}
          {!hasPreview && torchSupported && (
            <button
              onClick={toggleTorch}
              aria-label="Toggle flashlight"
              aria-pressed={torchOn}
              className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors ${torchOn ? "bg-yellow-400/90 text-black" : "text-white hover:bg-white/20"}`}
            >
              {torchOn ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
            </button>
          )}
          {!hasPreview && !isRecordingVideo && (
            <Button variant="ghost" size="icon" onClick={toggleCamera} aria-label="Flip camera" className="text-white hover:bg-white/20 rounded-full">
              <RefreshCw className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Viewfinder */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black sm:rounded-2xl sm:border border-white/10">
        {!hasPreview && showGrid && (
          <div className="pointer-events-none absolute inset-0 z-[5] grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/25" />
            ))}
          </div>
        )}
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        ) : recordedVideoUrl ? (
          <div className="relative w-full h-full">
            <video
              ref={previewVideoRef}
              src={recordedVideoUrl}
              playsInline
              onEnded={() => setIsVideoPlaying(false)}
              className="w-full h-full object-cover"
            />
            <button
              onClick={toggleVideoPlayback}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white">
                {isVideoPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
              </div>
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-all duration-300 ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            style={{ filter: activeFilter.cssFilter }}
          />
        )}
        {!hasPreview && zoomSupported && zoomRange.max > zoomRange.min && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 w-56 max-w-[80%]">
            <ZoomIn className="h-4 w-4 text-white shrink-0" />
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={zoomLevel}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              aria-label="Camera zoom"
              className="w-full accent-orange-500"
            />
            <span className="text-[10px] font-mono text-white/80 w-8 text-right shrink-0">{zoomLevel.toFixed(1)}x</span>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="h-48 bg-black shrink-0 flex flex-col justify-center pb-8 pt-4">
        {!hasPreview ? (
          <>
            {/* Filter Carousel */}
            {!isRecordingVideo && (
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
            )}

            {/* Shutter / Record Button */}
            <div className="flex justify-center">
              {captureMode === "photo" ? (
                <button
                  onClick={takePhoto}
                  aria-label="Take photo"
                  className="w-16 h-16 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:scale-95 transition-transform cursor-pointer"
                >
                  <div className="w-full h-full bg-white rounded-full" />
                </button>
              ) : (
                !isRecordingVideo ? (
                  <button
                    onClick={startVideoRecording}
                    aria-label="Start video recording"
                    className="w-16 h-16 rounded-full border-4 border-red-500/80 p-1 flex items-center justify-center hover:scale-95 transition-transform cursor-pointer"
                  >
                    <div className="w-full h-full bg-red-600 rounded-full" />
                  </button>
                ) : (
                  <button
                    onClick={stopVideoRecording}
                    aria-label="Stop video recording"
                    className="w-16 h-16 rounded-full border-4 border-red-500/80 p-1 flex items-center justify-center hover:scale-95 transition-transform cursor-pointer"
                  >
                    <Square className="h-6 w-6 fill-red-600 text-red-600" />
                  </button>
                )
              )}
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
