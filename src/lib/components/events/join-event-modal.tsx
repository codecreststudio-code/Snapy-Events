"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowLeft, ArrowRight, Camera, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import jsQR from "jsqr"

interface JoinEventModalProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinEventModal({ isOpen, onClose }: JoinEventModalProps) {
  const [joinCode, setJoinCode] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  
  // Camera state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanAnimFrameRef = useRef<number | null>(null)

  // Helper to extract clean code or slug from input/URL
  const extractCodeOrSlug = (input: string): string => {
    let clean = input.trim()
    if (clean.includes("/event/")) {
      const parts = clean.split("/event/")
      if (parts[1]) {
        clean = parts[1].split("?")[0].split("#")[0]
      }
    }
    return clean
  }

  // Join API submit handler
  const processJoin = useCallback(async (codeToSubmit: string) => {
    const code = extractCodeOrSlug(codeToSubmit)
    if (!code) return
    
    setJoinLoading(true)
    setJoinError(null)

    try {
      const res = await fetch("/api/events/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      
      if (res.ok && data.data?.slug) {
        setScanSuccess(true)
        setTimeout(() => {
          window.location.href = `/event/${data.data.slug}`
        }, 400)
      } else {
        setJoinError(data.error?.message || "Invalid event code or QR code. Please check and try again.")
      }
    } catch (_) {
      setJoinError("Unable to verify code right now. Please try again.")
    } finally {
      setJoinLoading(false)
    }
  }, [])

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    await processJoin(joinCode)
  }

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (scanAnimFrameRef.current) {
      cancelAnimationFrame(scanAnimFrameRef.current)
      scanAnimFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  // Live QR frame scanner loop
  const tickScanner = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanAnimFrameRef.current = requestAnimationFrame(tickScanner)
      return
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (ctx) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })

      if (qrCode && qrCode.data) {
        // QR Code detected!
        const decoded = qrCode.data
        setJoinCode(decoded)
        stopCamera()
        processJoin(decoded)
        return
      }
    }

    scanAnimFrameRef.current = requestAnimationFrame(tickScanner)
  }, [processJoin, stopCamera])

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 720 }, height: { ideal: 720 } },
      })
      streamRef.current = mediaStream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        setCameraActive(true)
        scanAnimFrameRef.current = requestAnimationFrame(tickScanner)
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err)
      setCameraError("Camera permission denied or camera unavailable.")
      setCameraActive(false)
    }
  }, [tickScanner])

  // Camera Lifecycle on Modal open/close
  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
      setJoinCode("")
      setJoinError(null)
      setScanSuccess(false)
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, startCamera, stopCamera])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 min-h-screen">
          {/* Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              stopCamera()
              onClose()
            }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0F0E0D] text-[#faf6ed] p-6 sm:p-7 rounded-3xl border border-[#2a2724] shadow-2xl space-y-6 text-left z-10 my-auto overflow-hidden"
          >
            {/* Top Bar with Back Arrow */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  onClose()
                }}
                className="w-10 h-10 rounded-full border border-[#2a2724] bg-[#1a1816] flex items-center justify-center text-ink-secondary hover:text-white transition cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-[#b8925a]">Scan or Join</span>
            </div>

            {/* QR Scanner Camera Viewfinder Frame */}
            <div className="relative aspect-square w-full bg-[#171513] rounded-3xl border-2 border-dashed border-[#b8925a]/40 overflow-hidden shadow-inner flex items-center justify-center">
              {/* Hidden canvas for scanning frame analysis */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Live Video Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                  cameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              />

              {/* Viewfinder Overlay & Scanner Beam */}
              {cameraActive && !scanSuccess && (
                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-[#b8925a] rounded-2xl relative shadow-[0_0_20px_rgba(184,146,90,0.3)]">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#b8925a] to-transparent animate-bounce opacity-80" />
                  </div>
                </div>
              )}

              {/* Camera Offline / Permission Required Fallback */}
              {!cameraActive && !scanSuccess && (
                <div className="p-6 text-center space-y-3 z-10">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#b8925a]/60 bg-[#b8925a]/10 flex items-center justify-center text-[#b8925a] mx-auto">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                      {cameraError ? "Camera Unavailable" : "Scan Event QR Code"}
                    </p>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                      {cameraError || "Position the event QR code inside the frame to scan"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={startCamera}
                    className="mt-2 text-xs bg-[#b8925a]/20 hover:bg-[#b8925a]/30 text-[#b8925a] border border-[#b8925a]/40 rounded-full px-4 py-1.5"
                  >
                    Enable Camera Scanner
                  </Button>
                </div>
              )}

              {/* Success Overlay when QR Code matches */}
              {scanSuccess && (
                <div className="absolute inset-0 bg-[#0F0E0D]/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
                  <p className="text-base font-bold text-white">QR Code Recognized!</p>
                  <p className="text-xs text-zinc-400">Opening event capsule now...</p>
                </div>
              )}
            </div>

            {/* Bottom Form Section: Or Paste Invitation Link */}
            <form onSubmit={handleJoinSubmit} className="space-y-4 pt-2 border-t border-[#2a2724]">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block">
                  OR PASTE INVITATION LINK / CODE
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Paste link or enter code (e.g. MQV8KF)"
                    className="w-full rounded-2xl border border-[#2a2724] bg-[#171513] px-4 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#b8925a] focus:outline-none transition-colors"
                  />
                </div>
                {joinError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400 pt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={joinLoading || !joinCode.trim()}
                className="w-full rounded-2xl bg-[#faf6ed] hover:bg-white text-black font-bold py-4 text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {joinLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining...
                  </span>
                ) : (
                  <>
                    <span>Join</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
