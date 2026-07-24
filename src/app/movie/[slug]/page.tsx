"use client"

// src/app/movie/[slug]/page.tsx
//
// Public "Share" page — snapsy-events.vercel.app/movie/[slug]. Used to show
// the Recap Video; that feature was removed, and Share was folded into the
// Slideshow card instead of staying its own thing. The path still says
// "movie" (this environment can't rename/delete files on the mounted repo
// folder), but it now shows the event's live in-browser slideshow, a QR
// code of this same page, and share buttons.

import { useEffect, useState, use as usePromise } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Share2, Film } from "lucide-react"
import { SlideshowPlayer } from "@/lib/components/media/slideshow-player"

interface MovieData {
  eventName: string
  slug: string
  coverImageUrl: string | null
  slideshow: {
    intervalSeconds: number
    musicTrackUrl: string | null
    photos: { id: string; storage_path: string; thumbnail_path: string | null }[]
  } | null
}

export default function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = usePromise(params)
  const [data, setData] = useState<MovieData | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "not_found">("loading")
  const [pageUrl, setPageUrl] = useState("")

  useEffect(() => {
    setPageUrl(window.location.href)
    fetch(`/api/movie/${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setStatus("not_found")
          return
        }
        setData(json.data)
        setStatus("ready")
      })
      .catch(() => setStatus("not_found"))
  }, [slug])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-mauve/30 border-t-mauve animate-spin" />
      </div>
    )
  }

  if (status === "not_found" || !data) {
    return (
      <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Film className="h-10 w-10 text-ink-tertiary" />
        <p className="text-ink-secondary font-medium">This memory couldn&apos;t be found.</p>
      </div>
    )
  }

  const shareText = encodeURIComponent(`Check out the highlights from ${data.eventName}! ✨`)
  const encodedUrl = encodeURIComponent(pageUrl)
  const hasSlideshow = !!data.slideshow && data.slideshow.photos.length > 0

  return (
    <div className="min-h-screen bg-surface-dark text-ink">
      <div className="max-w-lg mx-auto px-6 py-10 space-y-8">
        <div className="text-center space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-mauve font-bold">✨ Snapsy Memories</p>
          <h1 className="font-playfair text-2xl font-medium">{data.eventName}</h1>
        </div>

        {hasSlideshow ? (
          <>
            <div className="rounded-2xl overflow-hidden border border-hairline-dark bg-surface-card aspect-[9/16] relative">
              <SlideshowPlayer
                photos={data.slideshow!.photos}
                intervalSeconds={data.slideshow!.intervalSeconds}
                musicTrackUrl={data.slideshow!.musicTrackUrl}
              />
            </div>

            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={() =>
                  (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
                    title: data.eventName,
                    text: `Check out the highlights from ${data.eventName}!`,
                    url: pageUrl,
                  })
                }
                className="w-full flex items-center justify-center gap-2 rounded-full bg-mauve text-[#1a1410] font-semibold py-3 text-sm hover:bg-mauve-strong transition-colors"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            )}

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <a href={`https://wa.me/?text=${shareText}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-hairline-dark bg-mauve/5 py-3 hover:bg-mauve/10 transition-colors">WhatsApp</a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-hairline-dark bg-mauve/5 py-3 hover:bg-mauve/10 transition-colors">Facebook</a>
              <a href={`https://t.me/share/url?url=${encodedUrl}&text=${shareText}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-hairline-dark bg-mauve/5 py-3 hover:bg-mauve/10 transition-colors">Telegram</a>
              <button
                onClick={() => navigator.clipboard?.writeText(pageUrl)}
                className="rounded-xl border border-hairline-dark bg-mauve/5 py-3 hover:bg-mauve/10 transition-colors"
                title="Instagram doesn't support direct link-sharing — copy the link and paste it into your Story or bio instead."
              >
                Copy Link
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 pt-4 border-t border-hairline-dark">
              <div className="p-3 bg-white rounded-2xl">
                <QRCodeSVG value={pageUrl} size={140} bgColor="transparent" fgColor="#1c1a17" level="H" />
              </div>
              <p className="text-[11px] text-ink-tertiary">Scan to watch on another device</p>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-hairline-dark bg-surface-card p-8 text-center space-y-2">
            <Film className="h-8 w-8 text-ink-tertiary mx-auto" />
            <p className="text-ink-secondary text-sm font-medium">No slideshow is ready yet.</p>
            <p className="text-ink-tertiary text-xs">Check back soon — the host is still putting it together.</p>
          </div>
        )}
      </div>
    </div>
  )
}
