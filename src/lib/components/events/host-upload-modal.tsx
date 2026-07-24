"use client"

import { useCallback, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/lib/components/ui/dialog"
import { toast } from "@/lib/components/ui/toaster"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks"
import { CameraCapture } from "./camera-capture"
import { VoiceNoteRecorder } from "./voice-note-recorder"
import {
  Camera as CameraIcon,
  Mic as MicIcon,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
} from "lucide-react"

interface HostUploadModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventSettings: Record<string, any> | null | undefined
  // Called after each successful upload so the caller can invalidate its
  // photos query — the same event-photos list the guest-facing gallery and
  // host timeline both already poll/subscribe to.
  onUploaded?: () => void
}

interface GalleryOption {
  id: string
  name: string
}

async function getUploadableGalleries(eventId: string): Promise<GalleryOption[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("galleries")
    .select("id, name, settings")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
  if (error) throw error
  const rows = data || []
  const uploadable = rows.filter((g) => (g.settings as { allow_uploads?: boolean } | null)?.allow_uploads !== false)
  return (uploadable.length > 0 ? uploadable : rows).map((g) => ({ id: g.id, name: g.name }))
}

// Same client-side metadata read the guest upload page uses (see
// getMediaDuration in src/app/event/[slug]/upload/page.tsx) — duplicated
// here rather than imported since it's a small, self-contained helper and
// this modal has no other coupling to that page's client component.
function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const isVideo = file.type.startsWith("video/")
    const element = document.createElement(isVideo ? "video" : "audio")
    let resolved = false
    const cleanup = (dur: number) => {
      if (resolved) return
      resolved = true
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

interface QueuedUpload {
  id: string
  name: string
  status: "uploading" | "done" | "error"
  error?: string
}

function extractErrorMessage(errData: unknown, fallback: string): string {
  const err = (errData as { error?: unknown } | null)?.error
  if (!err) return fallback
  if (typeof err === "string") return err
  if (typeof err === "object") {
    const obj = err as { message?: string; code?: string }
    return obj.message || obj.code || fallback
  }
  return fallback
}

// Lets the event host add their own photos, videos, and voice notes straight
// from their dashboard — the same camera / voice-recorder / file-picker UI
// and the same signed-URL upload pipeline guests get on the public
// /event/[slug]/upload page, minus the guest check-in step (the host is
// already authenticated) and without counting against the event's
// guest/shot quotas. Both of those exemptions are enforced server-side via
// `uploaderIsHost` in src/app/api/photos/upload/route.ts and
// upload/url/route.ts — this component just needs to hit the same two
// endpoints with the host's own browser session (cookies go along with the
// same-origin fetch calls automatically), no special client-side flag needed.
export function HostUploadModal({ isOpen, onClose, eventId, eventSettings, onUploaded }: HostUploadModalProps) {
  const { profile, user } = useAuth()
  const [showCamera, setShowCamera] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueuedUpload[]>([])

  const { data: galleries } = useQuery({
    queryKey: ["host-upload-galleries", eventId],
    queryFn: () => getUploadableGalleries(eventId),
    enabled: isOpen && !!eventId,
  })
  const targetGallery = galleries?.[0]?.id

  const settings = eventSettings || {}
  const contentTypes = settings.content_types as { photos?: boolean; videos?: boolean; voice_notes?: boolean } | undefined
  const allowPhotos = contentTypes ? contentTypes.photos !== false : true
  const allowVideo = contentTypes ? contentTypes.videos !== false : true
  const allowVoice = contentTypes ? contentTypes.voice_notes !== false : true
  const videoLimit = Number(settings.video_duration_limit) || 30
  const voiceLimit = Number(settings.voice_note_duration_limit) || 30

  const hostName = profile?.full_name || "Host"
  const hostEmail = user?.email || ""

  const uploadOne = useCallback(async (file: File, id: string) => {
    if (!targetGallery) {
      toast({
        title: "No gallery available",
        description: "Create a gallery for this event before adding media.",
        variant: "destructive",
      })
      setQueue((prev) => prev.filter((q) => q.id !== id))
      return
    }

    const effectiveMimeType = file.type || "image/jpeg"
    let duration: number | undefined
    if (effectiveMimeType.startsWith("video/") || effectiveMimeType.startsWith("audio/")) {
      duration = await getMediaDuration(file)
    }

    try {
      const urlRes = await fetch("/api/photos/upload/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gallery_id: targetGallery,
          file_name: file.name || `host_upload_${Date.now()}.jpg`,
          file_type: effectiveMimeType,
          file_size: file.size,
          uploader_name: hostName,
          uploader_email: hostEmail,
        }),
      })
      if (!urlRes.ok) {
        const errData = await urlRes.json().catch(() => null)
        throw new Error(extractErrorMessage(errData, "Failed to prepare upload"))
      }
      const { data: signedData } = await urlRes.json()
      const { signedUrl, path } = signedData

      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": effectiveMimeType },
        body: file,
      })
      if (!putRes.ok) throw new Error(`Storage upload failed (${putRes.status})`)

      const confirmRes = await fetch(`/api/photos/upload?gallery_id=${targetGallery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: path,
          file_name: file.name || `host_upload_${Date.now()}.jpg`,
          file_type: effectiveMimeType,
          mime_type: effectiveMimeType,
          file_size: file.size,
          uploader_name: hostName,
          uploader_email: hostEmail,
          is_approved: true,
          duration: duration && duration > 0 ? duration : undefined,
        }),
      })
      if (!confirmRes.ok) {
        const errData = await confirmRes.json().catch(() => null)
        throw new Error(extractErrorMessage(errData, "Upload failed"))
      }

      setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "done" as const } : q)))
      onUploaded?.()
    } catch (err) {
      setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "error" as const, error: (err as Error).message } : q)))
    }
  }, [targetGallery, hostName, hostEmail, onUploaded])

  const handleCapture = useCallback(async (file: File) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setQueue((prev) => [{ id, name: file.name || "Capture", status: "uploading" as const }, ...prev])
    await uploadOne(file, id)
  }, [uploadOne])

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      setQueue((prev) => [{ id, name: file.name, status: "uploading" as const }, ...prev])
      uploadOne(file, id)
    })
  }, [uploadOne])

  const acceptString = [
    allowPhotos && "image/*",
    allowVideo && "video/*",
    allowVoice && "audio/*",
  ].filter(Boolean).join(",") || "image/*"

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg rounded-2xl border border-[#e5dfd0] bg-[#ffffff] text-[#1a1410] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-playfair text-xl font-medium text-[#1a1410]">Add Your Own Media</DialogTitle>
            <DialogDescription className="text-[#6b6055]">
              Capture or upload photos, videos, and voice notes straight into this capsule — the same as your guests can.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {allowPhotos && (
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="border-2 border-dashed border-[#e5dfd0] bg-[#faf6ed]/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-mauve hover:bg-mauve/5 transition-all cursor-pointer group text-center"
              >
                <div className="p-3 rounded-full bg-[#ffffff] group-hover:bg-mauve/20 transition-colors border border-transparent group-hover:border-mauve/30">
                  <CameraIcon className="h-6 w-6 text-[#6b6055] group-hover:text-mauve" />
                </div>
                <p className="text-xs font-semibold text-[#1a1410]">{allowVideo ? "Photo / Video" : "Take Photo"}</p>
              </button>
            )}

            {allowVoice && (
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                className="border-2 border-dashed border-[#e5dfd0] bg-[#faf6ed]/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-mauve hover:bg-mauve/5 transition-all cursor-pointer group text-center"
              >
                <div className="p-3 rounded-full bg-[#ffffff] group-hover:bg-mauve/20 transition-colors border border-transparent group-hover:border-mauve/30">
                  <MicIcon className="h-6 w-6 text-[#6b6055] group-hover:text-mauve" />
                </div>
                <p className="text-xs font-semibold text-[#1a1410]">Voice Note</p>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#e5dfd0] bg-[#faf6ed]/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-mauve hover:bg-mauve/5 transition-all cursor-pointer group text-center"
            >
              <div className="p-3 rounded-full bg-[#ffffff] group-hover:bg-mauve/20 transition-colors border border-transparent group-hover:border-mauve/30">
                <ImageIcon className="h-6 w-6 text-[#6b6055] group-hover:text-mauve" />
              </div>
              <p className="text-xs font-semibold text-[#1a1410]">Upload from Device</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptString}
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </button>
          </div>

          {queue.length > 0 && (
            <div className="mt-4 space-y-1.5 max-h-40 overflow-y-auto">
              {queue.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#e5dfd0] bg-[#faf6ed]/40 px-3 py-2 text-xs">
                  <span className="truncate text-[#1a1410]">{q.name}</span>
                  {q.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-mauve shrink-0" />}
                  {q.status === "done" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  {q.status === "error" && (
                    <span className="text-red-600 shrink-0 flex items-center gap-1">
                      <X className="h-3.5 w-3.5" />
                      {q.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showCamera && (
        <CameraCapture
          allowedFilters={settings.allowed_filters}
          allowVideo={allowVideo}
          maxVideoDuration={videoLimit}
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {showVoiceRecorder && (
        <VoiceNoteRecorder
          maxDuration={voiceLimit}
          onCapture={handleCapture}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}
    </>
  )
}
