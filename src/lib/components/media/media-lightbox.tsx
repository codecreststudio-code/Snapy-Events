"use client"

// Shared media viewer: full-size image/video/voice-note playback plus emoji
// reactions, text comments, and voice-note replies. Extracted out of
// src/app/event/[slug]/g/[gallerySlug]/gallery-view.tsx (the guest gallery
// page) so the host dashboard's media timeline — which previously had no
// click-to-open viewer at all — can show the exact same experience instead
// of duplicating ~150 lines of reaction/comment UI a second time.
import { useEffect, useRef, useState } from "react"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Volume2, X, Download, Heart, Flame, PartyPopper, ThumbsUp, Smile, Send, MessageCircle, Mic, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react"
import { WatermarkOverlay } from "@/lib/components/media/watermark-overlay"
import { VoiceNoteRecorder } from "@/lib/components/events/voice-note-recorder"
import { toast } from "@/lib/components/ui/toaster"

export type LightboxComment =
  | { id: string; type?: "text"; author_name: string; comment: string; created_at: string }
  | { id: string; type: "voice"; author_name: string; voice_url: string; created_at: string }

export type LightboxMedia = {
  id: string
  original_filename: string
  uploader_name: string | null
  mime_type: string | null
  created_at: string
  url: string | null
  metadata?: {
    reactions?: Record<string, number>
    comments?: LightboxComment[]
    text?: string
    is_message?: boolean
  }
  /** Set when the event has Best Shot Selection enabled — see quality-score.ts. */
  is_best_shot?: boolean
  /** Client-computed labels from Auto Categorization — see auto-tag-client.ts. */
  tags?: string[]
}

const EMOJI_LIST = [
  { key: "heart", symbol: "❤️", icon: Heart, label: "Love" },
  { key: "fire", symbol: "🔥", icon: Flame, label: "Fire" },
  { key: "party", symbol: "🎉", icon: PartyPopper, label: "Party" },
  { key: "clap", symbol: "👏", icon: ThumbsUp, label: "Clap" },
  { key: "adore", symbol: "😍", icon: Smile, label: "Adore" },
]

export function isVideo(p: LightboxMedia) { return p.mime_type?.startsWith("video/") }
export function isAudio(p: LightboxMedia) { return p.mime_type?.startsWith("audio/") }
export function isMessage(p: LightboxMedia) { return p.mime_type === "text/plain" || p.metadata?.is_message === true }

function VoiceCommentPlayer({ url, label }: { url: string; label: string }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <audio
        src={url}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        id={`voice-comment-${url}`}
        className="hidden"
      />
      <button
        onClick={(e) => {
          const el = (e.currentTarget.parentElement?.querySelector("audio") as HTMLAudioElement | null)
          if (!el) return
          if (playing) el.pause()
          else el.play()
        }}
        className="h-7 w-7 shrink-0 rounded-full bg-[#b8925a]/20 text-[#b8925a] flex items-center justify-center hover:bg-[#b8925a]/30 transition"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <span className="text-[11px] text-ink-secondary">{label}</span>
    </div>
  )
}

