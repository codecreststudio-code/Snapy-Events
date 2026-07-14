"use client"

import { useState } from "react"
import Image from "next/image"
import { Card } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Play, Volume2, X, Download } from "lucide-react"

type Photo = { id: string; storage_path: string; thumbnail_path: string | null; original_filename: string; uploader_name: string | null; mime_type: string | null; created_at: string; url: string | null }

function isVideo(p: Photo) { return p.mime_type?.startsWith("video/") }
function isAudio(p: Photo) { return p.mime_type?.startsWith("audio/") }


function MediaThumbnail({ p }: { p: Photo }) {
  if (isVideo(p)) {
    return (
      <div className="relative">
        <img src={p.url ?? undefined} alt={p.original_filename} className="h-auto w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>
    )
  }
  if (isAudio(p)) {
    return (
      <div className="aspect-square bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
        <Volume2 className="h-10 w-10 text-muted-foreground" />
      </div>
    )
  }
  return p.url ? (
    <div className="relative aspect-square w-full overflow-hidden">
      <Image
        src={p.url}
        alt={p.original_filename}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover"
        loading="lazy"
      />
    </div>
  ) : (
    <div className="aspect-square bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20" />
  )
}

function MediaLightbox({ p, onClose }: { p: Photo; onClose: () => void }) {
  if (isVideo(p) && p.url) {
    return (
      <video src={p.url} controls autoPlay playsInline className="max-h-[85vh] rounded-lg">
        Your browser does not support video playback.
      </video>
    )
  }
  if (isAudio(p) && p.url) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <Volume2 className="h-16 w-16 text-white/60" />
        <p className="text-white/70 text-sm">{p.original_filename || "Audio"}</p>
        <audio src={p.url} controls autoPlay className="w-80 max-w-full">
          Your browser does not support audio playback.
        </audio>
      </div>
    )
  }
  return p.url
    ? <img src={p.url} alt={p.original_filename} className="max-h-[85vh] rounded-lg" />
    : <div className="aspect-square bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20" />
}

export function GalleryGallery({ eventName, galleryName, galleryDescription, photos }: { eventName: string; galleryName: string; galleryDescription: string | null; photos: Photo[] }) {
  const [active, setActive] = useState<Photo | null>(null)

  function closeLightbox() { setActive(null) }

  async function downloadPhoto(url: string, filename: string) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, "_blank")
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm text-muted-foreground">{eventName}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{galleryName}</h1>
      {galleryDescription && <p className="mt-2 text-muted-foreground">{galleryDescription}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{photos.length} items</p>
      {photos.length === 0 ? (
        <Card className="mt-8 p-8 text-center text-sm text-muted-foreground">No photos yet — be the first to upload!</Card>
      ) : (
        <div className="mt-6 columns-2 gap-3 md:columns-3 lg:columns-4">
          {photos.map((p) => (
            <button key={p.id} onClick={() => setActive(p)} className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-lg border bg-muted">
              <MediaThumbnail p={p} />
            </button>
          ))}
        </div>
      )}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={closeLightbox}>
          <div className="relative max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <MediaLightbox p={active} onClose={closeLightbox} />
            {(isVideo(active) || !isAudio(active)) && (
              <Button
                className="absolute right-2 top-2"
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  if (active.url) {
                    downloadPhoto(active.url, active.original_filename || "media.jpg")
                  }
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={(e) => {
                e.stopPropagation()
                setActive(null)
              }}
              className="absolute left-2 top-2"
              size="icon"
              variant="secondary"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}