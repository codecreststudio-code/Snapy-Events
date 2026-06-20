"use client"

import { useState } from "react"
import { Card } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { X, Download } from "lucide-react"

type Photo = { id: string; storage_path: string; original_filename: string; uploader_name: string | null; created_at: string; url: string | null }

export function GalleryGallery({ eventName, galleryName, galleryDescription, photos }: { eventName: string; galleryName: string; galleryDescription: string | null; photos: Photo[] }) {
  const [active, setActive] = useState<Photo | null>(null)

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
      <p className="mt-1 text-xs text-muted-foreground">{photos.length} photos</p>
      {photos.length === 0 ? (
        <Card className="mt-8 p-8 text-center text-sm text-muted-foreground">No photos yet — be the first to upload!</Card>
      ) : (
        <div className="mt-6 columns-2 gap-3 md:columns-3 lg:columns-4">
          {photos.map((p) => (
            <button key={p.id} onClick={() => setActive(p)} className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-lg border bg-muted">
              {p.url ? <img src={p.url} alt={p.original_filename} className="h-auto w-full object-cover" loading="lazy" /> : <div className="aspect-square bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20" />}
            </button>
          ))}
        </div>
      )}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setActive(null)}>
          <div className="relative max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {active.url && <img src={active.url} alt={active.original_filename} className="max-h-[85vh] rounded-lg" />}
            <Button
              className="absolute right-2 top-2"
              size="icon"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                if (active.url) {
                  downloadPhoto(active.url, active.original_filename || "photo.jpg")
                }
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
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
