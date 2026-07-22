"use client"

// Shared photo/video/voice-note grid + lightbox. Extracted out of
// src/app/event/[slug]/g/[gallerySlug]/gallery-view.tsx so the same grid can
// be embedded directly on the main public event page (src/app/event/[slug]/
// page.tsx) — previously guests had to click through to a separate
// /g/[gallerySlug] page just to see a single gallery's contents, which was an
// extra hop for events that only ever have one "All Photos" gallery. The
// standalone gallery page still exists (for direct/shared links and events
// with multiple galleries) and now just renders this same component.
import { useState } from "react"
import Image from "next/image"
import { Card } from "@/lib/components/ui/card"
import { Play, Volume2, MessageCircle } from "lucide-react"
import { WatermarkOverlay } from "@/lib/components/media/watermark-overlay"
import { MediaLightbox, isVideo, isAudio, isMessage, type LightboxMedia } from "@/lib/components/media/media-lightbox"
import { toast } from "@/lib/components/ui/toaster"

export type GridPhoto = LightboxMedia & { storage_path: string; thumbnail_path: string | null }

function MediaThumbnail({ p, watermarkEnabled }: { p: GridPhoto; watermarkEnabled: boolean }) {
  const reactions = p.metadata?.reactions || {}
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0)

  if (isMessage(p)) {
    return (
      <div className="aspect-square bg-gradient-to-br from-[#B28DAE]/10 to-[#3D332A]/40 p-4 flex flex-col justify-between border border-[#B28DAE]/20 rounded-lg">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-4 w-4 shrink-0 text-[#B28DAE]" />
          <span className="min-w-0 truncate text-xs font-semibold text-[#B28DAE]">{p.uploader_name || "Guest Wish"}</span>
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
      <div className="aspect-square bg-gradient-to-br from-[#B28DAE]/20 to-[#3D332A]/60 flex flex-col items-center justify-center p-3 gap-2 relative">
        <Volume2 className="h-10 w-10 text-[#B28DAE]" />
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
      {p.is_best_shot && (
        <div className="absolute top-2 left-2 bg-[#B28DAE]/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
          <span>✨</span> Highlight
        </div>
      )}
      {p.tags && p.tags.length > 0 && (
        <div className="absolute bottom-2 right-2 flex flex-wrap gap-1 justify-end max-w-[80%]">
          {p.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="bg-black/60 backdrop-blur-md text-white/90 text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize">
              {tag}
            </span>
          ))}
        </div>
      )}
      {totalReactions > 0 && (
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
          <span>❤️</span> {totalReactions}
        </div>
      )}
    </div>
  ) : (
    <div className="aspect-square bg-gradient-to-br from-[#B28DAE]/20 to-[#3D332A]/60" />
  )
}

export function MediaGrid({
  photos: initialPhotos,
  watermarkEnabled = false,
  voiceNoteDurationLimit = 10,
  emptyMessage = "No photos or wishes yet — be the first to share!",
}: {
  photos: GridPhoto[]
  watermarkEnabled?: boolean
  voiceNoteDurationLimit?: number
  emptyMessage?: string
}) {
  const [photos, setPhotos] = useState<GridPhoto[]>(initialPhotos)
  const [active, setActive] = useState<GridPhoto | null>(null)

  function closeLightbox() { setActive(null) }

  // Derived from the live `photos` array (rather than a separately-tracked
  // index) so it stays correct after optimistic reaction/comment updates,
  // which replace items in place without reordering the array.
  const activeIndex = active ? photos.findIndex((p) => p.id === active.id) : -1
  const hasPrev = activeIndex > 0
  const hasNext = activeIndex >= 0 && activeIndex < photos.length - 1
  function goToPrev() { if (hasPrev) setActive(photos[activeIndex - 1]) }
  function goToNext() { if (hasNext) setActive(photos[activeIndex + 1]) }

  // Reverts a failed optimistic update back to the last known-good photo
  // list/active item. Used when the server rejects a reaction/comment so the
  // UI doesn't show something as "sent" that never actually got saved.
  function revertOptimistic(previousPhotos: GridPhoto[], previousActive: GridPhoto | null) {
    setPhotos(previousPhotos)
    if (previousActive) setActive(previousActive)
  }

  async function handleReact(photoId: string, emoji: string) {
    const previousPhotos = photos
    const previousActive = active

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
    <>
      {photos.length === 0 ? (
        <Card className="mt-6 rounded-2xl border border-[#3D332A] bg-[#1C1814] p-8 text-center text-sm text-white/60">
          {emptyMessage}
        </Card>
      ) : (
        <div className="mt-6 columns-2 gap-4 sm:columns-3 lg:columns-4 space-y-4">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className="mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl border border-[#3D332A] bg-[#1C1814] shadow-sm hover:border-[#B28DAE]/40 hover:shadow-md transition-all text-left cursor-pointer"
            >
              <MediaThumbnail p={p} watermarkEnabled={watermarkEnabled} />
            </button>
          ))}
        </div>
      )}

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
              onPrev={goToPrev}
              onNext={goToNext}
              hasPrev={hasPrev}
              hasNext={hasNext}
            />
          </div>
        </div>
      )}
    </>
  )
}
