"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/lib/components/ui/button"
import { Mic, Square, Play, Pause, RefreshCw, Check, X, Volume2 } from "lucide-react"

interface VoiceNoteRecorderProps {
  maxDuration?: number // in seconds (e.g. 10, 20, 30)
  onCapture: (file: File) => void
  onClose: () => void
}

export function VoiceNoteRecorder({ maxDuration = 30, onCapture, onClose }: VoiceNoteRecorderProps) {
  const [mounted, setMounted] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const originalStyle = document.body.style.overflow
    const originalTouchAction = document.body.style.touchAction
    document.body.style.overflow = "hidden"
    document.body.style.touchAction = "none"
    return () => {
      document.body.style.overflow = originalStyle
      document.body.style.touchAction = originalTouchAction
    }
  }, [])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const startStream = useCallback(async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(audioStream)
    } catch (err) {
      console.error("Audio recording permission error:", err)
      alert("Could not access microphone. Please check browser permissions.")
    }
  }, [])

  useEffect(() => {
    startStream()
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRecording = () => {
    if (!stream) return
    chunksRef.current = []
    
    let mimeType = "audio/webm"
    if (!MediaRecorder.isTypeSupported("audio/webm")) {
      if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4"
      else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg"
      else mimeType = ""
    }

    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" })
      setRecordedBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
    }

    mediaRecorder.start(200)
    setIsRecording(true)
    setRecordingTime(0)

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev + 1 >= maxDuration) {
          stopRecording()
          return maxDuration
        }
        return prev + 1
      })
    }, 1000)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)
  }

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setRecordedBlob(null)
    setPreviewUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
  }

  const togglePlayback = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleConfirm = () => {
    if (recordedBlob) {
      const ext = recordedBlob.type.includes("mp4") ? "m4a" : recordedBlob.type.includes("ogg") ? "ogg" : "webm"
      const file = new File([recordedBlob], `voicenote_${Date.now()}.${ext}`, { type: recordedBlob.type || "audio/webm" })
      onCapture(file)
      if (stream) stream.getTracks().forEach((track) => track.stop())
      onClose()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const content = (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#e5dfd0] rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center gap-6 relative shadow-2xl">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold">
            Voice Note Recorder
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#8c8275] hover:text-[#1a1410] rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Visualizer & Icon */}
        <div className="relative my-4 flex items-center justify-center">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? "bg-red-500/20 border-2 border-red-500 animate-pulse scale-105"
                : previewUrl
                ? "bg-mauve/20 border-2 border-mauve"
                : "bg-[#faf6ed]/60 border border-[#e5dfd0]"
            }`}
          >
            {previewUrl ? (
              <Volume2 className="h-12 w-12 text-mauve" />
            ) : (
              <Mic className={`h-12 w-12 ${isRecording ? "text-red-500" : "text-[#6b6055]"}`} />
            )}
          </div>
        </div>

        {/* Time Counter */}
        <div className="text-center space-y-1">
          <span className="font-mono text-2xl font-bold text-[#1a1410]">
            0:{recordingTime < 10 ? `0${recordingTime}` : recordingTime} / 0:{maxDuration < 10 ? `0${maxDuration}` : maxDuration}
          </span>
          <p className="text-xs text-[#6b6055]">
            {isRecording
              ? "Recording audio message…"
              : previewUrl
              ? "Listen to preview before sending"
              : "Tap the button below to start recording"}
          </p>
        </div>

        {/* Hidden Audio Player */}
        {previewUrl && (
          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Actions */}
        <div className="w-full flex items-center justify-center pt-2">
          {!previewUrl ? (
            !isRecording ? (
              <button
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-mauve hover:bg-mauve-strong text-black flex items-center justify-center shadow-lg shadow-mauve/30 transition-transform active:scale-95 cursor-pointer"
              >
                <Mic className="h-8 w-8" />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform active:scale-95 cursor-pointer"
              >
                <Square className="h-6 w-6 fill-white" />
              </button>
            )
          ) : (
            <div className="flex items-center justify-between w-full px-4">
              <Button variant="ghost" onClick={handleRetake} className="text-[#6b6055] hover:text-[#1a1410] flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="text-xs font-semibold">Re-record</span>
              </Button>

              <button
                onClick={togglePlayback}
                className="w-12 h-12 rounded-full bg-mauve/10 hover:bg-mauve/20 text-[#1a1410] flex items-center justify-center transition"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>

              <Button onClick={handleConfirm} className="bg-mauve hover:bg-mauve-strong text-black font-bold flex items-center gap-1.5 rounded-full px-5 py-2">
                <Check className="h-4 w-4" />
                <span className="text-xs">Send</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}
