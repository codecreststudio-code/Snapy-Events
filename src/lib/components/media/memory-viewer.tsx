"use client"

// src/lib/components/media/memory-viewer.tsx
//
// Mobile-first, in-app full-screen viewer for Snapsy Memories content (Auto
// Collage images, Slideshow photos) on the host dashboard
// (src/app/dashboard/events/[slug]/page.tsx). Replaces the old behavior of
// opening a collage image with a plain <a target="_blank"> (left the app
// entirely, landing on a bare browser image tab with no way back except the
// OS back button) with a proper gallery-style modal: swipe/arrow next-prev
// between items, a real "download" that never navigates away (fetch → blob →
// synthetic <a download> click, same pattern already used elsewhere in this
// file for QR/print-ready/invitation downloads), a native share sheet with a
// copy-link fallback, per-item emoji reactions, and a "Story" action that
// fetches a 1080x1920 watermarked export and hands it straight to the native
// share sheet so a guest/host can drop it directly into Instagram/Snapchat
// Stories where that's supported (falls back to a plain download elsewhere).
//
// Deliberately a separate component from <MediaLightbox> rather than an
// extension of it: MediaLightbox's reaction/comment model is wired directly
// to the guest-facing photos.metadata shape and its own /api/photos/[id]/react
// endpoint, whereas this viewer is generic over any "memory" item (a
// composited collage has no single backing photo row) and lets the caller
// supply whatever download/story/react URLs and reaction counts apply.

import { useEffect, useRef, useState } from "react"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { X, Download, Share2, ChevronLeft, ChevronRight, Heart, Flame, PartyPopper, ThumbsUp, Smile, Play, Pause, Volume2, VolumeX } from "lucide-react"
import { WatermarkOverlay } from "@/lib/components/media/watermark-overlay"

export type MemoryViewerItem = {
  id: string
  url: string
  downloadUrl: string
  storyUrl?: string | null
  reactions?: Record<string, number>
  caption?: string | null
  kind?: "image" | "video"
  mimeType?: string
}

function extensionFor(mimeType: string | undefined): string {
  if (mimeType === "video/mp4") return "mp4"
  if (mimeType === "video/webm") return "webm"
  return "jpg"
}

const EMOJI_LIST = [
  { key: "heart", symbol: "❤️", label: "Love" },
  { key: "fire", symbol: "🔥", label: "Fire" },
  { key: "party", symbol: "🎉", label: "Party" },
  { key: "clap", symbol: "👏", label: "Clap" },
  { key: "adore", symbol: "😍", label: "Adore" },
]

