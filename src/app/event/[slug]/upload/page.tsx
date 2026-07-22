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
import { GuestCaptureModal } from "@/lib/components/events/guest-capture-modal"

import { VoiceNoteRecorder } from "@/lib/components/events/voice-note-recorder"
import { classifyImageFile } from "@/lib/integrations/auto-tag-client"
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
  MessageSquare,
  Send,
  Play,
  Volume2,
  ZoomIn,
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

export interface UploadFile {
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
  ai_features?: {
    auto_categorization?: boolean
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
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null)

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
      const contentType = infoRes.headers.get("content-type") || ""
      if (!infoRes.ok || !contentType.includes("application/json")) return

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

  // Ensure selectedGallery automatically defaults to the first available gallery
  useEffect(() => {
    if (galleries && galleries.length > 0 && !selectedGallery) {
      const defaultGal = uploadGalleries[0]?.id || galleries[0]?.id
      if (defaultGal) {
        setSelectedGallery(defaultGal)
      }
    }
  }, [galleries, uploadGalleries, selectedGallery])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("snapsy_last_guest_name")
      const storedEmail = localStorage.getItem("snapsy_last_guest_email")
      if (storedName) setGuestName(storedName)
      if (storedEmail) setGuestEmail(storedEmail)
    }
  }, [])

  // Helper to load video/audio metadata duration with 2s safety timeout for mobile Safari/Android browsers
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const isVideo = file.type.startsWith("video/")
      const element = document.createElement(isVideo ? "video" : "audio")
      
      let isResolved = false
      const cleanup = (dur: number) => {
        if (isResolved) return
        isResolved = true
        try { URL.revokeObjectURL(url) } catch {}
        resolve(dur)
      }

      const timer = setTimeout(() => cleanup(0), 2000)

      element.preload = "metadata"
      element.onloadedmetadata = () => {
        clearTimeout(timer)
        cleanup(element.duration || 0)
      }
      element.onerror = () => {
        clearTimeout(timer)
        cleanup(0)
      }
      element.src = url
    })
  }

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const eventSettings = (event?.settings as any) || {}
    const maxVideoSecs = eventSettings.video_duration_limit || 30
    const maxVoiceSecs = eventSettings.voice_note_duration_limit || 30

    const validFiles: UploadFile[] = []

    for (const file of Array.from(selectedFiles)) {
      const effectiveType = file.type || "image/jpeg"

      if (effectiveType.startsWith("video/")) {
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

      if (effectiveType.startsWith("audio/")) {
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
        // A blob preview URL is useful for video/audio too (video thumbnail
        // frame + full-view playback before upload), not just images.
        preview: URL.createObjectURL(file),
        progress: 0,
        status: "pending" as const,
      })
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles])
    }
  }, [event?.settings])

  // Shared single-file upload pipeline (signed URL -> direct storage PUT ->
  // register in DB). Extracted so both the instant-upload-on-capture path
  // (handlePhotoCapture below) and the manual batch uploader (uploadFiles)
  // hit the exact same API calls instead of maintaining two copies.
  const uploadFileDirect = useCallback(async (
    file: File,
    targetGallery: string,
    cleanName: string,
    cleanEmail: string,
    isApproved: boolean
  ): Promise<void> => {
    const effectiveMimeType = file.type || "image/jpeg"

    const urlRes = await fetch("/api/photos/upload/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gallery_id: targetGallery,
        file_name: file.name || `mobile_upload_${Date.now()}.jpg`,
        file_type: effectiveMimeType,
        file_size: file.size,
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
      headers: { "Content-Type": effectiveMimeType },
      body: file,
    })

    if (!directUploadRes.ok) {
      let errBody = ""
      try { errBody = await directUploadRes.text() } catch {}
      throw new Error(`Storage upload failed (${directUploadRes.status})${errBody ? ": " + errBody.slice(0, 120) : ""}`)
    }

    const res = await fetch(`/api/photos/upload?gallery_id=${targetGallery}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storage_path: path,
        file_name: file.name || `mobile_upload_${Date.now()}.jpg`,
        file_type: effectiveMimeType,
        mime_type: effectiveMimeType,
        file_size: file.size,
        uploader_name: cleanName,
        uploader_email: cleanEmail,
        is_approved: isApproved,
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      const msg = typeof errData?.error === "object"
        ? (errData.error.message || errData.error.code)
        : (errData?.error || "Media upload failed")
      throw new Error(msg)
    }

    // Auto Categorization (ai_features.auto_categorization) — fire-and-forget,
    // never blocks the upload itself. Only images get classified (MobileNet
    // is an image model), and only when the host enabled this for the event —
    // the model is never downloaded otherwise.
    const eventSettings = (event?.settings || {}) as EventSettings
    if (eventSettings.ai_features?.auto_categorization === true && effectiveMimeType.startsWith("image/")) {
      try {
        const uploadJson = await res.clone().json().catch(() => null)
        const photoId = uploadJson?.data?.id as string | undefined
        if (photoId) {
          classifyImageFile(file)
            .then(({ tags }) => {
              if (tags.length === 0) return
              return fetch(`/api/photos/${photoId}/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags }),
              })
            })
            .catch((err) => console.warn("[auto-tag] background tagging failed", err))
        }
      } catch (err) {
        console.warn("[auto-tag] could not read upload response for tagging", err)
      }
    }
  }, [event])

  // Camera-captured photos (and confirmed videos) skip the old "queue, then
  // tap Upload Files" flow entirely — CameraCapture calls this the instant a
  // shot is taken (after its brief undo window), so the upload runs silently
  // in the background while the guest keeps shooting. Returns/rejects a
  // Promise so CameraCapture's pill can show a non-blocking error + retry
  // affordance instead of a blocking alert.
  const handlePhotoCapture = useCallback(async (file: File, captureId?: string) => {
    const id = captureId || Math.random().toString(36).substring(7)
    const targetGallery = selectedGallery || uploadGalleries[0]?.id || galleries?.[0]?.id
    const cleanName = guestName.trim()
    const cleanEmail = guestEmail.trim().toLowerCase()

    setFiles((prev) => {
      const existing = prev.find((f) => f.id === id)
      const record: UploadFile = {
        id,
        file,
        preview: existing?.preview || URL.createObjectURL(file),
        progress: 0,
        status: "uploading",
      }
      return existing ? prev.map((f) => (f.id === id ? record : f)) : [...prev, record]
    })

    if (!targetGallery) {
      const msg = "No gallery is available to accept uploads for this event."
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "error", error: msg } : f)))
      throw new Error(msg)
    }
    if (!cleanName) {
      const msg = "Add your name above to enable upload."
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "error", error: msg } : f)))
      throw new Error(msg)
    }
    if (quotaInfo && quotaInfo.max > 0 && quotaInfo.uploaded >= quotaInfo.max) {
      const msg = `You've reached the ${quotaInfo.max}-shot limit for this event.`
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "error", error: msg } : f)))
      throw new Error(msg)
    }

    try {
      await uploadFileDirect(file, targetGallery, cleanName, cleanEmail, settings.auto_approve_photos)
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: 100, status: "done" } : f)))
      setQuotaInfo((prev) => (prev ? { ...prev, uploaded: prev.uploaded + 1 } : prev))
    } catch (err) {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "error", error: (err as Error).message } : f)))
      throw err
    }
  }, [selectedGallery, uploadGalleries, galleries, guestName, guestEmail, settings.auto_approve_photos, quotaInfo, uploadFileDirect])

  function removeFile(id: string) {
    setPreviewFile((prev) => (prev?.id === id ? null : prev))
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file && file.preview) {
        try { URL.revokeObjectURL(file.preview) } catch {}
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  async function uploadFiles() {
    if (files.length === 0) {
      toast({
        title: "No Media Selected",
        description: "Please select or record a photo/video before uploading.",
        variant: "destructive",
      })
      return
    }

    // Explicit `string` fallback (rather than leaving this `string | undefined`)
    // so the type stays narrowed to `string` inside uploadOne() below — a
    // nested function declaration closing over this const doesn't retain
    // TypeScript's post-guard narrowing the way inline code does, which
    // previously failed the production type-check at the uploadFileDirect
    // call site.
    const targetGallery: string = selectedGallery || uploadGalleries[0]?.id || galleries?.[0]?.id || ""

    if (!targetGallery) {
      toast({
        title: "Gallery Required",
        description: "No gallery is available to accept uploads for this event.",
        variant: "destructive",
      })
      return
    }

    if (!event) return
    setLimitError(null)

    // Validations: require a name to upload
    const cleanName = guestName.trim()
    const cleanEmail = guestEmail.trim().toLowerCase()
    
    if (!cleanName) {
      toast({
        title: "Name Required",
        description: "Please enter your name so the host knows who uploaded the media.",
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

      // 2. Perform uploads via secure API route (direct signed upload for
      // large files/videos). Previously these ran strictly one-at-a-time in
      // a `for...of` loop with `await` on every file — with a signed direct-
      // to-storage upload per file, there's no reason to serialize them; the
      // browser can happily have several in flight at once. This was the
      // single biggest lever on "uploading is too slow" when a guest selects
      // multiple photos: 10 photos at ~1.5s each was ~15s serial, now runs
      // in ~4 overlapping batches instead of 10 sequential round trips.
      const CONCURRENCY = 4

      async function uploadOne(uploadFile: UploadFile): Promise<boolean> {
        if (uploadFile.status === "done") return false
        try {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "uploading" as const } : f
            )
          )

          // Shared pipeline (signed URL -> direct storage PUT -> register) —
          // same helper the instant-upload-on-capture path uses.
          await uploadFileDirect(uploadFile.file, targetGallery, cleanName, cleanEmail, settings.auto_approve_photos)

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, progress: 100, status: "done" as const }
                : f
            )
          )
          return true
        } catch (err) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error" as const, error: (err as Error).message }
                : f
            )
          )
          return false
        }
      }

      const queue = [...files]
      let queueIdx = 0
      const outcomes: boolean[] = []
      async function worker() {
        while (queueIdx < queue.length) {
          const current = queue[queueIdx++]
          outcomes.push(await uploadOne(current))
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
      )
      newlyUploadedCount = outcomes.filter(Boolean).length
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
        toast({
          title: "Upload Complete",
          description: `${newlyUploadedCount} file(s) uploaded successfully!`,
        })
      }
    }
  }


  if (eventLoading || galleriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141110]">
        <Loader2 className="h-8 w-8 animate-spin text-[#B28DAE]" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#141110] text-white">
        <h1 className="text-2xl font-semibold mb-2">Event Not Found</h1>
        <p className="text-white/60 mb-4">
          The event you're looking for doesn't exist or uploads are disabled.
        </p>
        <Button asChild className="rounded-full bg-[#B28DAE] hover:bg-[#a468a0] text-[#141110] font-bold">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    )
  }

  if (!settings.allow_guest_uploads) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#141110] text-white">
        <CameraIcon className="h-12 w-12 text-white/40 mb-4 animate-bounce" />
        <h1 className="text-2xl font-semibold mb-2">Uploads Disabled</h1>
        <p className="text-white/60 mb-4 text-center max-w-md">
          This event is not accepting photo uploads at the moment.
        </p>
        <Button asChild variant="outline" className="rounded-full border border-[#3D332A] bg-transparent text-white hover:bg-white/10">
          <Link href={`/event/${slug}`}>Back to Event</Link>
        </Button>
      </div>
    )
  }

  const isExpired = event.end_date && new Date(event.end_date) < new Date()

  if (isExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#141110] text-white">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Event Expired</h1>
        <p className="text-white/60 mb-4 text-center max-w-md">
          This event has ended, and guest uploads are no longer allowed.
        </p>
        <Button asChild variant="outline" className="rounded-full border border-[#3D332A] bg-transparent text-white hover:bg-white/10">
          <Link href={`/event/${slug}`}>Back to Event</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141110] text-white flex flex-col">
      {/* Guests reaching this page directly (bookmarked link, shared upload
          URL) without ever visiting the event landing page still need to
          check in — the modal issues the guest-session cookie the upload
          API now requires (see src/lib/security/guest-session.ts). */}
      <GuestCaptureModal eventId={event.id} eventName={event.name} />
      <header className="sticky top-0 z-40 border-b border-[#3D332A] bg-[#141110]/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link
            href={`/event/${slug}`}
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Event</span>
          </Link>
          <span className="font-semibold text-white">Upload Photos</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex-1 container py-6 space-y-6 max-w-3xl mx-auto px-4">
        <div>
          <h1 className="font-playfair text-2xl font-bold tracking-tight text-white">{event.name}</h1>
          <p className="text-sm text-white/60">Share your moments with other guests instantly.</p>
        </div>

        {limitError && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold">Limit Reached:</span> {limitError}
            </div>
          </div>
        )}

        {/* Guest Details Form */}
        <Card className="bg-[#1C1814] border-[#3D332A] p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestName" className="text-white/60 font-medium">Your Name *</Label>
              <Input
                id="guestName"
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={isUploading}
                className="bg-[#141110] border-[#3D332A] text-white focus:border-[#B28DAE] focus:ring-[#B28DAE] focus-visible:ring-[#B28DAE]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestEmail" className="text-white/60 font-medium">Email Address (Optional)</Label>
              <Input
                id="guestEmail"
                type="email"
                placeholder="For finding your photos via AI search"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                disabled={isUploading}
                className="bg-[#141110] border-[#3D332A] text-white focus:border-[#B28DAE] focus:ring-[#B28DAE] focus-visible:ring-[#B28DAE]"
              />
            </div>
          </div>
        </Card>

        {/* The old "Uploaded X of Y" banner has been replaced by a
            glanceable, always-visible shot counter positioned right next to
            the shutter button inside CameraCapture itself (see
            initialShotsUsed/maxShots below) — matching once.film's in-camera
            counter instead of a separate page banner. */}

        <Card className="bg-[#1C1814] border-[#3D332A] shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Select Gallery</label>
              <select
                value={selectedGallery}
                onChange={(e) => setSelectedGallery(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[#3D332A] bg-[#141110] px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B28DAE]"
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

        {(() => {
          const contentTypes = (event?.settings as any)?.content_types
          const allowVideo = contentTypes ? contentTypes.videos !== false : true
          const allowVoice = contentTypes ? contentTypes.voice_notes !== false : true
          const allowMessages = contentTypes ? contentTypes.messages !== false : true
          const videoLimit = Number((event?.settings as any)?.video_duration_limit) || 10
          const voiceLimit = Number((event?.settings as any)?.voice_note_duration_limit) || 10

          return (
            <>
              {showCamera && (
                <CameraCapture
                  allowedFilters={(event.settings as any)?.allowed_filters}
                  allowVideo={allowVideo}
                  maxVideoDuration={videoLimit}
                  initialShotsUsed={quotaInfo?.uploaded ?? 0}
                  maxShots={quotaInfo?.max ?? null}
                  onCapture={handlePhotoCapture}
                  onClose={() => setShowCamera(false)}
                />
              )}

              {showVoiceRecorder && (
                <VoiceNoteRecorder
                  maxDuration={voiceLimit}
                  onCapture={handlePhotoCapture}
                  onClose={() => setShowVoiceRecorder(false)}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card 1: Take Photo / Video */}
                <div
                  className="border-2 border-dashed border-[#3D332A] bg-[#1C1814]/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#B28DAE] hover:bg-[#B28DAE]/5 transition-all cursor-pointer group"
                  onClick={() => setShowCamera(true)}
                >
                  <div className="p-4 rounded-full bg-[#1C1814] group-hover:bg-[#B28DAE]/20 transition-colors border border-transparent group-hover:border-[#B28DAE]/30">
                    <CameraIcon className="h-8 w-8 text-white/50 group-hover:text-[#B28DAE]" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-white">
                      {allowVideo ? "Take Photo / Video" : "Take Photo"}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      {allowVideo
                        ? `Live camera with filters & clips up to ${videoLimit}s`
                        : "Use camera with premium filters"}
                    </p>
                  </div>
                </div>

                {/* Card 2: Record Voice Note */}
                {allowVoice && (
                  <div
                    className="border-2 border-dashed border-[#3D332A] bg-[#1C1814]/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#B28DAE] hover:bg-[#B28DAE]/5 transition-all cursor-pointer group"
                    onClick={() => setShowVoiceRecorder(true)}
                  >
                    <div className="p-4 rounded-full bg-[#1C1814] group-hover:bg-[#B28DAE]/20 transition-colors border border-transparent group-hover:border-[#B28DAE]/30">
                      <MicIcon className="h-8 w-8 text-white/50 group-hover:text-[#B28DAE]" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-white">Record Voice Note</p>
                      <p className="text-xs text-white/50 mt-1">
                        Leave vocal wishes & audio notes up to {voiceLimit}s
                      </p>
                    </div>
                  </div>
                )}

                {/* Card 4: Upload Media */}
                <div
                  className="border-2 border-dashed border-[#3D332A] bg-[#1C1814]/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#B28DAE] hover:bg-[#B28DAE]/5 transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add("border-[#B28DAE]", "bg-[#B28DAE]/5")
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("border-[#B28DAE]", "bg-[#B28DAE]/5")
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove("border-[#B28DAE]", "bg-[#B28DAE]/5")
                    handleFileSelect(e.dataTransfer.files)
                  }}
                >
                  {(() => {
                    const acceptedList: string[] = []
                    if (contentTypes?.photos !== false) acceptedList.push("image/*")
                    if (allowVideo) acceptedList.push("video/*")
                    if (allowVoice) acceptedList.push("audio/*")
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

                  <div className="p-4 rounded-full bg-[#1C1814] group-hover:bg-[#B28DAE]/20 transition-colors border border-transparent group-hover:border-[#B28DAE]/30">
                    <ImageIcon className="h-8 w-8 text-white/50 group-hover:text-[#B28DAE]" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-white">Upload Media</p>
                    <p className="text-xs text-white/50 mt-1">Select PNG, JPG, MP4, MOV up to 100MB</p>
                  </div>
                </div>
              </div>
            </>
          )
        })()}



        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">
                {files.length} file(s) selected
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border border-[#3D332A] bg-transparent text-white hover:bg-white/10"
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.preview))
                  setFiles([])
                  setPreviewFile(null)
                }}
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
              {files.map((file) => {
                const kind = file.file.type.startsWith("video/")
                  ? "video"
                  : file.file.type.startsWith("audio/")
                  ? "audio"
                  : "image"
                return (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-[#1C1814] border border-[#3D332A] cursor-pointer"
                >
                  {kind === "image" && (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {kind === "video" && (
                    <>
                      <video src={file.preview} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10">
                        <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </>
                  )}
                  {kind === "audio" && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#B28DAE]/20 to-[#3D332A]/60 p-2">
                      <Volume2 className="h-8 w-8 text-[#B28DAE]" />
                      <span className="text-[10px] text-white/70 text-center line-clamp-2 px-1">{file.file.name}</span>
                    </div>
                  )}
                  {(kind === "video" || kind === "image") && (
                    <div className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white pointer-events-none">
                      <ZoomIn className="h-3.5 w-3.5" />
                    </div>
                  )}
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
                    <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center p-2 gap-1">
                      <X className="h-6 w-6 text-white shrink-0" />
                      {file.error && (
                        <p className="text-white text-[8px] text-center leading-tight line-clamp-3">{file.error}</p>
                      )}
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
                )
              })}
            </div>

            <div className="flex justify-end gap-4">
              <Button
                onClick={uploadFiles}
                disabled={isUploading || files.length === 0}
                className="rounded-full bg-[#B28DAE] hover:bg-[#a468a0] text-[#141110] font-bold px-6 py-5 shadow-[0_0_15px_rgba(178,141,174,0.25)]"
              >

                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4" />
                    Upload {files.length} File{files.length === 1 ? "" : "s"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {previewFile && (() => {
          const kind = previewFile.file.type.startsWith("video/")
            ? "video"
            : previewFile.file.type.startsWith("audio/")
            ? "audio"
            : "image"
          return (
            <div
              className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
              onClick={() => setPreviewFile(null)}
            >
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close preview"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="max-w-3xl max-h-[85vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {kind === "video" && (
                  <video src={previewFile.preview} controls autoPlay playsInline className="max-w-full max-h-[85vh] rounded-lg">
                    Your browser does not support video playback.
                  </video>
                )}
                {kind === "audio" && (
                  <div className="flex flex-col items-center gap-4 p-8">
                    <Volume2 className="h-16 w-16 text-[#B28DAE]" />
                    <p className="text-white/80 text-sm">{previewFile.file.name}</p>
                    <audio src={previewFile.preview} controls autoPlay className="w-80 max-w-full">
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
                {kind === "image" && (
                  <img src={previewFile.preview} alt={previewFile.file.name} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                )}
              </div>
            </div>
          )
        })()}

        <Card className="bg-[#1C1814] border-[#3D332A] p-6 shadow-sm">
          <h3 className="font-semibold text-white mb-2">Upload Guidelines</h3>
          <ul className="text-sm text-white/60 space-y-1">
            <li>• Photos will be reviewed before appearing in the gallery</li>
            <li>• Please only upload photos from the event</li>
            <li>• Ensure you have permission from people in your photos</li>
            <li>• High-quality photos are encouraged</li>
          </ul>
        </Card>
      </main>

      <footer className="border-t border-[#3D332A] py-6 mt-12 bg-[#1C1814]">
        <div className="container text-center text-xs text-white/60">
          Powered by{" "}
          <a href="/" className="underline hover:text-white">
            Snapsy
          </a>
        </div>
      </footer>
    </div>
  )
}