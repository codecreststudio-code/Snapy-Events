"use client"

import { useState, useEffect, use } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
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
  Play,
  Volume2,
} from "lucide-react"
import type { Gallery, Photo } from "@/lib/types"
import { duration, easing, fadeInUp, staggerContainer } from "@/lib/motion/tokens"
import { useReducedMotion } from "@/lib/motion/use-reduced-motion"

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""

function getMediaUrl(path: string | null | undefined): string {
  if (!path) return "/placeholder.png"
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path
  return `${supabaseUrl}/storage/v1/object/public/photos/${path}`
}

function isVideo(photo: Photo) { return photo.mime_type?.startsWith("video/") }
function isAudio(photo: Photo) { return photo.mime_type?.startsWith("audio/") }

interface GallerySettings {
  allow_downloads: boolean
  enable_lightbox: boolean
}

function PhotoGrid({
  photos,
  allowDownloads,
  eventSlug,
}: {
  photos: Photo[]
  allowDownloads: boolean
  eventSlug: string
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

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
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from("photos")
        .createSignedUrl(photo.storage_path, 3600)

      if (error || !data?.signedUrl) {
        toast({ title: "Failed to download", variant: "destructive" })
        return
      }

      const response = await fetch(data.signedUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = blobUrl
      link.download = photo.original_filename || "photo.jpg"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast({ title: "Failed to download", variant: "destructive" })
    }
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e5dfd0] bg-[#ffffff] py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#faf6ed]/60">
          <ImageIcon className="h-8 w-8 text-[#8c8275]" />
        </div>
        <h3 className="font-playfair mt-4 font-medium text-[#1a1410]">No photos yet</h3>
        <p className="mt-2 text-sm text-[#6b6055] text-center max-w-md">
          Be the first to upload photos to this gallery!
        </p>
        <Button
          asChild
          className="mt-4 rounded-full bg-mauve text-[#1a1410] hover:bg-mauve-strong"
        >
          <Link href={`/event/${eventSlug}/upload`}>
            <Camera className="h-4 w-4" />
            Upload Photos
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <motion.div
        key={photos.map((p) => p.id).join(",")}
        className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4"
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        variants={staggerContainer()}
      >
        {photos.map((photo, index) => (
          <motion.button
            key={photo.id}
            variants={prefersReducedMotion ? undefined : fadeInUp}
            onClick={() => openLightbox(index)}
            className="relative aspect-square overflow-hidden rounded-lg bg-[#ffffff] group"
          >
             {photo.thumbnail_path || photo.storage_path ? (
              <>
                {isVideo(photo) || isAudio(photo) ? (
                  // Video/audio: keep img for thumbnails (dynamic signed URLs may not work with next/image)
                  <img
                    src={getMediaUrl(photo.thumbnail_path || photo.storage_path)}
                    alt={photo.original_filename || "Photo"}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <Image
                    src={getMediaUrl(photo.thumbnail_path || photo.storage_path)}
                    alt={photo.original_filename || "Photo"}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform group-hover:scale-105"
                    loading={index < 8 ? "eager" : "lazy"}
                    priority={index < 4}
                  />
                )}
                {isVideo(photo) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                )}
                {isAudio(photo) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                      <Volume2 className="h-5 w-5 text-white" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-[#8c8275]" />
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
                  aria-label="Download photo"
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
                aria-label="View full size"
                className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: duration.base, ease: easing.easeOut }}
          >
            <button
              onClick={closeLightbox}
              aria-label="Close lightbox"
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <button
              onClick={prevImage}
              aria-label="Previous photo"
              className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              onClick={nextImage}
              aria-label="Next photo"
              className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <motion.div
              key={currentIndex}
              className="max-w-5xl max-h-[90vh] flex items-center justify-center"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.94 }}
              transition={{ duration: duration.base, ease: easing.easeOut }}
            >
              {(() => {
                const p = photos[currentIndex]
                const url = getMediaUrl(p.storage_path)
                if (isVideo(p)) {
                  return (
                    <video
                      src={url}
                      controls
                      autoPlay
                      playsInline
                      className="max-w-full max-h-[90vh] rounded-lg"
                    >
                      Your browser does not support video playback.
                    </video>
                  )
                }
                if (isAudio(p)) {
                  return (
                    <div className="flex flex-col items-center gap-4 p-8">
                      <Volume2 className="h-16 w-16 text-white/60" />
                      <p className="text-white/70 text-sm">{p.original_filename || "Audio"}</p>
                      <audio src={url} controls autoPlay className="w-80 max-w-full">
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )
                }
                return (
                  <img
                    src={url}
                    alt={p.original_filename || "Photo"}
                    className="max-w-full max-h-[90vh] object-contain"
                  />
                )
              })()}
            </motion.div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <span className="text-white/70 text-sm">
                {currentIndex + 1} / {photos.length}
              </span>
              {allowDownloads && (
                <Button
                  size="sm"
                  className="rounded-full bg-mauve text-[#1a1410] hover:bg-mauve-strong"
                  onClick={() => downloadPhoto(photos[currentIndex])}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function GuestGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
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
    // This standalone gallery page had no live-refresh mechanism at all
    // (unlike the host dashboard, which polls every 3s + has a realtime
    // subscription) — a guest who stayed on this page while others
    // uploaded would never see new photos until navigating away and back.
    // A lighter poll than the host's is enough here since this is a
    // public page potentially open on many guests' devices at once.
    refetchInterval: 8000,
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
      <div className="min-h-screen flex items-center justify-center bg-[#faf6ed]">
        <Loader2 className="h-8 w-8 animate-spin text-mauve" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf6ed] text-[#1a1410]">
        <h1 className="font-playfair text-2xl font-medium mb-2">Gallery Not Found</h1>
        <p className="text-[#6b6055] mb-4">The gallery you're looking for doesn't exist.</p>
        <Button asChild className="rounded-full bg-mauve text-[#1a1410] hover:bg-mauve-strong">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf6ed] text-[#1a1410]">
      <header className="pt-safe sticky top-0 z-40 border-b border-[#e5dfd0] bg-[#faf6ed]/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <Link href={`/event/${slug}`} className="flex min-w-0 items-center gap-2">
            <ImageIcon className="h-5 w-5 shrink-0 text-mauve" />
            <span className="truncate font-playfair font-medium text-[#1a1410]">{event.name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {settings.allow_downloads && (
              <span className="text-xs text-[#7a7265] hidden sm:inline">
                Downloads enabled
              </span>
            )}
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="rounded-full text-[#1a1410] hover:bg-mauve/10 hover:text-mauve"
            >
              <Link href={`/event/${slug}/upload`}>
                <Camera className="h-4 w-4" />
                Upload
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-6">
        {visibleGalleries.length > 1 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {visibleGalleries.map((gallery) => (
              <button
                key={gallery.id}
                onClick={() => setSelectedGallery(gallery)}
                className={`relative px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedGallery?.id === gallery.id
                    ? "text-[#1a1410]"
                    : "text-[#6b6055] hover:text-[#1a1410]"
                }`}
              >
                {selectedGallery?.id === gallery.id && (
                  <motion.span
                    layoutId="gallery-tab-active-bg"
                    className="absolute inset-0 rounded-full bg-mauve"
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 500, damping: 30, mass: 0.5 }
                    }
                  />
                )}
                <span className="relative">{gallery.name}</span>
              </button>
            ))}
          </div>
        )}

        {selectedGallery && (
          <div>
            <div className="mb-4">
              <h1 className="font-playfair text-xl font-medium text-[#1a1410]">{selectedGallery.name}</h1>
              {selectedGallery.description && (
                <p className="text-sm text-[#6b6055]">{selectedGallery.description}</p>
              )}
            </div>

            {photosLoading ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg bg-ink/5" />
                ))}
              </div>
            ) : (
              <PhotoGrid photos={photos || []} allowDownloads={allowDownloads} eventSlug={slug} />
            )}
          </div>
        )}

        {visibleGalleries.length === 0 && (
          <Card className="border-[#e5dfd0] bg-[#ffffff]">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#faf6ed]/60">
                <ImageIcon className="h-8 w-8 text-[#8c8275]" />
              </div>
              <h3 className="font-playfair mt-4 font-medium text-[#1a1410]">Galleries Coming Soon</h3>
              <p className="mt-2 text-sm text-[#6b6055] text-center max-w-md">
                Photos will be available shortly. Check back soon!
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t border-[#e5dfd0] py-4">
        <div className="container mx-auto px-4 text-center text-xs text-[#7a7265]">
          Powered by{" "}
          <a href="/" className="underline hover:text-mauve-strong">
            Snapsy
          </a>
        </div>
      </footer>
    </div>
  )
}