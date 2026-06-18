"use client"

import { useState, useRef, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { createClient as createUploadClient } from "@/lib/supabase/client"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Progress } from "@/lib/components/ui/progress"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { toast } from "@/lib/components/ui/toaster"
import {
  ArrowLeft,
  Camera,
  Check,
  Cloud,
  CloudUpload,
  Image,
  Loader2,
  Upload,
  X,
} from "lucide-react"
import type { Gallery, Event } from "@/lib/types"

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
    .eq("settings->allow_uploads", true)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

interface UploadFile {
  id: string
  file: File
  preview: string
  progress: number
  status: "pending" | "uploading" | "done" | "error"
  error?: string
}

interface EventSettings {
  allow_guest_uploads: boolean
  auto_approve_photos: boolean
}

export default function GuestUploadPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [selectedGallery, setSelectedGallery] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", params.slug],
    queryFn: () => getEvent(params.slug),
  })

  const { data: galleries, isLoading: galleriesLoading } = useQuery({
    queryKey: ["galleries", event?.id],
    queryFn: () => getGalleries(event!.id),
    enabled: !!event?.id,
  })

  const settings = (event?.settings || {}) as EventSettings

  const uploadGalleries = galleries?.filter((g) => {
    const gallerySettings = g.settings as { allow_uploads?: boolean }
    return gallerySettings?.allow_uploads !== false
  }) || []

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "pending" as const,
    }))

    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  function removeFile(id: string) {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  async function uploadFiles() {
    if (files.length === 0 || !selectedGallery) return

    setIsUploading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    for (const uploadFile of files) {
      if (uploadFile.status === "done") continue

      try {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "uploading" as const } : f
          )
        )

        const filename = `${Date.now()}-${uploadFile.file.name}`
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filename, uploadFile.file, {
            contentType: uploadFile.file.type,
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { data: publicUrl } = supabase.storage
          .from("photos")
          .getPublicUrl(filename)

        const photoData = {
          gallery_id: selectedGallery,
          event_id: event!.id,
          uploader_id: user?.id || null,
          storage_path: filename,
          thumbnail_path: null,
          original_filename: uploadFile.file.name,
          mime_type: uploadFile.file.type,
          file_size: uploadFile.file.size,
          width: null,
          height: null,
          metadata: {},
          is_approved: settings.auto_approve_photos,
          is_featured: false,
          face_count: 0,
          download_count: 0,
        }

        const { error: dbError } = await supabase.from("photos").insert(photoData)

        if (dbError) throw dbError

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, progress: 100, status: "done" as const }
              : f
          )
        )
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "error" as const, error: (err as Error).message }
              : f
          )
        )
      }
    }

    setIsUploading(false)

    const successCount = files.filter((f) => f.status === "done").length
    const errorCount = files.filter((f) => f.status === "error").length

    if (errorCount === 0) {
      toast({
        title: "Upload Complete",
        description: `${successCount} photo(s) uploaded successfully`,
      })
    } else {
      toast({
        title: "Upload Complete",
        description: `${successCount} uploaded, ${errorCount} failed`,
        variant: "destructive",
      })
    }
  }

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
        <h1 className="text-2xl font-semibold mb-2">Event Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The event you're looking for doesn't exist or uploads are disabled.
        </p>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    )
  }

  if (!settings.allow_guest_uploads) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Camera className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Uploads Disabled</h1>
        <p className="text-muted-foreground mb-4 text-center max-w-md">
          This event is not accepting photo uploads at the moment.
        </p>
        <Button asChild variant="outline">
          <Link href={`/event/${params.slug}`}>Back to Event</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link
            href={`/event/${params.slug}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Event</span>
          </Link>
          <span className="font-semibold">Upload Photos</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex-1 container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-muted-foreground">Upload photos to share with other guests</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Gallery</label>
                <select
                  value={selectedGallery}
                  onChange={(e) => setSelectedGallery(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Choose a gallery...</option>
                  {uploadGalleries.map((gallery) => (
                    <option key={gallery.id} value={gallery.id}>
                      {gallery.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            e.currentTarget.classList.add("border-primary")
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove("border-primary")
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.classList.remove("border-primary")
            handleFileSelect(e.dataTransfer.files)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <CloudUpload className="h-12 w-12" />
            <p className="text-lg font-medium">Click to upload or drag and drop</p>
            <p className="text-sm">PNG, JPG, WEBP, HEIC up to 50MB</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">
                {files.length} file(s) selected
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.preview))
                  setFiles([])
                }}
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-full h-full object-cover"
                  />
                  {file.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                  {file.status === "done" && (
                    <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center">
                      <Check className="h-8 w-8 text-white" />
                    </div>
                  )}
                  {file.status === "error" && (
                    <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                      <X className="h-8 w-8 text-white" />
                    </div>
                  )}
                  {file.status !== "done" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(file.id)
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4">
              <Button
                onClick={uploadFiles}
                disabled={!selectedGallery || isUploading || files.length === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4" />
                    Upload {files.length} Photo(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-2">Upload Guidelines</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Photos will be reviewed before appearing in the gallery</li>
              <li>• Please only upload photos from the event</li>
              <li>• Ensure you have permission from people in your photos</li>
              <li>• High-quality photos are encouraged</li>
            </ul>
          </CardContent>
        </Card>
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