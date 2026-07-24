"use client"

import { MediaGrid, type GridPhoto } from "@/lib/components/media/media-grid"

export function GalleryGallery({
  eventName,
  galleryName,
  galleryDescription,
  photos,
  watermarkEnabled = false,
  voiceNoteDurationLimit = 10,
}: {
  eventName: string
  galleryName: string
  galleryDescription: string | null
  photos: GridPhoto[]
  watermarkEnabled?: boolean
  voiceNoteDurationLimit?: number
}) {
  return (
    <div className="min-h-screen bg-[#faf6ed] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-mauve">{eventName}</p>
        <h1 className="font-playfair mt-1 text-3xl font-medium tracking-tight text-[#1a1410]">{galleryName}</h1>
        {galleryDescription && <p className="mt-2 text-sm text-[#6b6055]">{galleryDescription}</p>}
        <p className="mt-1 text-xs text-[#7a7265]">{photos.length} items</p>

        <MediaGrid
          photos={photos}
          watermarkEnabled={watermarkEnabled}
          voiceNoteDurationLimit={voiceNoteDurationLimit}
        />
      </div>
    </div>
  )
}
