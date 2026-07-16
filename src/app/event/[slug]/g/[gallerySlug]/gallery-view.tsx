"use client"

import { useState } from "react"
import Image from "next/image"
import { Card } from "@/lib/components/ui/card"
import { Play, Volume2, MessageCircle } from "lucide-react"
import { WatermarkOverlay } from "@/lib/components/media/watermark-overlay"
import { MediaLightbox, isVideo, isAudio, isMessage, type LightboxMedia } from "@/lib/components/media/media-lightbox"
import { toast } from "@/lib/components/ui/toaster"

type Photo = LightboxMedia & { storage_path: string; thumbnail_path: string | null }

function MediaThumbnail({ p, watermarkEnabled }: { p: Photo; watermarkEnabled: boolean }) {
  const reactions = p.metadata?.reactions || {}
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0)

  if (isMessage(p)) {
    return (
      <div className="aspect-square bg-gradient-to-br from-[#D4AF37]/10 to-[#3D332A]/40 p-4 flex flex-col justify-between border border-[#D4AF37]/20 rounded-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[#D4AF37]" />
          <span className="text-xs font-semibold text-[#D4AF37] truncate">{p.uploader_name || "Guest Wish"}</span>
        </div>
        <p className="font-playfair text-xs italic text-white/80 line-clamp-3 my-auto">"{p.metadata?.text || p.original_filename}"</p>
        <span className="text-[10px] text-white/40">Written Note</span>
      </div>
    )
  }

  if (isVideo(p)) {
    return (
      <div className="relative aspect-square w-full overflow-hidden bg-black/80">
        <img src={p.url ?? undefined} alt={p.original_filename} className="h-full w-full object-cover" loading="lazy" />
        {watermarkEnabled && <WatermarkOverlay />}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        {totalReactions > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>❤️</span> {totalReactions}
          </div>
        )}
      </div>
    )
  }

  if (isAudio(p)) {
    return (
      <div className="aspect-square bg-gradient-to-br from-[#D4AF37]/20 to-[#3D332A]/60 flex flex-col items-center justify-center p-3 gap-2 relative">
        <Volume2 className="h-10 w-10 text-[#D4AF37]" />
        <span className="text-xs text-white/80 font-medium line-clamp-1">{p.uploader_name || "Voice Note"}</span>
      </div>
    )
  }

  return p.url ? (
    <div className="relative aspect-square w-full overflow-hidden group">
      <Image
        src={p.url}
        alt={p.original_filename}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      {watermarkEnabled && <WatermarkOverlay />}
      {totalReactions > 0 && (
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
          <span>❤️</span> {totalReactions}
        </div>
      )}
    </div>
  ) : (
    <div className="aspect-square bg-gradient-to-br from-[#D4AF37]/20 to-[#3D332A]/60" />
  )
}

