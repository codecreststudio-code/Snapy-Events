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

import { VoiceNoteRecorder } from "@/lib/components/events/voice-note-recorder"
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
  Mic as MicIcon,
  Video as VideoIcon,
} from "lucide-react"
import type { Gallery } from "@/lib/types"

async function getEvent(slug: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id, name, slug, settings, host_id, end_date, status, host:users(preferences)")
    .eq("slug", slug)
    .neq("status", "archived")
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
  video_duration_limit?: number
  voice_note_duration_limit?: number
  content_types?: {
    photos?: boolean
    videos?: boolean
    voice_notes?: boolean
    messages?: boolean
  }
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
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)


  const [quotaInfo, setQuotaInfo] = useState<{ uploaded: number; max: number } | null>(null)

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
  })

  const fetchGuestQuota = useCallback(async () => {
    if (!event?.id || !guestName.trim()) {
      setQuotaInfo(null)
      return
    }
    try {
      const params = new URLSearchParams({ slug })
      const infoRes = await fetch(`/api/events/public-info?${params.toString()}`)
      if (!infoRes.ok) return
      const { data: infoData } = await infoRes.json()
      const maxAllowed: number = infoData?.max_shots ?? 25

      const supabase = createClient()
      const identifier = guestEmail.trim().toLowerCase() || guestName.trim().toLowerCase()
      const isEmail = guestEmail.trim().length > 0

      const countQuery = isEmail
        ? supabase
            .from("photos")
            .select("id", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("uploader_email", identifier)
        : supabase
            .from("photos")
            .select("id", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("uploader_name", guestName.trim())

      const { count } = await countQuery
      setQuotaInfo({ uploaded: count ?? 0, max: maxAllowed })
    } catch (err) {
      console.error("Failed to calculate quota info", err)
    }
  }, [event?.id, slug, guestName, guestEmail])

  useEffect(() => {
    fetchGuestQuota()
  }, [fetchGuestQuota])

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

  // Helper to load video/audio metadata duration
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const isVideo = file.type.startsWith("video/")
      const element = document.createElement(isVideo ? "video" : "audio")
      element.preload = "metadata"
      element.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(element.duration || 0)
      }
      element.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(0)
      }
      element.src = url
    })
  }

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const eventSettings = (event?.settings as any) || {}
    const maxVideoSecs = eventSettings.video_duration_limit || 30
    const maxVoiceSecs = eventSettings.voice_note_duration_limit || 30

    const validFiles: UploadFile[] = []

    for (const file of Array.from(selectedFiles)) {
      if (file.type.startsWith("video/")) {
        const dur = await getMediaDuration(file)
        if (dur > maxVideoSecs + 1) {
          toast({
            title: "Video Too Long",
            description: `Host limit is ${maxVideoSecs}s for video clips. Selected video is ${Math.round(dur)}s.`,
            variant: "destructive",
          })
          continue
        }
      }

      if (file.type.startsWith("audio/")) {
        const dur = await getMediaDuration(file)
        if (dur > maxVoiceSecs + 1) {
          toast({
            title: "Voice Note Too Long",
            description: `Host limit is ${maxVoiceSecs}s for voice notes. Selected audio is ${Math.round(dur)}s.`,
            variant: "destructive",
          })
          continue
        }
      }

      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: "pending" as const,
      })
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles])
    }
  }, [event?.settings])

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
    let newlyUploadedCount = 0

    try {
      // 1. Quota checks via secure service route
      let maxGuests = 100
      let maxShots = 25

      const infoParams = new URLSearchParams({ slug })
      if (cleanEmail) infoParams.set("guest_email", cleanEmail)
      if (cleanName) infoParams.set("guest_name", cleanName)

      const infoRes = await fetch(`/api/events/public-info?${infoParams.toString()}`)
      if (infoRes.ok) {
        const { data: infoData } = await infoRes.json()
        if (infoData?.max_guests) maxGuests = infoData.max_guests
        if (infoData?.max_shots) maxShots = infoData.max_shots

        const currentGuests = infoData?.current_guests ?? 0
        const currentShots = infoData?.current_shots ?? 0

        const isNewGuest = currentShots === 0

        // A: Guest limit check
        if (isNewGuest && currentGuests >= maxGuests) {
          setLimitError(`This event has reached its limit of ${maxGuests} guests. The host needs to upgrade their plan to accept more guest uploads.`)
          setIsUploading(false)
          return
        }

        // B: Shots limit check
        if (currentShots + files.length > maxShots) {
          setLimitError(`You can upload at most ${maxShots} photos. You have already uploaded ${currentShots} photos, and are trying to upload ${files.length} more.`)
          setIsUploading(false)
          return
        }
      }

      // 2. Perform uploads via secure API route (using direct signed upload for large files/videos)
      for (const uploadFile of files) {
        if (uploadFile.status === "done") continue

        try {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "uploading" as const } : f
            )
          )

          let res: Response

          // Perform direct pre-signed URL upload to Supabase storage to bypass Vercel serverless limits & sharp processing crashes
          const urlRes = await fetch("/api/photos/upload/url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gallery_id: selectedGallery,
              file_name: uploadFile.file.name,
              file_type: uploadFile.file.type,
              file_size: uploadFile.file.size,
              uploader_name: cleanName,
              uploader_email: cleanEmail,
            }),
          })

            if (!urlRes.ok) {
              const errData = await urlRes.json()
              throw new Error(errData?.error || "Failed to obtain signed upload URL")
            }

            const { data: signedData } = await urlRes.json()
            const { signedUrl, path } = signedData

            const directUploadRes = await fetch(signedUrl, {
              method: "PUT",
              headers: { "Content-Type": uploadFile.file.type },
              body: uploadFile.file,
            })

            if (!directUploadRes.ok) {
              throw new Error("Direct storage upload failed")
            }

            // Register photo record in database with pre-uploaded storage path
            res = await fetch(`/api/photos/upload?gallery_id=${selectedGallery}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                storage_path: path,
                file_name: uploadFile.file.name,
                file_type: uploadFile.file.type,
                mime_type: uploadFile.file.type,
                file_size: uploadFile.file.size,
                uploader_name: cleanName,
                uploader_email: cleanEmail,
                is_approved: settings.auto_approve_photos,
              }),
            })

          if (!res.ok) {
            const errData = await res.json()
            const msg = typeof errData?.error === "object"
              ? (errData.error.message || errData.error.code)
              : (errData?.error || "Media upload failed")
            throw new Error(msg)
          }

          newlyUploadedCount++
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
      if (newlyUploadedCount > 0) {
        setQuotaInfo((prev) =>
          prev ? { ...prev, uploaded: prev.uploaded + newlyUploadedCount } : prev
        )
        fetchGuestQuota()
      }
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

        {/* Live Guest Quota Status Banner */}
        {guestName.trim() && quotaInfo && (
          <div className="bg-[#FAF2EB] border border-[#EAE4D9] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-[#A58263] uppercase tracking-widest">Your Guest Upload Quota</p>
              <p className="text-sm font-medium text-[#1C1A17]">
                Uploaded <span className="font-bold text-[#A58263]">{quotaInfo.uploaded}</span> of <span className="font-bold text-[#1C1A17]">{quotaInfo.max}</span> media uploads allowed for this event
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs bg-[#A58263] text-white font-bold px-3 py-1.5 rounded-full shadow-sm">
                {Math.max(0, quotaInfo.max - quotaInfo.uploaded)} Slots Remaining
              </span>
            </div>
          </div>
        )}

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
            allowVideo={(event.settings as any)?.content_types?.videos !== false}
            maxVideoDuration={(event.settings as any)?.video_duration_limit || 30}
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}

        {showVoiceRecorder && (
          <VoiceNoteRecorder
            maxDuration={(event.settings as any)?.voice_note_duration_limit || 30}
            onCapture={handleCameraCapture}
            onClose={() => setShowVoiceRecorder(false)}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div
            className="border-2 border-dashed border-[#EAE5DF] bg-stone-50/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#9333EA] hover:bg-[#9333EA]/5 transition-all cursor-pointer group"
            onClick={() => setShowCamera(true)}
          >
            <div className="p-4 rounded-full bg-white group-hover:bg-[#9333EA]/20 transition-colors border border-transparent group-hover:border-[#9333EA]/30">
              <CameraIcon className="h-8 w-8 text-[#9C958E] group-hover:text-[#9333EA]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-[#1C1A17]">
                {(event.settings as any)?.content_types?.videos !== false ? "Take Photo / Video" : "Take Photo"}
              </p>
              <p className="text-xs text-[#9C958E] mt-1">
                {(event.settings as any)?.content_types?.videos !== false
                  ? `Live camera with filters & clips up to ${(event.settings as any)?.video_duration_limit || 30}s`
                  : "Use camera with premium filters"}
              </p>
            </div>
          </div>

          {(event.settings as any)?.content_types?.voice_notes !== false && (
            <div
              className="border-2 border-dashed border-[#EAE5DF] bg-stone-50/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all cursor-pointer group"
              onClick={() => setShowVoiceRecorder(true)}
            >
              <div className="p-4 rounded-full bg-white group-hover:bg-[#D4AF37]/20 transition-colors border border-transparent group-hover:border-[#D4AF37]/30">
                <MicIcon className="h-8 w-8 text-[#9C958E] group-hover:text-[#D4AF37]" />
              </div>
              <div className="text-center">
                <p className="font-medium text-[#1C1A17]">Record Voice Note</p>
                <p className="text-xs text-[#9C958E] mt-1">
                  Leave vocal wishes & audio notes up to {(event.settings as any)?.voice_note_duration_limit || 30}s
                </p>
              </div>
            </div>
          )}

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

            {(() => {
              const contentTypes = (event?.settings as any)?.content_types || {}
              const acceptedList: string[] = []
              if (contentTypes.photos !== false) acceptedList.push("image/*")
              if (contentTypes.videos === true) acceptedList.push("video/*")
              if (contentTypes.voice_notes === true) acceptedList.push("audio/*")
              const allowedAcceptString = acceptedList.join(",") || "image/*"
              return (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={allowedAcceptString}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              )
            })()}

            <div className="p-4 rounded-full bg-white group-hover:bg-[#9333EA]/20 transition-colors border border-transparent group-hover:border-[#9333EA]/30">
              <ImageIcon className="h-8 w-8 text-[#9C958E] group-hover:text-[#9333EA]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-[#1C1A17]">Upload Media</p>
              <p className="text-xs text-[#9C958E] mt-1">Select PNG, JPG, MP4, MOV up to 100MB</p>
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