async function downloadViaBlob(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Download failed")
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

export function MemoryViewer({
  items,
  initialIndex = 0,
  title,
  shareUrl,
  shareText,
  musicUrl,
  autoPlaySeconds,
  watermarkPreview = true,
  onClose,
  onReact,
}: {
  items: MemoryViewerItem[]
  initialIndex?: number
  title?: string
  // Page link to hand to the native share sheet / clipboard for the general
  // "Share" action (distinct from the per-item "Story" export). Falls back
  // to the current item's own image URL if omitted.
  shareUrl?: string
  shareText?: string
  musicUrl?: string | null
  // When set, auto-advances every N seconds (loops) like the old
  // SlideshowPlayer — a play/pause toggle lets the viewer stop on one frame.
  autoPlaySeconds?: number
  watermarkPreview?: boolean
  onClose: () => void
  onReact?: (itemId: string, emoji: string) => void
}) {
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(0, items.length - 1)))
  const [busy, setBusy] = useState<"download" | "story" | "share" | null>(null)
  const [playing, setPlaying] = useState(!!autoPlaySeconds)
  const [muted, setMuted] = useState(false)
  const [musicUnavailable, setMusicUnavailable] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const item = items[index]
  const hasPrev = index > 0
  const hasNext = index < items.length - 1

  useEffect(() => {
    if (!autoPlaySeconds || !playing || items.length < 2) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length)
    }, Math.max(1500, autoPlaySeconds * 1000))
    return () => clearInterval(timer)
  }, [autoPlaySeconds, playing, items.length])

  useEffect(() => {
    if (!musicUrl) return
    audioRef.current?.play().catch(() => {
      /* autoplay-with-sound blocked — the mute toggle lets the host start it manually */
    })
    return () => {
      audioRef.current?.pause()
    }
  }, [musicUrl])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && hasPrev) setIndex((i) => i - 1)
      else if (e.key === "ArrowRight" && hasNext) setIndex((i) => i + 1)
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hasPrev, hasNext, onClose])

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
    if (dx < 0 && hasNext) setIndex((i) => i + 1)
    else if (dx > 0 && hasPrev) setIndex((i) => i - 1)
  }

  async function handleDownload() {
    if (!item) return
    setBusy("download")
    try {
      await downloadViaBlob(item.downloadUrl, `snapsy-${item.id}.${extensionFor(item.mimeType)}`)
    } catch (err) {
      toast({ title: "Download failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  // "Save for Story": fetches the 1080x1920 watermarked export and, where
  // the browser supports sharing files (most mobile browsers), hands it
  // straight to the native share sheet so Instagram/Snapchat Stories shows
  // up as a target — this is what lets a guest add it to their Story in one
  // tap instead of downloading, opening Instagram, and uploading manually.
  // Desktop / unsupported browsers fall back to a plain download.
  async function handleStory() {
    if (!item?.storyUrl) return
    setBusy("story")
    try {
      const res = await fetch(item.storyUrl)
      if (!res.ok) throw new Error("Failed to prepare story image")
      const blob = await res.blob()
      const file = new File([blob], "snapsy-story.jpg", { type: "image/jpeg" })
      const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean; share?: (data: { files?: File[]; title?: string }) => Promise<void> }
      if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: title || "Snapsy Events" })
        return
      }
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = "snapsy-story.jpg"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
      toast({ title: "Story image saved", description: "Open Instagram or Snapchat and upload it to your Story." })
    } catch (err) {
      // AbortError fires when the user just closes the native share sheet —
      // that's not a failure worth surfacing.
      if (err instanceof Error && err.name === "AbortError") return
      toast({ title: "Couldn't prepare story image", description: err instanceof Error ? err.message : undefined, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  // For video, sharing the page *link* isn't what anyone wants here — the
  // whole point of a 9:16 clip is dropping it straight into Instagram/
  // Snapchat/WhatsApp Stories, which needs the actual video file handed to
  // the native share sheet (exactly like handleStory does for photos below).
  // Falls back to a link share (or copy-link) only if the browser can't
  // share files or the file fetch fails.
  async function handleShare() {
    if (!item) return
    setBusy("share")
    try {
      if (item.kind === "video") {
        const nav = navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean; share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void> }
        try {
          const res = await fetch(item.url)
          if (!res.ok) throw new Error("Failed to load video")
          const blob = await res.blob()
          const ext = item.mimeType === "video/mp4" ? "mp4" : "webm"
          const file = new File([blob], `snapsy-movie.${ext}`, { type: item.mimeType || blob.type })
          if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
            await nav.share({ files: [file], title: title || "Snapsy Events", text: shareText })
            return
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return
          // Fall through to the link-share/copy path below.
        }
      }

      const url = shareUrl || item.url
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
      if (nav.share) {
        await nav.share({ title: title || "Snapsy Events", text: shareText, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copied!", description: "Paste it anywhere to share." })
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      toast({ title: "Couldn't share", description: err instanceof Error ? err.message : undefined, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  if (!item) return null
  const reactions = item.reactions || {}

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" role="dialog" aria-modal="true">
      {musicUrl && !musicUnavailable && (
        <audio ref={audioRef} src={musicUrl} loop muted={muted} onError={() => setMusicUnavailable(true)} />
      )}

      {/* Top bar — close, title, autoplay/mute controls. Large tap targets, safe-area aware for notched phones. */}
      <div className="flex items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-10 w-10">
          <X className="h-5 w-5" />
        </Button>
        {title && <p className="text-xs font-semibold text-white/70 truncate flex-1 text-center">{title}</p>}
        <div className="flex items-center gap-1">
          {musicUrl && !musicUnavailable && (
            <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-10 w-10">
              {muted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </Button>
          )}
          {autoPlaySeconds && items.length > 1 && (
            <Button variant="ghost" size="icon" onClick={() => setPlaying((p) => !p)} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-10 w-10">
              {playing ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Media stage */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {hasPrev && (
          <button
            onClick={() => setIndex((i) => i - 1)}
            aria-label="Previous"
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm border border-white/10 hover:bg-black/70 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={() => setIndex((i) => i + 1)}
            aria-label="Next"
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm border border-white/10 hover:bg-black/70 transition"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
        <div className="relative max-h-full max-w-full">
          {item.kind === "video" ? (
            <video
              key={item.id}
              src={item.url}
              controls
              playsInline
              autoPlay
              className="max-h-[calc(100vh-13rem)] max-w-full object-contain"
            />
          ) : (
            <img src={item.url} alt={item.caption || ""} className="max-h-[calc(100vh-13rem)] max-w-full object-contain" />
          )}
          {watermarkPreview && item.kind !== "video" && <WatermarkOverlay dense />}
        </div>
        {items.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {items.map((it, i) => (
              <div key={it.id} className={`h-1 rounded-full transition-all ${i === index ? "w-6 bg-mauve" : "w-1.5 bg-white/30"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom action bar — reactions + download/story/share, thumb-reachable on mobile. */}
      <div className="shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 bg-gradient-to-t from-black via-black/95 to-transparent">
        {onReact && (
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-2">
            {EMOJI_LIST.map((e) => {
              const count = reactions[e.key] || 0
              return (
                <button
                  key={e.key}
                  onClick={() => onReact(item.id, e.key)}
                  className="flex flex-col items-center px-2 py-1 hover:scale-110 active:scale-95 transition-transform"
                  title={e.label}
                >
                  <span className="text-xl">{e.symbol}</span>
                  <span className="text-[10px] font-bold text-white/70">{count > 0 ? count : ""}</span>
                </button>
              )
            })}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={handleDownload}
            className="rounded-full border-white/15 bg-white/5 text-white text-xs py-5 flex items-center justify-center gap-1.5 hover:bg-white/10"
          >
            <Download className="h-4 w-4" /> {busy === "download" ? "Saving…" : "Download"}
          </Button>
          {item.storyUrl && (
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={handleStory}
              className="rounded-full border-white/15 bg-white/5 text-white text-xs py-5 flex items-center justify-center gap-1.5 hover:bg-white/10"
            >
              📱 {busy === "story" ? "Preparing…" : "Story"}
            </Button>
          )}
          <Button
            disabled={busy !== null}
            onClick={handleShare}
            className={`rounded-full bg-mauve hover:bg-mauve-strong text-black text-xs py-5 flex items-center justify-center gap-1.5 ${!item.storyUrl ? "col-span-2" : ""}`}
          >
            <Share2 className="h-4 w-4" />
            {busy === "share" ? "Preparing…" : item.kind === "video" ? "Share to Story" : "Share"}
          </Button>
        </div>
        {item.kind === "video" && (
          <p className="text-[10px] text-white/40 text-center -mt-1">
            Opens your share sheet — pick Instagram or Snapchat, then add it to your Story.
          </p>
        )}
      </div>
    </div>
  )
}
