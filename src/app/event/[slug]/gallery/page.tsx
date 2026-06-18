"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { toast } from "@/lib/components/ui/toaster"
import {
  Download,
  Image as ImageIcon,
  Loader2,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Camera,
} from "lucide-react"
import type { Gallery, Photo } from "@/lib/types"

async function getEvent(slug: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id, name, slug, settings")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (error) throw error
  return data
}

async function getGalleries(eventId: string): Promise<Gallery[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

async function getPhotos(galleryId: string): Promise<Photo[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("gallery_id", galleryId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

interface GallerySettings {
  allow_downloads: boolean
  enable_lightbox: boolean
}

function PhotoGrid({
  photos,
  allowDownloads,
}: {
  photos: Photo[]
  allowDownloads: boolean
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [lightboxOpen])

  function openLightbox(index: number) {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  function closeLightbox() {
    setLightboxOpen(false)
  }

  function nextImage() {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }

  function prevImage() {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  async function downloadPhoto(photo: Photo) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from("photos")
      .createSignedUrl(photo.storage_path, 3600)

    if (error || !data?.signedUrl) {
      toast({ title: "Failed to download", variant: "destructive" })
      return
    }

    const link = document.createElement("a")
    link.href = data.signedUrl
    link.download = photo.original_filename || "photo.jpg"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!lightboxOpen) return
      if (e.key === "Escape") closeLightbox()
      if (e.key === "ArrowRight") nextImage()
      if (e.key === "ArrowLeft") prevImage()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lightboxOpen])

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">No photos yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Be the first to upload photos to this gallery!
        </p>
        <Button asChild className="mt-4">
          <Link href={`/upload`}>
            <Camera className="h-4 w-4" />
            Upload Photos
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => openLightbox(index)}
            className="relative aspect-square overflow-hidden rounded-lg bg-muted group"
          >
            {photo.thumbnail_path || photo.storage_path ? (
              <img
                src={photo.storage_path}
                alt={photo.original_filename || "Photo"}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {allowDownloads && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadPhoto(photo)
                  }}
                  className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openLightbox(index)
                }}
                className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={nextImage}
            className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="max-w-5xl max-h-[90vh]">
            <img
              src={photos[currentIndex].storage_path}
              alt={photos[currentIndex].original_filename || "Photo"}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <span className="text-white/70 text-sm">
              {currentIndex + 1} / {photos.length}
            </span>
            {allowDownloads && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => downloadPhoto(photos[currentIndex])}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function GuestGalleryPage({ params }: { params: { slug: string } }) {
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null)

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", params.slug],
    queryFn: () => getEvent(params.slug),
  })

  const { data: galleries, isLoading: galleriesLoading } = useQuery({
    queryKey: ["galleries", event?.id],
    queryFn: () => getGalleries(event!.id),
    enabled: !!event?.id,
  })

  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ["photos", selectedGallery?.id],
    queryFn: () => getPhotos(selectedGallery!.id),
    enabled: !!selectedGallery?.id,
  })

  const settings = (event?.settings || {}) as GallerySettings
  const allowDownloads = settings.allow_downloads ?? true

  const visibleGalleries = galleries?.filter((g) => {
    if (!g.reveal_enabled) return true
    return g.reveal_at && new Date(g.reveal_at) <= new Date()
  }) || []

  useEffect(() => {
    if (visibleGalleries.length > 0 && !selectedGallery) {
      setSelectedGallery(visibleGalleries[0])
    }
  }, [visibleGalleries, selectedGallery])

  if (eventLoading || galleriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold mb-2">Gallery Not Found</h1>
        <p className="text-muted-foreground mb-4">The gallery you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link href={`/event/${params.slug}`} className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            <span className="font-semibold">{event.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            {settings.allow_downloads && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Downloads enabled
              </span>
            )}
            <Button asChild size="sm" variant="ghost">
              <Link href={`/event/${params.slug}/upload`}>
                <Camera className="h-4 w-4" />
                Upload
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6">
        {visibleGalleries.length > 1 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {visibleGalleries.map((gallery) => (
              <button
                key={gallery.id}
                onClick={() => setSelectedGallery(gallery)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedGallery?.id === gallery.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {gallery.name}
              </button>
            ))}
          </div>
        )}

        {selectedGallery && (
          <div>
            <div className="mb-4">
              <h1 className="text-xl font-semibold">{selectedGallery.name}</h1>
              {selectedGallery.description && (
                <p className="text-sm text-muted-foreground">{selectedGallery.description}</p>
              )}
            </div>

            {photosLoading ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : (
              <PhotoGrid photos={photos || []} allowDownloads={allowDownloads} />
            )}
          </div>
        )}

        {visibleGalleries.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Galleries Coming Soon</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Photos will be available shortly. Check back soon!
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t py-4">
        <div className="container text-center text-xs text-muted-foreground">
          Powered by{" "}
          <a href="/" className="underline hover:text-foreground">
            Snapsy
          </a>
        </div>
      </footer>
    </div>
  )
}