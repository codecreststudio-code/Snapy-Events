"use client"

import { useState } from "react"
import Image from "next/image"
import { Card } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Play, Volume2, X, Download, Heart, Flame, PartyPopper, ThumbsUp, Smile, Send, MessageCircle } from "lucide-react"
import { WatermarkOverlay } from "@/lib/components/media/watermark-overlay"

type Photo = {
  id: string
  storage_path: string
  thumbnail_path: string | null
  original_filename: string
  uploader_name: string | null
  mime_type: string | null
  created_at: string
  url: string | null
  metadata?: {
    reactions?: Record<string, number>
    comments?: Array<{ id: string; author_name: string; comment: string; created_at: string }>
    text?: string
    is_message?: boolean
  }
}

const EMOJI_LIST = [
  { key: "heart", symbol: "❤️", icon: Heart, label: "Love" },
  { key: "fire", symbol: "🔥", icon: Flame, label: "Fire" },
  { key: "party", symbol: "🎉", icon: PartyPopper, label: "Party" },
  { key: "clap", symbol: "👏", icon: ThumbsUp, label: "Clap" },
  { key: "adore", symbol: "😍", icon: Smile, label: "Adore" },
]

function isVideo(p: Photo) { return p.mime_type?.startsWith("video/") }
function isAudio(p: Photo) { return p.mime_type?.startsWith("audio/") }
function isMessage(p: Photo) { return p.mime_type === "text/plain" || p.metadata?.is_message === true }

function MediaThumbnail({ p, watermarkEnabled }: { p: Photo; watermarkEnabled: boolean }) {
  const reactions = p.metadata?.reactions || {}
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0)

  if (isMessage(p)) {
    return (
      <div className="aspect-square bg-gradient-to-br from-amber-500/10 to-amber-700/20 p-4 flex flex-col justify-between border border-amber-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-semibold text-amber-600 truncate">{p.uploader_name || "Guest Wish"}</span>
        </div>
        <p className="text-xs italic text-stone-700 line-clamp-3 my-auto font-serif">"{p.metadata?.text || p.original_filename}"</p>
        <span className="text-[10px] text-stone-400">Written Note</span>
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
      <div className="aspect-square bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex flex-col items-center justify-center p-3 gap-2 relative">
        <Volume2 className="h-10 w-10 text-amber-500" />
        <span className="text-xs text-stone-700 font-medium line-clamp-1">{p.uploader_name || "Voice Note"}</span>
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
    <div className="aspect-square bg-gradient-to-br from-amber-500/20 to-fuchsia-500/20" />
  )
}

