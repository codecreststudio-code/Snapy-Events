"use client"

import { useState, useEffect, useRef, useCallback, use } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { CameraCapture } from "@/lib/components/events/camera-capture"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"

import {
  ArrowLeft,
  Camera,
  Check,
  Cloud,
  CloudUpload,
  Loader2,
  X,
  AlertTriangle,
  Camera as CameraIcon,
  Image as ImageIcon,
} from "lucide-react"
import type { Gallery } from "@/lib/types"

async function getEvent(slug: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id, name, slug, settings, host_id, organization_id, end_date, organization:organizations(plan, settings)")
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

interface UploadFile {
  id: string
  file: File
  preview: string
  progress: number
  status: "pending" | "uploading" | "done" | "error" | "idle"
  error?: string
}

interface EventSettings {
  allow_guest_uploads: boolean
  auto_approve_photos: boolean
}

export default function GuestUploadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [selectedGallery, setSelectedGallery] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [limitError, setLimitError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
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

  useEffect(() => {
    if (uploadGalleries.length > 0 && !selectedGallery) {
      setSelectedGallery(uploadGalleries[0].id)
    }
  }, [uploadGalleries, selectedGallery])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("snapsy_last_guest_name")
      const storedEmail = localStorage.getItem("snapsy_last_guest_email")
      if (storedName) setGuestName(storedName)
      if (storedEmail) setGuestEmail(storedEmail)
    }
  }, [])

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

  const handleCameraCapture = useCallback((file: File) => {
    setFiles((prev) => {
      const newUpload: UploadFile = {
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: "pending" as const,
      }
      return [...prev, newUpload]
    })
    setShowCamera(false)
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
    if (files.length === 0 || !selectedGallery || !event) return
    setLimitError(null)

    // Validations: require a name to upload
    const cleanName = guestName.trim()
    const cleanEmail = guestEmail.trim().toLowerCase()
    
    if (!cleanName) {
      toast({
        title: "Name Required",
        description: "Please enter your name so the host knows who uploaded the photos.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    const supabase = createClient()

    try {
      // 1. Quota checks
      const userPlan = (event.organization as any)?.plan || "free"
      const orgSettings = (event.organization as any)?.settings || {}
      
      const { data: planData } = await supabase.from("plans").select("limits").eq("id", userPlan).single()
      const planLimits = planData?.limits || {}
      
      const guestBoost = orgSettings.guest_boost || 0
      const shotsBoost = orgSettings.shots_boost || 0

      // Default to Infinity if the limit isn't explicitly defined for guests/shots
      const maxGuests = planLimits.guests_limit !== undefined ? planLimits.guests_limit + guestBoost : Infinity
      const maxShots = planLimits.shots_limit !== undefined ? planLimits.shots_limit + shotsBoost : Infinity

      // Fetch uploads list to calculate current usage
      const { data: currentUploads, error: uploadsErr } = await supabase
        .from("photos")
        .select("uploader_email, uploader_name")
        .eq("event_id", event.id)

      if (uploadsErr) throw uploadsErr

      const uniqueGuests = new Set(
        (currentUploads || [])
          .map((p) => p.uploader_email?.toLowerCase() || p.uploader_name?.toLowerCase())
          .filter(Boolean)
      )

      const guestIdentifier = cleanEmail || cleanName.toLowerCase()
      const isNewGuest = !uniqueGuests.has(guestIdentifier)

      // A: Guest limit check
      if (isNewGuest && uniqueGuests.size >= maxGuests) {
        setLimitError(`This event has reached its limit of ${maxGuests} guests. The host needs to upgrade their plan to accept more guest uploads.`)
        setIsUploading(false)
        return
      }

      // B: Shots limit check
      const currentGuestShotsCount = (currentUploads || []).filter(
        (p) => (p.uploader_email?.toLowerCase() === guestIdentifier || p.uploader_name?.toLowerCase() === guestIdentifier)
      ).length

      if (currentGuestShotsCount + files.length > maxShots) {
        setLimitError(`You can upload at most ${maxShots} photos. You have already uploaded ${currentGuestShotsCount} photos, and are trying to upload ${files.length} more.`)
        setIsUploading(false)
        return
      }

      // 2. Perform uploads
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

          const photoData = {
            gallery_id: selectedGallery,
            event_id: event.id,
            uploader_id: user?.id || null,
            uploader_name: cleanName,
            uploader_email: cleanEmail || null,
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
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "An unexpected error occurred during upload.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }

    const successCount = files.filter((f) => f.status === "done").length
    const errorCount = files.filter((f) => f.status === "error").length

    if (successCount > 0 && errorCount === 0) {
      toast({
        title: "Upload Complete",
        description: `${successCount} photo(s) uploaded successfully!`,
      })
    } else if (errorCount > 0) {
      toast({
        title: "Upload Complete with errors",
        description: `${successCount} uploaded, ${errorCount} failed`,
        variant: "destructive",
      })
    }
  }

  if (eventLoading || galleriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F7F5] text-[#1C1A17]">
        <h1 className="text-2xl font-semibold mb-2">Event Not Found</h1>
        <p className="text-[#9C958E] mb-4">
          The event you're looking for doesn't exist or uploads are disabled.
        </p>
        <Button asChild className="bg-[#9333EA] hover:bg-[#7E22CE] text-white font-bold">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    )
  }

  if (!settings.allow_guest_uploads) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F7F5] text-[#1C1A17]">
        <CameraIcon className="h-12 w-12 text-[#9C958E] mb-4 animate-bounce" />
        <h1 className="text-2xl font-semibold mb-2">Uploads Disabled</h1>
        <p className="text-[#9C958E] mb-4 text-center max-w-md">
          This event is not accepting photo uploads at the moment.
        </p>
        <Button asChild variant="outline" className="border-[#EAE5DF] hover:bg-stone-50">
          <Link href={`/event/${slug}`}>Back to Event</Link>
        </Button>
      </div>
    )
  }

  const isExpired = event.end_date && new Date(event.end_date) < new Date()

  if (isExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F7F5] text-[#1C1A17]">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Event Expired</h1>
        <p className="text-[#9C958E] mb-4 text-center max-w-md">
          This event has ended, and guest uploads are no longer allowed.
        </p>
        <Button asChild variant="outline" className="border-[#EAE5DF] hover:bg-stone-50">
          <Link href={`/event/${slug}`}>Back to Event</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] text-[#1C1A17] flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[#EAE5DF] bg-white/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link
            href={`/event/${slug}`}
            className="flex items-center gap-2 text-[#9C958E] hover:text-[#1C1A17] text-sm"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Event</span>
          </Link>
          <span className="font-semibold text-[#1C1A17]">Upload Photos</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex-1 container py-6 space-y-6 max-w-3xl mx-auto px-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1A17]">{event.name}</h1>
          <p className="text-sm text-[#9C958E]">Share your moments with other guests instantly.</p>
        </div>

        {limitError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold">Limit Reached:</span> {limitError}
            </div>
          </div>
        )}

        {/* Guest Details Form */}
        <Card className="bg-white border-[#EAE5DF] p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestName" className="text-stone-600 font-medium">Your Name *</Label>
              <Input
                id="guestName"
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={isUploading}
                className="bg-white border-[#EAE5DF] text-[#1C1A17] focus:border-[#9333EA] focus:ring-[#9333EA]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestEmail" className="text-stone-600 font-medium">Email Address (Optional)</Label>
              <Input
                id="guestEmail"
                type="email"
                placeholder="For finding your photos via AI search"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                disabled={isUploading}
                className="bg-white border-[#EAE5DF] text-[#1C1A17] focus:border-[#9333EA] focus:ring-[#9333EA]"
              />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-[#EAE5DF] shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">Select Gallery</label>
              <select
                value={selectedGallery}
                onChange={(e) => setSelectedGallery(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[#EAE5DF] bg-white px-3 py-2 text-sm text-[#1C1A17] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9333EA]"
              >
                <option value="">Choose a gallery...</option>
                {uploadGalleries.map((gallery) => (
                  <option key={gallery.id} value={gallery.id}>
                    {gallery.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {showCamera && (
          <CameraCapture 
            allowedFilters={(event.settings as any)?.allowed_filters}
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="border-2 border-dashed border-[#EAE5DF] bg-stone-50/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#9333EA] hover:bg-[#9333EA]/5 transition-all cursor-pointer group"
            onClick={() => setShowCamera(true)}
          >
            <div className="p-4 rounded-full bg-white group-hover:bg-[#9333EA]/20 transition-colors border border-transparent group-hover:border-[#9333EA]/30">
              <CameraIcon className="h-8 w-8 text-[#9C958E] group-hover:text-[#9333EA]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-[#1C1A17]">Take Photo</p>
              <p className="text-xs text-[#9C958E] mt-1">Use camera with premium filters</p>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-[#EAE5DF] bg-stone-50/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#9333EA] hover:bg-[#9333EA]/5 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add("border-[#9333EA]", "bg-[#9333EA]/5")
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("border-[#9333EA]", "bg-[#9333EA]/5")
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove("border-[#9333EA]", "bg-[#9333EA]/5")
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
            <div className="p-4 rounded-full bg-white group-hover:bg-[#9333EA]/20 transition-colors border border-transparent group-hover:border-[#9333EA]/30">
              <ImageIcon className="h-8 w-8 text-[#9C958E] group-hover:text-[#9333EA]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-[#1C1A17]">Upload Gallery</p>
              <p className="text-xs text-[#9C958E] mt-1">Select PNG, JPG up to 50MB</p>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-[#1C1A17]">
                {files.length} file(s) selected
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="border-[#EAE5DF] hover:bg-stone-50"
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.preview))
                  setFiles([])
                }}
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#EAE5DF]"
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
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/85 text-white transition-colors"
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
                className="bg-[#9333EA] hover:bg-[#7E22CE] text-white font-bold px-6 py-5 rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.25)]"
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

        <Card className="bg-white border-[#EAE5DF] p-6 shadow-sm">
          <h3 className="font-semibold text-[#1C1A17] mb-2">Upload Guidelines</h3>
          <ul className="text-sm text-[#9C958E] space-y-1">
            <li>• Photos will be reviewed before appearing in the gallery</li>
            <li>• Please only upload photos from the event</li>
            <li>• Ensure you have permission from people in your photos</li>
            <li>• High-quality photos are encouraged</li>
          </ul>
        </Card>
      </main>

      <footer className="border-t border-[#EAE5DF] py-6 mt-12 bg-white">
        <div className="container text-center text-xs text-[#9C958E]">
          Powered by{" "}
          <a href="/" className="underline hover:text-[#1C1A17]">
            Snapsy
          </a>
        </div>
      </footer>
    </div>
  )
}