export function GalleryGallery({
  eventName,
  galleryName,
  galleryDescription,
  photos: initialPhotos,
  watermarkEnabled = false,
  voiceNoteDurationLimit = 10,
}: {
  eventName: string
  galleryName: string
  galleryDescription: string | null
  photos: Photo[]
  watermarkEnabled?: boolean
  voiceNoteDurationLimit?: number
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [active, setActive] = useState<Photo | null>(null)

  function closeLightbox() { setActive(null) }

  // Reverts a failed optimistic update back to the last known-good photo
  // list/active item. Used when the server rejects a reaction/comment so the
  // UI doesn't show something as "sent" that never actually got saved.
  function revertOptimistic(previousPhotos: Photo[], previousActive: Photo | null) {
    setPhotos(previousPhotos)
    if (previousActive) setActive(previousActive)
  }

  async function handleReact(photoId: string, emoji: string) {
    const previousPhotos = photos
    const previousActive = active

    // Optimistic UI update
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p
        const currentReactions = p.metadata?.reactions || {}
        const newReactions = { ...currentReactions, [emoji]: (currentReactions[emoji] || 0) + 1 }
        return {
          ...p,
          metadata: { ...p.metadata, reactions: newReactions },
        }
      })
    )

    if (active && active.id === photoId) {
      const currentReactions = active.metadata?.reactions || {}
      setActive({
        ...active,
        metadata: {
          ...active.metadata,
          reactions: { ...currentReactions, [emoji]: (currentReactions[emoji] || 0) + 1 },
        },
      })
    }

    try {
      const res = await fetch(`/api/photos/${photoId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      if (!res.ok) throw new Error(`Reaction request failed (${res.status})`)
    } catch (err) {
      console.error("Failed to save reaction", err)
      revertOptimistic(previousPhotos, previousActive)
      toast({ title: "Couldn't save your reaction", description: "Please check your connection and try again.", variant: "destructive" })
    }
  }

  async function handleComment(photoId: string, commentText: string, authorName: string) {
    const previousPhotos = photos
    const previousActive = active
    const newCommentObj = {
      id: Math.random().toString(36).substr(2, 9),
      author_name: authorName,
      comment: commentText,
      created_at: new Date().toISOString(),
    }

    // Optimistic UI update
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p
        const currentComments = p.metadata?.comments || []
        return {
          ...p,
          metadata: { ...p.metadata, comments: [newCommentObj, ...currentComments] },
        }
      })
    )

    if (active && active.id === photoId) {
      const currentComments = active.metadata?.comments || []
      setActive({
        ...active,
        metadata: {
          ...active.metadata,
          comments: [newCommentObj, ...currentComments],
        },
      })
    }

    try {
      const res = await fetch(`/api/photos/${photoId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentText, author_name: authorName }),
      })
      if (!res.ok) throw new Error(`Comment request failed (${res.status})`)
    } catch (err) {
      console.error("Failed to save comment", err)
      revertOptimistic(previousPhotos, previousActive)
      toast({ title: "Couldn't post your comment", description: "Please check your connection and try again.", variant: "destructive" })
    }
  }

  // Voice replies require an upload first, so — unlike the emoji/text
  // handlers above — this waits for the server response and applies the
  // canonical (server-merged) comments array instead of guessing locally.
  async function handleVoiceComment(photoId: string, file: File, authorName: string) {
    try {
      const fd = new FormData()
      fd.set("audio", file)
      fd.set("author_name", authorName)
      const res = await fetch(`/api/photos/${photoId}/react`, { method: "POST", body: fd })
      if (!res.ok) throw new Error(`Voice reply upload failed (${res.status})`)
      const { data } = await res.json()
      const newComments = data?.comments
      if (!newComments) throw new Error("Voice reply response missing comments")
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, metadata: { ...p.metadata, comments: newComments } } : p)))
      setActive((prev) => (prev && prev.id === photoId ? { ...prev, metadata: { ...prev.metadata, comments: newComments } } : prev))
    } catch (err) {
      console.error("Failed to save voice reply", err)
      toast({ title: "Couldn't save your voice reply", description: "Please check your connection and try again.", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-[#141110] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">{eventName}</p>
      <h1 className="font-playfair mt-1 text-3xl font-medium tracking-tight text-white">{galleryName}</h1>
      {galleryDescription && <p className="mt-2 text-sm text-white/60">{galleryDescription}</p>}
      <p className="mt-1 text-xs text-white/40">{photos.length} items</p>

      {photos.length === 0 ? (
        <Card className="mt-8 rounded-2xl border border-[#3D332A] bg-[#1C1814] p-8 text-center text-sm text-white/60">
          No photos or wishes yet — be the first to share!
        </Card>
      ) : (
        <div className="mt-6 columns-2 gap-4 sm:columns-3 lg:columns-4 space-y-4">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className="mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl border border-[#3D332A] bg-[#1C1814] shadow-sm hover:border-[#D4AF37]/40 hover:shadow-md transition-all text-left cursor-pointer"
            >
              <MediaThumbnail p={p} watermarkEnabled={watermarkEnabled} />
            </button>
          ))}
        </div>
      )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={closeLightbox}>
          <div className="relative max-h-full max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <MediaLightbox
              p={active}
              watermarkEnabled={watermarkEnabled}
              maxVoiceDuration={voiceNoteDurationLimit}
              onClose={closeLightbox}
              onReact={(emoji) => handleReact(active.id, emoji)}
              onComment={(text, author) => handleComment(active.id, text, author)}
              onVoiceComment={(file, author) => handleVoiceComment(active.id, file, author)}
            />
          </div>
        </div>
      )}
    </div>
  )
}