function MediaLightbox({
  p,
  watermarkEnabled,
  onClose,
  onReact,
  onComment,
}: {
  p: Photo
  watermarkEnabled: boolean
  onClose: () => void
  onReact: (emoji: string) => void
  onComment: (commentText: string, authorName: string) => void
}) {
  const [commentInput, setCommentInput] = useState("")
  const [nameInput, setNameInput] = useState("")
  const canDownload = !isMessage(p)

  function handleDownload() {
    window.open(`/api/photos/${p.id}/download`, "_blank")
  }

  const reactions = p.metadata?.reactions || {}
  const comments = p.metadata?.comments || []

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim()) return
    onComment(commentInput, nameInput.trim() || "Guest")
    setCommentInput("")
  }

  return (
    <div className="bg-[#1C1814] border border-[#3D332A] rounded-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] w-full max-w-4xl shadow-2xl">
      {/* Media Content Box */}
      <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[480px] p-2 relative">
        {isMessage(p) ? (
          <div className="p-8 text-center max-w-md space-y-4">
            <MessageCircle className="h-12 w-12 text-[#D4AF37] mx-auto" />
            <p className="text-xl font-serif italic text-white/90">"{p.metadata?.text || p.original_filename}"</p>
            <p className="text-xs text-[#D4AF37] font-semibold">Wish by {p.uploader_name || "Guest"}</p>
          </div>
        ) : isVideo(p) && p.url ? (
          <div className="relative max-h-[75vh] w-auto">
            <video src={p.url} controls autoPlay playsInline className="max-h-[75vh] w-auto rounded-lg">
              Your browser does not support video playback.
            </video>
            {watermarkEnabled && <WatermarkOverlay dense />}
          </div>
        ) : isAudio(p) && p.url ? (
          <div className="flex flex-col items-center gap-4 p-8">
            <Volume2 className="h-16 w-16 text-[#D4AF37]" />
            <p className="text-white/80 font-medium">{p.uploader_name ? `Voice note from ${p.uploader_name}` : p.original_filename}</p>
            <audio src={p.url} controls autoPlay className="w-80 max-w-full">
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : p.url ? (
          <div className="relative max-h-[75vh] w-auto">
            <img src={p.url} alt={p.original_filename} className="max-h-[75vh] w-auto object-contain rounded-lg" />
            {watermarkEnabled && <WatermarkOverlay dense />}
          </div>
        ) : (
          <div className="aspect-square bg-gradient-to-br from-amber-500/20 to-fuchsia-500/20" />
        )}
      </div>

      {/* Side Panel: Reactions & Comments */}
      <div className="w-full md:w-80 bg-[#1C1814] border-t md:border-t-0 md:border-l border-[#3D332A] flex flex-col justify-between p-4 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3D332A] pb-3">
          <div>
            <p className="text-xs font-semibold text-[#D4AF37]">{p.uploader_name || "Event Guest"}</p>
            <p className="text-[10px] text-white/40">{new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div className="flex items-center gap-1">
            {canDownload && (
              <Button variant="ghost" size="icon" onClick={handleDownload} title="Download" className="text-white/60 hover:text-white rounded-full">
                <Download className="h-4.5 w-4.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Emoji Reactions Bar */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">Reactions</p>
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2">
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
                  <span className="text-[10px] font-bold text-white/70 group-hover:text-[#D4AF37]">{count > 0 ? count : ""}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Comments Feed */}
        <div className="flex-1 overflow-y-auto max-h-48 space-y-2.5 pr-1 no-scrollbar my-2">
          <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">Wishes & Comments ({comments.length})</p>
          {comments.length === 0 ? (
            <p className="text-xs text-white/40 italic">No comments yet. Be the first to leave a wish!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-2.5 space-y-0.5">
                <p className="text-[11px] font-semibold text-white/90">{c.author_name}</p>
                <p className="text-xs text-white/70 font-light">{c.comment}</p>
              </div>
            ))
          )}
        </div>

        {/* Comment Input Form */}
        <form onSubmit={handleSendComment} className="space-y-2 pt-2 border-t border-[#3D332A]">
          <Input
            placeholder="Your Name (optional)"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-8 text-xs focus:border-[#D4AF37]"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Write a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9 text-xs focus:border-[#D4AF37] flex-1"
            />
            <Button type="submit" size="icon" className="bg-[#D4AF37] hover:bg-[#B3922E] text-black h-9 w-9 shrink-0 rounded-lg">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function GalleryGallery({
  eventName,
  galleryName,
  galleryDescription,
  photos: initialPhotos,
  watermarkEnabled = false,
}: {
  eventName: string
  galleryName: string
  galleryDescription: string | null
  photos: Photo[]
  watermarkEnabled?: boolean
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [active, setActive] = useState<Photo | null>(null)

  function closeLightbox() { setActive(null) }

  async function handleReact(photoId: string, emoji: string) {
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
      await fetch(`/api/photos/${photoId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
    } catch (err) {
      console.error("Failed to save reaction", err)
    }
  }

  async function handleComment(photoId: string, commentText: string, authorName: string) {
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
      await fetch(`/api/photos/${photoId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentText, author_name: authorName }),
      })
    } catch (err) {
      console.error("Failed to save comment", err)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#A58263]">{eventName}</p>
      <h1 className="mt-1 text-3xl font-serif font-semibold tracking-tight text-[#1C1A17]">{galleryName}</h1>
      {galleryDescription && <p className="mt-2 text-sm text-[#7D756D]">{galleryDescription}</p>}
      <p className="mt-1 text-xs text-[#9C958E]">{photos.length} items</p>

      {photos.length === 0 ? (
        <Card className="mt-8 p-8 text-center text-sm text-[#9C958E] bg-[#FAF8F5] border-[#EAE5DF]">
          No photos or wishes yet — be the first to share!
        </Card>
      ) : (
        <div className="mt-6 columns-2 gap-4 md:columns-3 lg:columns-4 space-y-4">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className="mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl border border-[#EAE5DF] bg-[#FAF8F5] shadow-sm hover:shadow-md transition-all text-left cursor-pointer"
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
              onClose={closeLightbox}
              onReact={(emoji) => handleReact(active.id, emoji)}
              onComment={(text, author) => handleComment(active.id, text, author)}
            />
          </div>
        </div>
      )}
    </div>
  )
}