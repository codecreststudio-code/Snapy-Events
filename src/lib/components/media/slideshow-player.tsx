"use client"

// src/lib/components/media/slideshow-player.tsx
//
// Live in-browser slideshow player — pure CSS fade/zoom transitions cycling
// through the top-scored photos, no video export/encoding step at all. This
// is what lets "Slideshow" render identically well on every device without
// ever touching MediaRecorder/ffmpeg: it's just a web page. Shared between
// the host dashboard's "Watch Slideshow" preview
// (src/app/dashboard/events/[slug]/page.tsx) and the public share page
// (src/app/movie/[slug]/page.tsx) so the two don't drift.

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

export function SlideshowPlayer({
  photos,
  intervalSeconds,
  musicTrackUrl,
  onClose,
}: {
  photos: { id: string; storage_path: string; thumbnail_path: string | null }[]
  intervalSeconds: number
  musicTrackUrl?: string | null
  onClose?: () => void
}) {
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  // If the track file 404s (audio asset not uploaded yet), fall back to a
  // silent slideshow instead of showing a broken mute button.
  const [musicUnavailable, setMusicUnavailable] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (photos.length === 0) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, Math.max(1500, intervalSeconds * 1000))
    return () => clearInterval(timer)
  }, [photos.length, intervalSeconds])

  // Opening the player is itself a user gesture on the dashboard (clicking
  // "Watch Slideshow"), which satisfies browser autoplay-with-sound
  // policies. On the public share page there's no equivalent click before
  // the player mounts, so some browsers will block autoplay-with-sound
  // there regardless — the mute toggle lets the viewer start it manually.
  useEffect(() => {
    if (!musicTrackUrl) return
    audioRef.current?.play().catch(() => {
      /* autoplay blocked — viewer can still tap unmute/replay manually */
    })
    return () => {
      audioRef.current?.pause()
    }
  }, [musicTrackUrl])

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const photoUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/photos/${path}`

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      {musicTrackUrl && !musicUnavailable && (
        <audio
          ref={audioRef}
          src={musicTrackUrl}
          loop
          muted={muted}
          onError={() => setMusicUnavailable(true)}
        />
      )}
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="h-5 w-5 text-white" />
        </button>
      )}
      {musicTrackUrl && !musicUnavailable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMuted((m) => !m)
          }}
          className={`absolute top-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white ${onClose ? "right-16" : "right-4"}`}
          title={muted ? "Unmute music" : "Mute music"}
        >
          {muted ? "🔇" : "🎵"}
        </button>
      )}
      {photos.map((photo, i) => (
        <img
          key={photo.id}
          src={photoUrl(photo.storage_path)}
          alt=""
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out"
          style={{
            opacity: i === index ? 1 : 0,
            transform: i === index ? "scale(1.04)" : "scale(1)",
            transitionProperty: "opacity, transform",
            transitionDuration: `${Math.max(1500, intervalSeconds * 1000)}ms`,
          }}
        />
      ))}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
        {photos.map((p, i) => (
          <div key={p.id} className={`h-1 rounded-full transition-all ${i === index ? "w-6 bg-mauve" : "w-1.5 bg-white/30"}`} />
        ))}
      </div>
    </div>
  )
}