export function MediaLightbox({
  p,
  watermarkEnabled,
  maxVoiceDuration = 10,
  onClose,
  onReact,
  onComment,
  onVoiceComment,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: {
  p: LightboxMedia
  watermarkEnabled: boolean
  // Event-configured cap (seconds) for the voice-note reply recorder. Passed
  // down from the event's settings.voice_note_duration_limit by both call
  // sites (guest gallery + host dashboard) — defaults to 10 to match the
  // host wizard's own default, rather than the recorder component's
  // internal 30s default, which previously ignored the event setting entirely.
  maxVoiceDuration?: number
  onClose: () => void
  onReact: (emoji: string) => void
  onComment: (commentText: string, authorName: string) => void
  onVoiceComment?: (file: File, authorName: string) => void
  // Move to the previous/next item in the current media set. Optional so
  // this component still works standalone (e.g. a single-item preview) —
  // the arrow buttons and swipe/keyboard handling below only activate when
  // both a handler and hasPrev/hasNext are provided by the caller.
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}) {
  const [commentInput, setCommentInput] = useState("")
  const [nameInput, setNameInput] = useState("")
  const [showRecorder, setShowRecorder] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const canDownload = !isMessage(p)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Previously window.open(url, "_blank") — on any failure (e.g. the host
  // dashboard requesting a not-yet-approved photo the download route didn't
  // know to allow for hosts) this just navigated the whole tab to a raw
  // {"error": "..."} JSON page instead of showing a real error message. A
  // fetch->blob->synthetic-download-link never leaves the app, and any
  // failure surfaces as a normal toast instead of a broken-looking page.
  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/photos/${p.id}/download`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Download failed")
      }
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = p.original_filename || `snapsy-${p.id}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      toast({ title: "Download failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" })
    } finally {
      setDownloading(false)
    }
  }

  const reactions = p.metadata?.reactions || {}
  const comments = p.metadata?.comments || []

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim()) return
    onComment(commentInput, nameInput.trim() || "Guest")
    setCommentInput("")
  }

  // Left/Right arrow keys move between media, Escape closes — matches the
  // behavior guests expect from every other photo viewer (Google Photos,
  // native OS galleries, etc). Typing in the comment/name inputs shouldn't
  // be hijacked by arrow keys, so those are ignored while an input/textarea
  // has focus.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA"
      if (isTyping) {
        if (e.key === "Escape") (target as HTMLElement).blur()
        return
      }
      if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev()
      else if (e.key === "ArrowRight" && hasNext && onNext) onNext()
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hasPrev, hasNext, onPrev, onNext, onClose])

  // Swipe support for touch/mobile — a horizontal drag past a small
  // threshold moves to the next/previous item, same gesture as any native
  // photo gallery. Vertical scrolling and taps (small movement) are ignored.
  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const SWIPE_THRESHOLD = 50
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0 && hasNext && onNext) onNext()
    else if (dx > 0 && hasPrev && onPrev) onPrev()
  }

  return (
    <div className="bg-[#080808] border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] w-full max-w-4xl shadow-2xl text-white">
      {/* Media Content Box */}
      <div
        className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[480px] p-2 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {hasPrev && onPrev && (
          <button
            onClick={onPrev}
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm border border-white/10 hover:bg-black/70 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {hasNext && onNext && (
          <button
            onClick={onNext}
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm border border-white/10 hover:bg-black/70 transition"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
        {isMessage(p) ? (
          <div className="p-8 text-center max-w-md space-y-4">
            <MessageCircle className="h-12 w-12 text-white mx-auto" />
            <p className="text-xl font-serif italic text-white/90">"{p.metadata?.text || p.original_filename}"</p>
            <p className="text-xs text-neutral-400 font-semibold">Wish by {p.uploader_name || "Guest"}</p>
          </div>
        ) : isVideo(p) && p.url ? (
          <div className="relative max-h-[75vh] w-auto">
            <video src={p.url} controls autoPlay playsInline className="max-h-[75vh] w-auto max-w-full rounded-lg">
              Your browser does not support video playback.
            </video>
            {watermarkEnabled && <WatermarkOverlay dense />}
          </div>
        ) : isAudio(p) && p.url ? (
          <div className="flex flex-col items-center gap-4 p-8">
            <Volume2 className="h-16 w-16 text-white" />
            <p className="text-white/80 font-medium">{p.uploader_name ? `Voice note from ${p.uploader_name}` : p.original_filename}</p>
            <audio src={p.url} controls autoPlay className="w-80 max-w-full">
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : p.url ? (
          <div className="relative max-h-[75vh] w-auto">
            <img src={p.url} alt={p.original_filename} className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg" />
            {watermarkEnabled && <WatermarkOverlay dense />}
          </div>
        ) : (
          <div className="aspect-square bg-gradient-to-br from-white/10 to-white/5" />
        )}
      </div>

      {/* Side Panel: Reactions & Comments */}
      <div className="w-full md:w-80 bg-[#080808] border-t md:border-t-0 md:border-l border-white/10 flex flex-col justify-between p-4 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{p.uploader_name || "Event Guest"}</p>
            <p className="text-[10px] text-ink-tertiary">{new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canDownload && (
              <Button variant="ghost" size="icon" disabled={downloading} onClick={handleDownload} title="Download" className="text-ink-secondary hover:text-ink rounded-full disabled:opacity-50">
                <Download className={`h-4.5 w-4.5 ${downloading ? "animate-pulse" : ""}`} />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-ink-secondary hover:text-ink rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Emoji Reactions Bar */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-[#b8925a] font-bold">Reactions</p>
          <div className="flex items-center justify-between bg-ink/5 border border-ink/10 rounded-xl p-2">
            {EMOJI_LIST.map((e) => {
              const count = reactions[e.key] || 0
              return (
                <button
                  key={e.key}
                  onClick={() => onReact(e.key)}
                  className="flex flex-col items-center hover:scale-125 transition-transform active:scale-95 cursor-pointer group"
                  title={e.label}
                >
                  <span className="text-xl">{e.symbol}</span>
                  <span className="text-[10px] font-bold text-ink-secondary group-hover:text-[#b8925a]">{count > 0 ? count : ""}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Comments Feed */}
        <div className="flex-1 overflow-y-auto max-h-48 space-y-2.5 pr-1 no-scrollbar my-2">
          <p className="text-[10px] uppercase tracking-widest text-[#b8925a] font-bold">Wishes & Comments ({comments.length})</p>
          {comments.length === 0 ? (
            <p className="text-xs text-ink-tertiary italic">No comments yet. Be the first to leave a wish!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="bg-ink/5 border border-ink/10 rounded-lg p-2.5 space-y-1">
                <p className="text-[11px] font-semibold text-ink">{c.author_name}</p>
                {c.type === "voice" ? (
                  <VoiceCommentPlayer url={c.voice_url} label="Voice reply" />
                ) : (
                  <p className="text-xs text-ink-secondary font-light">{c.comment}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Comment Input Form */}
        <form onSubmit={handleSendComment} className="space-y-2 pt-2 border-t border-[#e5dfd0]">
          <Input
            placeholder="Your Name (optional)"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="bg-[#faf6ed] border-[#e5dfd0] text-ink placeholder:text-ink-tertiary h-8 text-xs focus:border-[#b8925a]"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Write a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="bg-[#faf6ed] border-[#e5dfd0] text-ink placeholder:text-ink-tertiary h-9 text-xs focus:border-[#b8925a] flex-1"
            />
            <Button type="submit" size="icon" className="bg-[#b8925a] hover:bg-[#96723a] text-black h-9 w-9 shrink-0 rounded-lg">
              <Send className="h-4 w-4" />
            </Button>
            {onVoiceComment && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowRecorder(true)}
                className="h-9 w-9 shrink-0 rounded-lg border-[#e5dfd0] text-[#b8925a] hover:bg-mauve/10"
                title="Reply with a voice note"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>

      {showRecorder && onVoiceComment && (
        <VoiceNoteRecorder
          maxDuration={maxVoiceDuration}
          onCapture={(file) => {
            onVoiceComment(file, nameInput.trim() || "Guest")
            setShowRecorder(false)
          }}
          onClose={() => setShowRecorder(false)}
        />
      )}
    </div>
  )
}
