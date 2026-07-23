"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/lib/components/ui/button"
import { Mic, Square, Play, Pause, RefreshCw, Check, X, Volume2 } from "lucide-react"

interface VoiceNoteRecorderProps {
  maxDuration?: number // in seconds (e.g. 10, 20, 30)
  onCapture: (file: File) => void
  onClose: () => void
}

export function VoiceNoteRecorder({ maxDuration = 30, onCapture, onClose }: VoiceNoteRecorderProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
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

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#e5dfd0] rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center gap-6 relative shadow-2xl">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold">
            Voice Note Recorder
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-ink-secondary hover:text-ink rounded-full">
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
                ? "bg-[#b8925a]/20 border-2 border-[#b8925a]"
                : "bg-ink/5 border border-ink/10"
            }`}
          >
            {previewUrl ? (
              <Volume2 className="h-12 w-12 text-[#b8925a]" />
            ) : (
              <Mic className={`h-12 w-12 ${isRecording ? "text-red-500" : "text-ink-secondary"}`} />
            )}
          </div>
        </div>

        {/* Timer */}
        <div className="text-center space-y-1">
          <p className="text-3xl font-mono font-bold text-ink tracking-wider">
            {formatTime(recordingTime)} <span className="text-xs font-normal text-ink-secondary">/ {formatTime(maxDuration)}</span>
          </p>
          <p className="text-xs text-[#C5A059]">
            {isRecording
              ? `Recording live... Max limit: ${maxDuration}s`
              : previewUrl
              ? "Listen to your note before sending"
              : `Tap record button to begin (Limit: ${maxDuration}s)`}
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

        {/* Controls */}
        <div className="w-full pt-2 flex items-center justify-center gap-6">
          {!previewUrl ? (
            !isRecording ? (
              <button
                onClick={startRecording}
                disabled={!stream}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-full bg-white" />
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
              <Button variant="ghost" onClick={handleRetake} className="text-ink-secondary hover:text-ink flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="text-xs font-semibold">Re-record</span>
              </Button>

              <button
                onClick={togglePlayback}
                className="w-12 h-12 rounded-full bg-mauve/10 hover:bg-mauve/20 text-ink flex items-center justify-center transition"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>

              <Button onClick={handleConfirm} className="bg-[#b8925a] hover:bg-[#96723a] text-black font-bold flex items-center gap-1.5 rounded-full px-5 py-2">
                <Check className="h-4 w-4" />
                <span className="text-xs">Send</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
