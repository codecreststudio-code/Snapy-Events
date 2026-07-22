"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/lib/components/ui/button"
import { Camera, RefreshCw, X, Check, Video, Square, Play, Pause, Zap, ZapOff, Grid3x3, ZoomIn, AlertTriangle } from "lucide-react"
import { spring, duration, easing, fadeInDown, tapScaleSubtle } from "@/lib/motion/tokens"
import { useReducedMotion } from "@/lib/motion/use-reduced-motion"

// Motion-wrapped shadcn Button for the few spots (flip camera) that need
// whileTap press feedback but otherwise keep the shared Button's styling.
const MotionButton = motion(Button)

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

// How long a freshly-captured photo sits in "queued" state (showing an Undo
// affordance) before the background upload actually kicks off. Keeps the
// once.film-style "shoot and go" feel while still giving guests a brief,
// non-blocking window to undo a mis-fire shot instead of forcing a
// stop-and-confirm screen on every single capture.
const UNDO_WINDOW_MS = 1200

interface PendingUpload {
  id: string
  file: File
  status: "queued" | "uploading" | "error"
}

interface CameraCaptureProps {
  allowedFilters?: string[] // array of filter IDs allowed by host
  allowVideo?: boolean
  maxVideoDuration?: number // limit in seconds (e.g. 10, 20, 30)
  // Starting point for the glanceable shot counter (e.g. photos this guest
  // has already uploaded for the event), and the event's hard shot limit if
  // one exists. Sourced by the host page from the same quota info that used
  // to power the "Uploaded X of Y" banner.
  initialShotsUsed?: number
  maxShots?: number | null
  // Called immediately after a photo is captured (or a video is confirmed).
  // May return a Promise — if it rejects, the capture's pill shows an error
  // state with a retry affordance instead of a blocking alert. `captureId`
  // lets the host page update the same tracking record on retry rather than
  // creating a duplicate.
  onCapture: (file: File, captureId?: string) => void | Promise<void>
  onClose: () => void
}

export function CameraCapture({
  allowedFilters,
  allowVideo = false,
  maxVideoDuration = 30,
  initialShotsUsed = 0,
  maxShots = null,
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

  // Shutter-flash feedback (replaces the old blocking Retake/Confirm screen
  // for photos — the camera stays live, this is just a quick visual tick).
  const [flash, setFlash] = useState(false)

  // Glanceable, always-visible shot counter + its increment animation.
  const [shotCount, setShotCount] = useState(initialShotsUsed)
  const [counterPulse, setCounterPulse] = useState(false)
  const isFirstShotRender = useRef(true)

  // In-flight / queued / failed captures, shown as small non-blocking pills.
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
  const pendingUploadsRef = useRef<PendingUpload[]>([])
  const undoTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

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

  // WCAG 2.3.3 — every animation added below is skipped/shortened when this
  // is true (falls back to instant CSS-driven state changes, same as before
  // this pass), never blocked entirely since none of it is essential motion.
  const prefersReducedMotion = useReducedMotion()

  const availableFilters = allowedFilters && allowedFilters.length > 0
    ? PRESET_FILTERS.filter(f => allowedFilters.includes(f.id) || f.id === "normal")
    : PRESET_FILTERS

  const activeFilter = availableFilters.find(f => f.id === activeFilterId) || availableFilters[0]

  useEffect(() => {
    pendingUploadsRef.current = pendingUploads
  }, [pendingUploads])

  // Kept in sync every render so the mount-only unmount-cleanup effect below
  // (and flushQueuedUploads, which never changes identity) can always reach
  // the *current* beginUpload without needing beginUpload itself in a
  // dependency array that would re-run the mount/unmount effect.
  const beginUploadRef = useRef<(id: string, file: File) => void>(() => {})

  // Pulse the counter every time it changes (but not on first mount).
  useEffect(() => {
    if (isFirstShotRender.current) {
      isFirstShotRender.current = false
      return
    }
    setCounterPulse(true)
    const t = setTimeout(() => setCounterPulse(false), 320)
    return () => clearTimeout(t)
  }, [shotCount])

  // Data-loss guard: a capture sits in "queued" state for UNDO_WINDOW_MS
  // before its upload timer fires. If the guest closes the camera (X button,
  // or any other unmount) inside that window, we must NOT just clear the
  // timer — that would silently drop a photo the shot counter already told
  // the guest was captured. Instead, immediately kick off the upload for
  // every still-queued item (bypassing the timer) so the shot is either
  // uploaded or explicitly undone by the user — never lost.
  //
  // Effects can't await, so this fires the upload and moves on; that's fine
  // because beginUpload's real job (starting the onCapture()/network call)
  // happens synchronously the moment it's invoked — it doesn't need the
  // component to stay mounted to complete. Any resulting pill/error state
  // updates after unmount are harmless no-ops since there's no UI left to
  // show them.
  useEffect(() => {
    return () => {
      pendingUploadsRef.current.forEach((p) => {
        if (p.status !== "queued") return
        const timer = undoTimersRef.current[p.id]
        if (timer) {
          clearTimeout(timer)
          delete undoTimersRef.current[p.id]
        }
        beginUploadRef.current(p.id, p.file)
      })
      Object.values(undoTimersRef.current).forEach(clearTimeout)
    }
  }, [])

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

  // --- BACKGROUND UPLOAD PIPELINE (pills, undo, retry) ---
  const beginUpload = useCallback((id: string, file: File) => {
    setPendingUploads((prev) => prev.map((p) => (p.id === id ? { ...p, status: "uploading" } : p)))
    Promise.resolve(onCapture(file, id))
      .then(() => {
        setPendingUploads((prev) => prev.filter((p) => p.id !== id))
      })
      .catch((err) => {
        console.error("Background upload failed:", err)
        setPendingUploads((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error" } : p)))
      })
  }, [onCapture])

  useEffect(() => {
    beginUploadRef.current = beginUpload
  }, [beginUpload])

  // Primary data-loss guard: flush any still-queued (undo-window) captures to
  // upload the instant the guest initiates the close action, before the
  // camera actually closes/unmounts. This is more reliable than relying on
  // the unmount-cleanup effect alone (kept below as a safety net for any
  // other unmount path), since it runs first and doesn't depend on effect
  // teardown ordering.
  const flushQueuedUploads = useCallback(() => {
    pendingUploadsRef.current.forEach((p) => {
      if (p.status !== "queued") return
      const timer = undoTimersRef.current[p.id]
      if (timer) {
        clearTimeout(timer)
        delete undoTimersRef.current[p.id]
      }
      beginUpload(p.id, p.file)
    })
  }, [beginUpload])

  const handleClose = useCallback(() => {
    flushQueuedUploads()
    onClose()
  }, [flushQueuedUploads, onClose])

  const registerCapture = useCallback((file: File) => {
    const captureId = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setShotCount((c) => c + 1)
    setPendingUploads((prev) => [...prev, { id: captureId, file, status: "queued" }])

    const timer = setTimeout(() => {
      delete undoTimersRef.current[captureId]
      beginUpload(captureId, file)
    }, UNDO_WINDOW_MS)
    undoTimersRef.current[captureId] = timer
  }, [beginUpload])

  const undoCapture = useCallback((id: string) => {
    const timer = undoTimersRef.current[id]
    if (timer) {
      clearTimeout(timer)
      delete undoTimersRef.current[id]
    }
    setPendingUploads((prev) => prev.filter((p) => p.id !== id))
    setShotCount((c) => Math.max(0, c - 1))
  }, [])

  const retryUpload = useCallback((id: string) => {
    const item = pendingUploadsRef.current.find((p) => p.id === id)
    if (!item) return
    beginUpload(id, item.file)
  }, [beginUpload])

  const dismissUpload = useCallback((id: string) => {
    const timer = undoTimersRef.current[id]
    if (timer) {
      clearTimeout(timer)
      delete undoTimersRef.current[id]
    }
    setPendingUploads((prev) => prev.filter((p) => p.id !== id))
  }, [])

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

    // Quick shutter-flash so the guest gets confirmation the shot landed —
    // the viewfinder itself never pauses, unlike the old full-screen review.
    setFlash(true)
    setTimeout(() => setFlash(false), 150)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `snap_${Date.now()}.jpg`, { type: "image/jpeg" })
      registerCapture(file)
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

  // Video keeps its explicit Confirm tap (a recorded clip is a deliberate,
  // reviewable artifact, not a rapid-fire shot) — but that tap now triggers
  // the same immediate background upload as photos, instead of only queueing
  // the clip for a later manual "Upload Files" batch click.
  const handleConfirm = () => {
    if (capturedFile) {
      // Route the confirmed video through the same pending-uploads/beginUpload
      // pipeline photos use, instead of a bare `void onCapture(...)`. That bare
      // call had no .catch, so a failed video upload produced an unhandled
      // promise rejection and zero feedback to the guest — beginUpload attaches
      // error handling and (were the camera to stay open) would surface the
      // same retry pill photos get.
      const captureId = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      setShotCount((c) => c + 1)
      setPendingUploads((prev) => [...prev, { id: captureId, file: capturedFile, status: "queued" }])
      beginUpload(captureId, capturedFile)
      if (stream) stream.getTracks().forEach(track => track.stop())
      onClose()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const hasPreview = Boolean(recordedVideoUrl)

  const queuedUploads = pendingUploads.filter((p) => p.status === "queued")
  const uploadingCount = pendingUploads.filter((p) => p.status === "uploading").length
  const erroredUploads = pendingUploads.filter((p) => p.status === "error")

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B0908] flex flex-col sm:p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] z-10 bg-gradient-to-b from-black/70 to-transparent absolute top-0 left-0 right-0">
        <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close camera" className="text-white hover:bg-white/20 rounded-full">
          <X className="h-6 w-6" />
        </Button>

        {/* Mode Switcher Tabs */}
        {allowVideo && !hasPreview && !isRecordingVideo && (
          <div className="relative flex items-center bg-black/60 border border-[#3D332A] rounded-full p-1 backdrop-blur-md">
            <button
              onClick={() => setCaptureMode("photo")}
              className={`relative z-10 px-4 py-1 rounded-full text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none ${
                captureMode === "photo" ? "text-black" : "text-white/70 hover:text-white"
              }`}
            >
              {/* Shared-element pill: same layoutId on both tabs means Framer
                  Motion slides/resizes this background between them instead
                  of an instant color swap — only one of the two ever mounts
                  at a time, which is what lets the layout animation read as a
                  single pill "traveling" rather than two pills cross-fading. */}
              {captureMode === "photo" && (
                <motion.div
                  layoutId="camera-mode-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-[#B28DAE] shadow-md"
                  transition={prefersReducedMotion ? { duration: 0 } : spring.snappy}
                />
              )}
              Photo
            </button>
            <button
              onClick={() => setCaptureMode("video")}
              className={`relative z-10 px-4 py-1 rounded-full text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none ${
                captureMode === "video" ? "text-white" : "text-white/70 hover:text-white"
              }`}
            >
              {captureMode === "video" && (
                <motion.div
                  layoutId="camera-mode-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-red-600 shadow-md"
                  transition={prefersReducedMotion ? { duration: 0 } : spring.snappy}
                />
              )}
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
            <motion.button
              onClick={() => setShowGrid((g) => !g)}
              aria-label="Toggle grid"
              aria-pressed={showGrid}
              whileTap={prefersReducedMotion ? undefined : tapScaleSubtle}
              className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none ${showGrid ? "bg-[#B28DAE]/30 text-[#B28DAE]" : "text-white hover:bg-white/20"}`}
            >
              <Grid3x3 className="h-5 w-5" />
            </motion.button>
          )}
          {!hasPreview && torchSupported && (
            <motion.button
              onClick={toggleTorch}
              aria-label="Toggle flashlight"
              aria-pressed={torchOn}
              whileTap={prefersReducedMotion ? undefined : tapScaleSubtle}
              className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none ${torchOn ? "bg-[#B28DAE]/90 text-black" : "text-white hover:bg-white/20"}`}
            >
              {torchOn ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
            </motion.button>
          )}
          {!hasPreview && !isRecordingVideo && (
            <MotionButton
              variant="ghost"
              size="icon"
              onClick={toggleCamera}
              aria-label="Flip camera"
              whileTap={prefersReducedMotion ? undefined : tapScaleSubtle}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <RefreshCw className="h-6 w-6" />
            </MotionButton>
          )}
        </div>
      </div>

      {/* Main Viewfinder */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black sm:rounded-2xl sm:border border-[#3D332A]">
        {!hasPreview && showGrid && (
          <div className="pointer-events-none absolute inset-0 z-[5] grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/25" />
            ))}
          </div>
        )}
        {recordedVideoUrl ? (
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
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none"
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

        {/* Shutter-flash feedback overlay (photo capture) */}
        <div
          className={`pointer-events-none absolute inset-0 z-30 bg-white transition-opacity duration-150 ${flash ? "opacity-70" : "opacity-0"}`}
        />

        {/* Non-blocking upload status pills: queued/undo, aggregate uploading count, and per-item errors.
            Each list gets its own AnimatePresence so pills slide/fade in and
            (on removal — undo, upload finishing, dismiss) fade+shrink out
            instead of just vanishing via conditional render. Reduced-motion
            guests get an instant appear/disappear (initial=false, no exit)
            since the pill's *information* is essential but its entrance
            choreography is not. */}
        {!hasPreview && (queuedUploads.length > 0 || uploadingCount > 0 || erroredUploads.length > 0) && (
          <div className="absolute top-20 inset-x-0 z-20 flex flex-col items-center gap-1.5 px-4 pointer-events-none">
            <AnimatePresence initial={false}>
              {queuedUploads.map((p) => (
                <motion.div
                  key={p.id}
                  initial={prefersReducedMotion ? false : "hidden"}
                  animate="visible"
                  exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9, transition: { duration: duration.fast, ease: easing.easeOut } }}
                  variants={fadeInDown}
                  className="pointer-events-auto flex items-center gap-2 bg-black/70 border border-[#3D332A] backdrop-blur-md rounded-full pl-3 pr-1.5 py-1 text-xs font-medium text-white shadow-lg"
                >
                  <span>Shot captured</span>
                  <button
                    onClick={() => undoCapture(p.id)}
                    className="rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-bold text-[#B28DAE] transition-colors focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none"
                  >
                    Undo
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {uploadingCount > 0 && (
                <motion.div
                  key="uploading"
                  initial={prefersReducedMotion ? false : "hidden"}
                  animate="visible"
                  exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9, transition: { duration: duration.fast, ease: easing.easeOut } }}
                  variants={fadeInDown}
                  className="pointer-events-auto flex items-center gap-2 bg-black/60 border border-[#3D332A] backdrop-blur-md rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-lg"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B28DAE] animate-pulse" />
                  {uploadingCount === 1 ? "Uploading…" : `${uploadingCount} uploading…`}
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {erroredUploads.map((p) => (
                <motion.div
                  key={p.id}
                  initial={prefersReducedMotion ? false : "hidden"}
                  animate="visible"
                  exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9, transition: { duration: duration.fast, ease: easing.easeOut } }}
                  variants={fadeInDown}
                  className="pointer-events-auto flex items-center gap-2 bg-red-950/80 border border-red-500/40 backdrop-blur-md rounded-full pl-3 pr-1.5 py-1 text-xs font-medium text-red-100 shadow-lg"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Upload failed</span>
                  <button
                    onClick={() => retryUpload(p.id)}
                    className="rounded-full bg-red-500/30 hover:bg-red-500/50 px-2.5 py-1 text-[11px] font-bold text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => dismissUpload(p.id)}
                    aria-label="Dismiss upload error"
                    className="rounded-full p-1 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!hasPreview && zoomSupported && zoomRange.max > zoomRange.min && (
          // The `-50%` x offset (replacing the old `-translate-x-1/2` CSS
          // class) is expressed as a Framer Motion style value rather than a
          // Tailwind transform utility — once this element animates via
          // Framer Motion, it owns the `transform` CSS property outright, so
          // centering has to be expressed the same way `y` is, instead of
          // fighting a CSS class over the same property.
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: duration.slow, ease: easing.easeOut }}
            style={{ x: "-50%" }}
            className="absolute bottom-3 left-1/2 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 w-56 max-w-[80%]"
          >
            <ZoomIn className="h-4 w-4 text-white shrink-0" />
            <input
              type="range"
              min={zoomRange.min}
              max={zoomRange.max}
              step={zoomRange.step}
              value={zoomLevel}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              aria-label="Camera zoom"
              className="w-full accent-[#B28DAE]"
            />
            <span className="text-[10px] font-mono text-white/80 w-8 text-right shrink-0">{zoomLevel.toFixed(1)}x</span>
          </motion.div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="h-48 bg-[#141110] shrink-0 flex flex-col justify-center pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
        {!hasPreview ? (
          <>
            {/* Filter Carousel */}
            {!isRecordingVideo && (
              <div className="flex overflow-x-auto px-4 pb-4 gap-3 no-scrollbar snap-x">
                {availableFilters.map(filter => (
                  // Selected/unselected scale used to be the Tailwind
                  // `scale-110`/`scale-90` utilities; now that this button
                  // also needs a Framer Motion `whileTap`, the scale is moved
                  // entirely onto `animate` so only one system (Framer
                  // Motion) ever writes the `transform` property here —
                  // mixing a CSS transform class with a motion-controlled
                  // transform on the same element causes one to silently
                  // clobber the other. Opacity stays a plain CSS class since
                  // it doesn't touch transform.
                  <motion.button
                    key={filter.id}
                    onClick={() => setActiveFilterId(filter.id)}
                    animate={{ scale: activeFilterId === filter.id ? 1.1 : 0.9 }}
                    transition={prefersReducedMotion ? { duration: 0 } : spring.soft}
                    whileTap={prefersReducedMotion ? undefined : tapScaleSubtle}
                    className={`flex flex-col items-center gap-1 shrink-0 snap-center rounded-full focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none ${activeFilterId === filter.id ? "" : "opacity-60"}`}
                  >
                    <div
                      className={`w-14 h-14 rounded-full border-2 overflow-hidden bg-slate-800 ${activeFilterId === filter.id ? "border-[#B28DAE]" : "border-white/20"}`}
                    >
                      <div
                        className="w-full h-full bg-[url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=200&h=200&fit=crop')] bg-cover bg-center"
                        style={{ filter: filter.cssFilter }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-white">{filter.name}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Shutter / Record Button + glanceable shot counter */}
            <div className="flex items-center justify-center gap-8">
              <div className="w-14 flex flex-col items-center justify-center">
                {captureMode === "photo" && (
                  <div className="flex flex-col items-center gap-0.5 rounded-full bg-black/40 border border-[#3D332A] px-3 py-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">Shots</span>
                    <span
                      className={`font-playfair text-base font-bold text-[#B28DAE] leading-none transition-all duration-300 ${counterPulse ? "scale-125" : "scale-100"}`}
                    >
                      {shotCount}
                      {typeof maxShots === "number" && maxShots > 0 && (
                        <span className="text-white/40 font-sans text-[10px] font-normal"> / {maxShots}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {captureMode === "photo" ? (
                // Snappy spring press-down — the shutter is the single most
                // tapped control in this whole component, so it gets the
                // most tactile feedback (deepest scale of anything here).
                <motion.button
                  onClick={takePhoto}
                  aria-label="Take photo"
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.88, transition: spring.snappy }}
                  className="w-16 h-16 rounded-full border-4 border-[#B28DAE] p-1 flex items-center justify-center hover:scale-95 transition-transform cursor-pointer shadow-[0_0_16px_rgba(178,141,174,0.35)] focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none"
                >
                  <div className="w-full h-full bg-white rounded-full" />
                </motion.button>
              ) : (
                !isRecordingVideo ? (
                  <motion.button
                    onClick={startVideoRecording}
                    aria-label="Start video recording"
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.92, transition: spring.snappy }}
                    className="w-16 h-16 rounded-full border-4 border-red-500/80 p-1 flex items-center justify-center hover:scale-95 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none"
                  >
                    <div className="w-full h-full bg-red-600 rounded-full" />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={stopVideoRecording}
                    aria-label="Stop video recording"
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.92, transition: spring.snappy }}
                    className="w-16 h-16 rounded-full border-4 border-red-500/80 p-1 flex items-center justify-center hover:scale-95 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-[#B28DAE] focus-visible:outline-none"
                  >
                    <Square className="h-6 w-6 fill-red-600 text-red-600" />
                  </motion.button>
                )
              )}

              {/* Spacer to balance the counter's width so the shutter stays centered */}
              <div className="w-14" aria-hidden="true" />
            </div>
          </>
        ) : (
          /* Video Confirm / Retake Controls (unchanged for video — a recorded
             clip is a deliberate artifact worth reviewing before it's sent) */
          <div className="flex items-center justify-center gap-12">
            <Button variant="ghost" onClick={handleRetake} className="text-white flex flex-col items-center gap-1 h-auto py-2 hover:bg-white/10">
              <RefreshCw className="h-6 w-6" />
              <span className="text-xs">Retake</span>
            </Button>
            <Button onClick={handleConfirm} className="bg-[#B28DAE] hover:bg-[#A468A0] text-black rounded-full w-16 h-16 shadow-lg shadow-[#B28DAE]/20">
              <Check className="h-8 w-8" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
