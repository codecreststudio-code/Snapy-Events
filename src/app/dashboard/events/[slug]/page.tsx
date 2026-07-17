"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks"
import type { Event, EventSettings, EventStatus } from "@/lib/types"
import { Button } from "@/lib/components/ui/button"
import { Switch } from "@/lib/components/ui/switch"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { toast } from "@/lib/components/ui/toaster"
import { motion, AnimatePresence } from "framer-motion"
import { QRCodeSVG } from "qrcode.react"
import { generateInvitationCard, buildInvitationCaption, type InvitationTheme } from "@/lib/invitation-card"
import { useWatermarkEnabled } from "@/lib/hooks"
import { toDatetimeLocalValue } from "@/lib/utils"
import { WatermarkOverlay } from "@/lib/components/media/watermark-overlay"
import { MediaLightbox, type LightboxMedia } from "@/lib/components/media/media-lightbox"
import {
  ArrowLeft,
  Calendar,
  Camera,
  Download,
  Images,
  Image as ImageIcon,
  QrCode,
  Settings,
  Trash2,
  Clock,
  Sparkles,
  Play,
  MessageSquare,
  Mic,
  Video,
  Smile,
  X,
  Plus,
  Activity,
  Search,
  ExternalLink,
  ChevronRight,
  Users,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Loader2,
  RefreshCw,
  Film,
  AlertCircle
} from "lucide-react"

const TEMPLATE_COVERS = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop", // Wedding
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=600&auto=format&fit=crop", // Party
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600&auto=format&fit=crop", // Flowers
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop", // Paris / Lights
]

// Types for settings
interface ExtEventSettings extends EventSettings {
  allowed_filters?: string[]
  cover_gradient?: string | null
  reveal_experience?: string
  photo_limit?: number
  video_duration_limit?: number
  voice_note_duration_limit?: number
  guest_count_plan?: string
  guests_boost?: number
  shots_boost?: number
  content_types?: {
    photos: boolean
    videos: boolean
    voice_notes: boolean
    messages: boolean
  }
  ai_features?: {
    face_search: boolean
    duplicate_detection: boolean
    best_shot: boolean
    smart_albums: boolean
    highlights: boolean
    auto_categorization: boolean
    custom_layouts: boolean
  }
  capsule?: {
    enabled: boolean
    reveal_trigger: string
    custom_date: string
  }
  invitation?: {
    theme: string
    welcome_message: string
    countdown_enabled: boolean
  }
  // Populated server-side by the recap generation pipeline
  // (POST /api/events/[id]/recap/generate). Not present until a host has
  // triggered generation at least once for this event.
  recap_video?: {
    status: "idle" | "rendering" | "ready" | "failed"
    mood?: "joyful" | "sentimental"
    video_url?: string
    generated_at?: string
    error?: string
    stats?: {
      guests: number
      photos: number
      videos: number
      voiceNotes: number
      messages: number
    }
  }
}

// Cross-origin links to Supabase Storage need the server to actually send
// `Content-Disposition: attachment` for the browser to save the file — a
// plain `<a href={crossOriginUrl} download>` is silently ignored by browsers
// for cross-origin resources (the anchor's `download` attribute is only
// honored same-origin), so clicking "Download" just re-navigates to/plays
// the video instead of saving it. Supabase's storage server recognizes a
// `?download` query param and adds that header itself, which works
// regardless of origin — see @supabase/storage-js's createSignedUrl/
// getPublicUrl `download` option, which does exactly this under the hood.
function forceDownloadUrl(url: string, filename: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set("download", filename)
    return u.toString()
  } catch {
    return url
  }
}

// Fetch event details
async function getEvent(slug: string, orgId: string): Promise<Event> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("host_id", orgId)
    .single()

  if (error) throw error
  return data
}

// Fetch uploaded photos for event
async function getEventPhotos(eventId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
  return data || []
}

// Fetch face clusters
async function getFaceClusters(eventId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("face_clusters")
    .select("*, representative_face:representative_face_id(photo:photo_id(thumbnail_path, storage_path))")
    .eq("event_id", eventId)
    .order("face_count", { ascending: false })
  return data || []
}

// Fetch live wall items (messages)
async function getLiveWallMessages(eventId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("live_wall_items")
    .select("*, photo:photo_id(uploader_name, uploader_email, thumbnail_path)")
    .eq("event_id", eventId)
    .not("message", "is", null)
    .order("created_at", { ascending: false })
  return data || []
}

// Fetch advisory plan-gate results for the three paid-plan-only actions on
// this page (Recap Video, AI Smart Clusters, Download All) in a single round
// trip — see src/app/api/events/[id]/feature-access/route.ts. Used purely
// for proactive UX (disable + "upgrade" tag before the host clicks); the
// underlying action routes still enforce their own gate server-side.
interface FeatureAccessResult {
  allowed: boolean
  planId: string
  reason?: string
}
interface FeatureAccessResponse {
  recap_video: FeatureAccessResult
  ai_face_search: FeatureAccessResult
  print_ready_downloads: FeatureAccessResult
}
async function getFeatureAccess(eventId: string): Promise<FeatureAccessResponse> {
  const res = await fetch(`/api/events/${eventId}/feature-access`)
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    // Fail open (all allowed) rather than fail closed — this is advisory UX
    // only. If the check itself errors, the host still hits the real action
    // routes' own server-side gate on click, so nothing bypasses enforcement.
    return {
      recap_video: { allowed: true, planId: "free" },
      ai_face_search: { allowed: true, planId: "free" },
      print_ready_downloads: { allowed: true, planId: "free" },
    }
  }
  return json.data
}

// Fetch photo access (for guest activity)
async function getPhotoAccess(eventId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("photo_access")
    .select("*")
    .eq("event_id", eventId)
    .order("accessed_at", { ascending: false })
    .limit(20)
  return data || []
}

// Update event details
async function updateEvent(slug: string, data: any, currentSettings: any) {
  const supabase = createClient()
  const mergedSettings = { ...currentSettings, ...data.settings }

  const eventData: any = {
    name: data.name,
    status: data.status,
    end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
    settings: mergedSettings,
  }

  const { error } = await supabase.from("events").update(eventData).eq("slug", slug)
  if (error) throw new Error(error.message)
}

// Delete event
async function deleteEvent(slug: string) {
  const supabase = createClient()
  const { error } = await supabase.from("events").delete().eq("slug", slug)
  if (error) throw new Error(error.message)
}

export default function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { profile, isLoading: authLoading } = useAuth()
  const orgId = profile?.id

  // State management
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [activeMediaTab, setActiveMediaTab] = useState<"all" | "photos" | "videos" | "voices" | "messages">("all")
  const [countdownText, setCountdownText] = useState("")
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [regeneratingCode, setRegeneratingCode] = useState(false)
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<LightboxMedia | null>(null)
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)
  const watermarkEnabled = useWatermarkEnabled()

  const publicEventUrl = typeof window !== "undefined"
    ? `${window.location.origin}/event/${slug}`
    : `https://snapsy-events.vercel.app/event/${slug}`

  const handleCopyLink = () => {
    if (!event) return
    const link = typeof window !== "undefined" ? `${window.location.origin}/event/${event.slug}` : `https://snapsy-events.vercel.app/event/${event.slug}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast({ title: "Event link copied to clipboard!" })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQr = () => {
    if (!event) return
    const svgEl = document.getElementById("event-dashboard-qr") as SVGElement | null
    if (!svgEl) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(svgBlob)

    const canvas = document.createElement("canvas")
    canvas.width = 600
    canvas.height = 600
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, 600, 600)

    const logoImg = new Image()
    logoImg.crossOrigin = "anonymous"
    logoImg.onload = () => {
      ctx.globalAlpha = 0.25
      ctx.drawImage(logoImg, 50, 50, 500, 500)
      ctx.globalAlpha = 1.0

      const qrImg = new Image()
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 30, 30, 540, 540)
        const pngUrl = canvas.toDataURL("image/png")
        const downloadLink = document.createElement("a")
        downloadLink.href = pngUrl
        downloadLink.download = `${event.slug}-snapsy-qr.png`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(svgUrl)
      }
      qrImg.src = svgUrl
    }
    logoImg.src = "/Logo.png"
  }

  // "Download All" — fetches the print-ready ZIP from
  // /api/events/[id]/download-zip (up to ~300s server-side, see vercel.json)
  // and saves it via a same-origin blob URL. Previously there was no UI
  // element wired to this route at all, so the working backend was
  // completely unreachable from the dashboard. Uses fetch (not a plain
  // <a href download>) so a gating/error JSON response (403 plan-gated, 400
  // no approved photos, 500 zip failure) surfaces as a toast instead of
  // silently downloading a JSON file or doing nothing.
  const handleDownloadZip = async () => {
    if (!event || isDownloadingZip) return
    setIsDownloadingZip(true)
    try {
      const res = await fetch(`/api/events/${event.id}/download-zip`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `Download failed (${res.status})`)
      }
      // The route caps files/bytes per ZIP (see MAX_ZIP_FILES/MAX_ZIP_BYTES in
      // download-zip/route.ts) and reports the shortfall via headers, since a
      // binary ZIP response can't carry a JSON body alongside it — surface
      // that instead of letting a partial archive look complete.
      const truncated = res.headers.get("X-Zip-Truncated") === "true"
      const includedCount = res.headers.get("X-Zip-Included-Photos")
      const totalCount = res.headers.get("X-Zip-Total-Photos")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${event.slug || "event"}-print-ready.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (truncated && includedCount && totalCount) {
        toast({
          title: "Download started (partial)",
          description: `This ZIP includes ${includedCount} of ${totalCount} photos — the rest exceeded the per-download size/count limit.`,
        })
      } else {
        toast({ title: "Download started", description: "Your print-ready photos are downloading as a ZIP." })
      }
    } catch (err: any) {
      toast({ title: "Couldn't download photos", description: err?.message || "Please try again.", variant: "destructive" })
    } finally {
      setIsDownloadingZip(false)
    }
  }

  const handleCopyJoinCode = () => {
    if (!event?.join_code) return
    navigator.clipboard.writeText(event.join_code)
    setCodeCopied(true)
    toast({ title: "Join code copied to clipboard!" })
    setTimeout(() => setCodeCopied(false), 2000)
  }

  // Rotates the event's join code via the SECURITY DEFINER RPC (migrations/
  // 0023_event_join_code.sql) — e.g. if the old code leaked or the host wants
  // to cut off anyone who has it. The old code stops resolving immediately.
  const handleRegenerateJoinCode = async () => {
    if (!event || regeneratingCode) return
    setRegeneratingCode(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc("regenerate_event_join_code", { p_event_id: event.id })
      if (error) throw error
      queryClient.setQueryData(["event", slug, orgId], (prev: Event | undefined) =>
        prev ? { ...prev, join_code: data as string } : prev
      )
      toast({ title: "New join code generated", description: "The old code no longer works." })
    } catch (err: any) {
      toast({ title: "Couldn't regenerate the code", description: err?.message, variant: "destructive" })
    } finally {
      setRegeneratingCode(false)
    }
  }

  // These back the shared media lightbox opened from the activity timeline
  // below. They call the same public endpoint the guest gallery uses, then
  // apply the server-returned (canonical, merged) reactions/comments both to
  // the react-query cache AND directly to `activeLightboxMedia`.
  //
  // The second part matters: activeLightboxMedia is a one-off local snapshot
  // captured via toLightboxMedia() at the moment the lightbox was opened
  // (see setActiveLightboxMedia below). invalidateQueries() alone refetches
  // the `event-photos` list, but that refetch flows into the `photos` array,
  // not into this already-detached snapshot — so without patching it here
  // directly, the open lightbox would keep showing stale counts (e.g.
  // "Wishes & Comments (0)") forever, even though the save succeeded and the
  // background grid updated. This previously caused reactions/comments to
  // look like a silent no-op on the host dashboard.
  async function handleDashboardReact(photoId: string, emoji: string) {
    try {
      const res = await fetch(`/api/photos/${photoId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      if (!res.ok) throw new Error(`Reaction request failed (${res.status})`)
      const { data } = await res.json()
      const reactions = data?.reactions
      if (reactions) {
        setActiveLightboxMedia((prev) =>
          prev && prev.id === photoId ? { ...prev, metadata: { ...prev.metadata, reactions } } : prev
        )
      }
      queryClient.invalidateQueries({ queryKey: ["event-photos", event?.id] })
    } catch (err) {
      toast({ title: "Couldn't save reaction", variant: "destructive" })
    }
  }

  async function handleDashboardComment(photoId: string, text: string, author: string) {
    try {
      const res = await fetch(`/api/photos/${photoId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: text, author_name: author }),
      })
      if (!res.ok) throw new Error(`Comment request failed (${res.status})`)
      const { data } = await res.json()
      const comments = data?.comments
      if (comments) {
        setActiveLightboxMedia((prev) =>
          prev && prev.id === photoId ? { ...prev, metadata: { ...prev.metadata, comments } } : prev
        )
      }
      queryClient.invalidateQueries({ queryKey: ["event-photos", event?.id] })
    } catch (err) {
      toast({ title: "Couldn't save comment", variant: "destructive" })
    }
  }

  async function handleDashboardVoiceComment(photoId: string, file: File, author: string) {
    try {
      const fd = new FormData()
      fd.set("audio", file)
      fd.set("author_name", author)
      const res = await fetch(`/api/photos/${photoId}/react`, { method: "POST", body: fd })
      if (!res.ok) throw new Error("Upload failed")
      const { data } = await res.json()
      const comments = data?.comments
      if (comments) {
        setActiveLightboxMedia((prev) =>
          prev && prev.id === photoId ? { ...prev, metadata: { ...prev.metadata, comments } } : prev
        )
      }
      queryClient.invalidateQueries({ queryKey: ["event-photos", event?.id] })
    } catch (err) {
      toast({ title: "Couldn't save voice reply", variant: "destructive" })
    }
  }

  const [sharing, setSharing] = useState<"native" | "whatsapp" | null>(null)

  // Builds the same branded invitation card the host designed in the event
  // wizard's "Design your invitation experience" step — cover photo, theme,
  // welcome message, event date, and the live QR — as a single PNG. Sharing
  // this (instead of a bare link) is the whole point: guests should receive
  // what the host actually designed, not a generic scan code.
  async function buildCard(): Promise<{ blob: Blob; caption: string } | null> {
    if (!event) return null
    const invitation = (event.settings as any)?.invitation as
      | { theme?: string; welcome_message?: string }
      | undefined
    const theme = (invitation?.theme as InvitationTheme) || "minimal"
    const welcomeMessage = invitation?.welcome_message || "Scan to capture and share moments with us."

    // The canvas-drawn invitation card needs an actual resolved font-family
    // string (not a CSS class), so read the --font-playfair custom property
    // the root layout already applies globally via next/font's `.variable`
    // class — this avoids instantiating a second, duplicate Playfair Display
    // fetch here just to get its generated font name.
    const headingFontFamily = typeof window !== "undefined"
      ? getComputedStyle(document.body).getPropertyValue("--font-playfair").trim() || undefined
      : undefined

    const blob = await generateInvitationCard({
      eventName: event.name,
      welcomeMessage,
      theme,
      eventDate: event.event_date,
      coverImageUrl: event.cover_image_url,
      inviteUrl: publicEventUrl,
      qrSvgElementId: "event-dashboard-qr",
      headingFontFamily,
      joinCode: event.join_code,
    })
    if (!blob) return null
    return { blob, caption: buildInvitationCaption(event.name, welcomeMessage, publicEventUrl, event.join_code) }
  }

  // Primary share action. Mobile browsers with the Web Share API (the only
  // way a website can hand an image to an arbitrary installed app — there's
  // no web URL scheme that opens Instagram with a pre-attached image) get a
  // single tap that opens the OS share sheet with WhatsApp, Instagram,
  // Messages etc. all listed and the card already attached. Desktop browsers
  // don't support sharing files this way, so we fall back to downloading the
  // card and copying the caption instead.
  async function handleShareInvitation() {
    if (!event || sharing) return
    setSharing("native")
    try {
      const built = await buildCard()
      if (!built) {
        toast({ title: "Couldn't build the invitation card", variant: "destructive" })
        return
      }
      const file = new File([built.blob], `${event.slug}-invitation.png`, { type: "image/png" })
      const shareData: ShareData = {
        title: event.name,
        text: built.caption,
        files: [file],
      }
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData)
        return
      }
      // Desktop fallback: download the card + copy the caption so the host
      // can attach it manually wherever they want to post it.
      const url = URL.createObjectURL(built.blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      await navigator.clipboard.writeText(built.caption)
      toast({ title: "Invitation card downloaded", description: "Caption copied too — share it on WhatsApp, Instagram, or anywhere else." })
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast({ title: "Sharing failed", description: err?.message, variant: "destructive" })
      }
    } finally {
      setSharing(null)
    }
  }

  // Explicit WhatsApp button: wa.me only supports pre-filled text, not an
  // attached image, so we download the card alongside opening the chat
  // composer and tell the host to attach it — same trade-off every website
  // without native share hits, but at least WhatsApp is reachable in one tap
  // instead of hoping the visitor's browser supports Web Share.
  async function handleShareWhatsApp() {
    if (!event || sharing) return
    setSharing("whatsapp")
    try {
      const built = await buildCard()
      if (!built) {
        toast({ title: "Couldn't build the invitation card", variant: "destructive" })
        return
      }
      const url = URL.createObjectURL(built.blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${event.slug}-invitation.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      window.open(`https://wa.me/?text=${encodeURIComponent(built.caption)}`, "_blank")
      toast({ title: "Card downloaded", description: "Attach it in WhatsApp along with the message." })
    } catch (err: any) {
      toast({ title: "Sharing failed", description: err?.message, variant: "destructive" })
    } finally {
      setSharing(null)
    }
  }

  // Server state queries with 3-second live refetch polling for real-time dashboard updates
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", slug, orgId],
    queryFn: () => getEvent(slug, orgId!),
    enabled: !!orgId,
  })

  const { data: photos = [] } = useQuery({
    queryKey: ["event-photos", event?.id],
    queryFn: () => getEventPhotos(event!.id),
    enabled: !!event?.id,
    refetchInterval: 3000, // 3-second polling ensures live counts and uploads sync automatically
  })

  const { data: faceClusters = [] } = useQuery({
    queryKey: ["face-clusters", event?.id],
    queryFn: () => getFaceClusters(event!.id),
    enabled: !!event?.id,
    refetchInterval: 5000,
  })

  const { data: liveWallMessages = [] } = useQuery({
    queryKey: ["live-wall-messages", event?.id],
    queryFn: () => getLiveWallMessages(event!.id),
    enabled: !!event?.id,
    refetchInterval: 3000, // 3-second live polling
  })

  const { data: photoAccess = [] } = useQuery({
    queryKey: ["photo-access", event?.id],
    queryFn: () => getPhotoAccess(event!.id),
    enabled: !!event?.id,
    // No realtime listener for photo_access — keep a 10s safety-net poll.
    refetchInterval: 10000,
  })

  // Advisory plan-gate check for Recap Video / AI Smart Clusters / Download
  // All — fetched once per event load so the UI can show a calm disabled
  // state with an "upgrade" tag instead of letting the host click into a
  // 403 from the actual action route. Not refetched on an interval since
  // plan tier doesn't change mid-session; invalidated implicitly on next
  // event load / navigation.
  const { data: featureAccess } = useQuery({
    queryKey: ["feature-access", event?.id],
    queryFn: () => getFeatureAccess(event!.id),
    enabled: !!event?.id,
  })
  const recapAllowed = featureAccess?.recap_video?.allowed ?? true
  const faceSearchAllowed = featureAccess?.ai_face_search?.allowed ?? true
  const downloadAllAllowed = featureAccess?.print_ready_downloads?.allowed ?? true

  // Supabase Realtime live stream listener for instant push updates
  useEffect(() => {
    if (!event?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`live-dashboard-${event.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos", filter: `event_id=eq.${event.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["event-photos", event.id] })
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_wall_items", filter: `event_id=eq.${event.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["live-wall-messages", event.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event?.id, queryClient])

  // Mutate endpoints
  const updateMutation = useMutation({
    mutationFn: (data: any) => updateEvent(slug, data, event?.settings || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", slug] })
      // The Events list / Dashboard Overview cards (name, status, cover)
      // read from their own separate cached queries — without this they'd
      // keep showing the pre-edit values until a hard refresh.
      queryClient.invalidateQueries({ queryKey: ["events"] })
      queryClient.invalidateQueries({ queryKey: ["events-list"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({ title: "Memory settings saved" })
      setIsDrawerOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      // Invalidate before navigating, otherwise the Events list can still
      // render the just-deleted event from its stale cache after redirect.
      queryClient.invalidateQueries({ queryKey: ["events"] })
      queryClient.invalidateQueries({ queryKey: ["events-list"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["galleries"] })
      queryClient.invalidateQueries({ queryKey: ["all-qrcodes"] })
      toast({ title: "Capsule deleted successfully" })
      router.push("/dashboard/events")
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete event", description: error.message, variant: "destructive" })
    }
  })

  // --- Recap Video (highlight reel) ---
  // The generate call is a long-running synchronous request (up to ~300s,
  // same pattern as /api/events/[id]/download-zip) — no job-queue/polling
  // endpoint. We await the full response, then invalidate the event query
  // (same queryKey pattern as updateMutation above) so the server-persisted
  // settings.recap_video survives a hard refresh, not just local state.
  const recapVideo = (event?.settings as ExtEventSettings | undefined)?.recap_video
  const recapServerStatus: "idle" | "rendering" | "ready" | "failed" = recapVideo?.status || "idle"

  const [recapMood, setRecapMood] = useState<"joyful" | "sentimental">("joyful")
  // Forces the mood-selector view back open after "Regenerate" / "Try Again"
  // even though the server-persisted status is still "ready"/"failed".
  const [recapViewOverride, setRecapViewOverride] = useState(false)

  useEffect(() => {
    if (recapVideo?.mood) setRecapMood(recapVideo.mood)
  }, [recapVideo?.mood])

  const recapMutation = useMutation({
    mutationFn: async (mood: "joyful" | "sentimental") => {
      if (!event?.id) throw new Error("Missing event id")
      const res = await fetch(`/api/events/${event.id}/recap/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || `Recap generation failed (${res.status})`)
      }
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", slug] })
      setRecapViewOverride(false)
      toast({ title: "Recap video ready!", description: "Your highlight reel has been generated." })
    },
    onError: (error: Error) => {
      // The backend also persists a "failed" status onto settings.recap_video
      // server-side — invalidate so a refresh reflects that too, not just
      // this in-memory mutation error.
      queryClient.invalidateQueries({ queryKey: ["event", slug] })
      toast({ title: "Couldn't generate recap", description: error.message, variant: "destructive" })
    },
  })

  // "Initiate New Face Match" used to be a plain <Button> with no onClick at
  // all — clicking it did nothing. Detection also never ran automatically,
  // so this is the host's only manual way to (re)process this event's
  // photos. Feeds all current photo IDs to the batch-process route, which
  // now actually persists detected faces and assigns them into
  // face_clusters (see src/lib/integrations/face.ts detectAndStoreFaces).
  const faceMatchMutation = useMutation({
    mutationFn: async () => {
      if (!event?.id) throw new Error("Missing event id")
      const photoIds = photos
        .filter((p: any) => !p.mime_type?.startsWith("video/") && !p.mime_type?.startsWith("audio/"))
        .map((p: any) => p.id)
        .slice(0, 500)
      if (photoIds.length === 0) throw new Error("No photos to scan yet.")
      const res = await fetch(`/api/ai/faces/batch-process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id, photo_ids: photoIds }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || `Face match failed (${res.status})`)
      }
      return json.data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["face-clusters", event?.id] })
      queryClient.invalidateQueries({ queryKey: ["event-photos", event?.id] })
      const errorCount = Array.isArray(data?.errors) ? data.errors.length : 0
      // A 200 with processed=0 used to look identical to "ran fine, no
      // faces in these photos" — surface the first real error instead of
      // hiding it, so a genuine failure (model/storage/etc.) is visible
      // here rather than only in server logs.
      if (errorCount > 0 && (data?.processed ?? 0) === 0) {
        toast({
          title: "Face match ran into errors",
          description: `${errorCount} photo(s) failed to process. First error: ${data.errors[0]?.error ?? "unknown"}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Face match complete",
          description: `Scanned ${data?.processed ?? 0} photo(s), found ${data?.facesDetected ?? 0} face(s).${errorCount > 0 ? ` (${errorCount} failed)` : ""}`,
        })
      }
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't run face match", description: error.message, variant: "destructive" })
    },
  })

  // Effective status shown by the card: in-flight mutation and the
  // Regenerate/Try Again override both take priority over whatever the
  // server currently has persisted.
  const recapStatus: "idle" | "rendering" | "ready" | "failed" = recapMutation.isPending
    ? "rendering"
    : recapViewOverride
      ? "idle"
      : recapMutation.isError
        ? "failed"
        : recapServerStatus

  const recapErrorMessage =
    recapMutation.error?.message ||
    recapVideo?.error ||
    "Something went wrong generating your recap. Please try again."

  const handleGenerateRecap = () => {
    recapMutation.mutate(recapMood)
  }

  const handleResetRecap = () => {
    recapMutation.reset()
    setRecapViewOverride(true)
  }

  const handleShareRecap = () => {
    if (!recapVideo?.video_url) return
    const shareData = { title: `${event?.name || "Event"} — Recap Video`, url: recapVideo.video_url }
    // Scoped to a local `nav` const (rather than narrowing the global `navigator`
    // via `"share" in navigator`) — the `in`-based narrowing previously collapsed
    // the else-if branch's `navigator` type to `never` under this codebase's lib
    // config, which failed the production type-check.
    const nav = typeof navigator !== "undefined" ? navigator : undefined
    if (nav && typeof (nav as any).share === "function") {
      ;(nav as any).share(shareData).catch(() => {})
    } else if (nav) {
      nav.clipboard?.writeText(recapVideo.video_url)
      toast({ title: "Link copied", description: "Recap video link copied to clipboard." })
    }
  }

  // Local Form state for settings edits
  const [editName, setEditName] = useState("")
  const [editStatus, setEditStatus] = useState<EventStatus>("published")
  const [editEndDate, setEditEndDate] = useState("")
  const [editAllowedFilters, setEditAllowedFilters] = useState<string[]>([])
  const [editVideoDuration, setEditVideoDuration] = useState<number>(10)
  const [editVoiceDuration, setEditVoiceDuration] = useState<number>(10)

  useEffect(() => {
    if (event) {
      setEditName(event.name)
      setEditStatus(event.status as EventStatus)
      setEditEndDate(event.end_date ? toDatetimeLocalValue(event.end_date) : "")
      setEditAllowedFilters((event.settings as ExtEventSettings)?.allowed_filters || ["normal", "golden_hour", "vintage", "bw", "cinematic", "vivid", "cyberpunk", "dreamy"])
      setEditVideoDuration((event.settings as ExtEventSettings)?.video_duration_limit || 10)
      setEditVoiceDuration((event.settings as ExtEventSettings)?.voice_note_duration_limit || 10)
    }
  }, [event, isDrawerOpen])

  // Countdown timer calculation
  useEffect(() => {
    if (!event?.end_date) return
    const target = new Date(event.end_date).getTime()

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const diff = target - now

      if (diff <= 0) {
        setCountdownText("Capsule Locked")
        clearInterval(interval)
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setCountdownText(`${days}d ${hours}h ${minutes}m ${seconds}s`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [event])

  if (authLoading || eventLoading) {
    return (
      <div className="min-h-screen bg-[#141110] p-8 space-y-6 flex flex-col justify-center items-center">
        <Skeleton className="h-12 w-64 rounded-xl !bg-white/10" />
        <Skeleton className="h-64 w-full max-w-4xl rounded-2xl !bg-white/10" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#141110] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Camera className="h-12 w-12 text-[#D4AF37]" />
        <h2 className="font-playfair text-2xl font-light text-white/90">Experience Capsule Not Found</h2>
        <Button asChild className="rounded-full bg-[#D4AF37] hover:bg-[#c19f2e] text-[#141110] font-semibold">
          <Link href="/dashboard/events">Return to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const settings = (event.settings || {}) as ExtEventSettings

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const getImageUrl = (path: string | null, fallback: string = "/placeholder.png") => {
    if (!path) return fallback
    if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path
    return `${supabaseUrl}/storage/v1/object/public/photos/${path}`
  }

  // Converts a raw `photos` row into the shape the shared media viewer
  // (src/lib/components/media/media-lightbox.tsx) expects, so the host
  // dashboard's activity timeline can open the exact same full-size
  // viewer + reactions/comments/voice-reply panel as the guest gallery,
  // instead of the previous behavior where clicking a thumbnail did nothing
  // (or, for the photo grid, silently triggered a download on hover-click).
  const toLightboxMedia = (p: any): LightboxMedia => ({
    id: p.id,
    original_filename: p.original_filename || "Untitled",
    uploader_name: p.uploader_name || null,
    mime_type: p.mime_type || null,
    created_at: p.created_at,
    url: p.storage_path ? getImageUrl(p.storage_path) : null,
    metadata: p.metadata || {},
  })

  // Dynamic guest processing
  const dynamicGuestsMap = new Map()
  photos.forEach((p: any) => {
    const name = p.uploader_name || "Anonymous Guest"
    if (!dynamicGuestsMap.has(name)) {
      dynamicGuestsMap.set(name, {
        name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        count: 1
      })
    } else {
      dynamicGuestsMap.get(name).count += 1
    }
  })
  const dynamicGuests = Array.from(dynamicGuestsMap.values()).sort((a: any, b: any) => b.count - a.count)

  const dynamicAiMatches = faceClusters.map((c: any) => ({
    id: c.id,
    label: c.label || "Unknown Group",
    photoCount: c.face_count || 0,
    cover: getImageUrl(c.representative_face?.photo?.thumbnail_path || c.representative_face?.photo?.storage_path)
  }))

  const rawTimelineItems: any[] = []
  const justPhotos: any[] = []

  photos.forEach((p: any) => {
    if (p.mime_type?.startsWith("video/")) {
      rawTimelineItems.push({
        id: p.id,
        type: "video",
        guest: p.uploader_name || "Anonymous",
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.uploader_name || "A")}&background=random`,
        time: new Date(p.created_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(p.created_at).getTime(),
        videoUrl: getImageUrl(p.storage_path, ""),
        thumbnail: p.thumbnail_path ? getImageUrl(p.thumbnail_path, "") : undefined,
        title: p.original_filename || "Video clip",
        duration: "0:15",
        raw: p,
      })
    } else if (p.mime_type?.startsWith("audio/")) {
      rawTimelineItems.push({
        id: p.id,
        type: "voice",
        guest: p.uploader_name || "Anonymous",
        category: "Voice Note",
        duration: "0:30",
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.uploader_name || "A")}&background=random`,
        time: new Date(p.created_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(p.created_at).getTime(),
        audioUrl: getImageUrl(p.storage_path, ""),
        raw: p,
      })
    } else {
      justPhotos.push(p)
    }
  })

  // Group photos
  const photoGroups = new Map()
  justPhotos.forEach((p: any) => {
    const key = p.uploader_name || "Anonymous"
    if (!photoGroups.has(key)) {
      photoGroups.set(key, {
        id: `pg-${p.id}`,
        type: "photo_group",
        guest: key,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(key)}&background=random`,
        time: new Date(p.created_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(p.created_at).getTime(),
        photos: []
      })
    }
    photoGroups.get(key).photos.push(p)
  })
  rawTimelineItems.push(...Array.from(photoGroups.values()))

  // Messages
  liveWallMessages.forEach((m: any) => {
    const name = m.photo?.uploader_name || "Anonymous"
    rawTimelineItems.push({
      id: m.id,
      type: "message",
      guest: name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      time: new Date(m.created_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(m.created_at).getTime(),
      content: m.message,
      reaction: m.pinned ? "📌" : "💬"
    })
  })

  const dynamicTimeline = rawTimelineItems.sort((a, b) => b.timestamp - a.timestamp)

  // Activities
  const dynamicActivities: any[] = []
  photoAccess.forEach((a: any) => {
    dynamicActivities.push({
      actor: a.guest_name || "Someone",
      action: "joined the capsule page",
      time: new Date(a.accessed_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(a.accessed_at).getTime(),
    })
  })
  
  dynamicTimeline.slice(0, 8).forEach((t: any) => {
    if (t.type === "photo_group") dynamicActivities.push({ actor: t.guest, action: `uploaded ${t.photos.length} photos`, time: t.time, timestamp: t.timestamp })
    if (t.type === "video") dynamicActivities.push({ actor: t.guest, action: `uploaded a video`, time: t.time, timestamp: t.timestamp })
    if (t.type === "message") dynamicActivities.push({ actor: t.guest, action: `left a message`, time: t.time, timestamp: t.timestamp })
    if (t.type === "voice") dynamicActivities.push({ actor: t.guest, action: `shared a voice note`, time: t.time, timestamp: t.timestamp })
  })
  dynamicActivities.sort((a, b) => b.timestamp - a.timestamp)

  // Filter contributions
  const filteredTimeline = dynamicTimeline.filter((item) => {
    if (activeMediaTab === "all") return true
    if (activeMediaTab === "photos") return item.type === "photo_group"
    if (activeMediaTab === "videos") return item.type === "video"
    if (activeMediaTab === "voices") return item.type === "voice"
    if (activeMediaTab === "messages") return item.type === "message"
    return false
  })

  // Format stats counts
  const totalPhotosCount = justPhotos.length
  const totalVideosCount = dynamicTimeline.filter(t => t.type === "video").length
  const totalVoicesCount = dynamicTimeline.filter(t => t.type === "voice").length
  const totalMessagesCount = dynamicTimeline.filter(t => t.type === "message").length
  const totalGuestsCount = dynamicGuests.length
  const totalAiClusters = dynamicAiMatches.length

  const handleUpdateSave = (e: React.FormEvent) => {
    e.preventDefault()
    // This "Countdown Ends Lock Date" field drives two things that were
    // previously out of sync: this dashboard's own "Unlocking Capsule"
    // countdown (reads the top-level end_date column) AND the guest-facing
    // reveal gate on the public event page (event/[slug]/page.tsx's
    // isRevealed/visibleGalleries, which read settings.countdown_date
    // instead). Only end_date was ever updated here, so changing this date
    // after creation updated what the host saw on this dashboard while
    // guests stayed locked to (or revealed by) whatever date was set when
    // the event was first created. Keep both fields in lockstep on save.
    const isoEndDate = editEndDate ? new Date(editEndDate).toISOString() : null
    updateMutation.mutate({
      name: editName,
      status: editStatus,
      end_date: editEndDate,
      settings: {
        ...event?.settings,
        allowed_filters: editAllowedFilters,
        video_duration_limit: Number(editVideoDuration),
        voice_note_duration_limit: Number(editVoiceDuration),
        ...(isoEndDate ? { countdown_date: isoEndDate } : {}),
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#141110] text-white/90 flex flex-col font-sans selection:bg-[#D4AF37]/30 pb-16">

      {/* Top Banner Navigation */}
      <header className="px-4 py-4 sm:px-6 bg-[#1C1814] border-b border-[#3D332A] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard/events" className="shrink-0 p-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-white/70" />
            </Link>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold block">Memory Capsule</span>
              <h1 className="font-playfair text-xl md:text-2xl font-light text-white truncate">{event.name}</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {downloadAllAllowed ? (
              <Button
                variant="outline"
                onClick={handleDownloadZip}
                disabled={isDownloadingZip}
                className="rounded-full border border-white/15 bg-transparent text-white hover:bg-white/5 text-xs flex items-center gap-1"
                title="Download all approved photos as a print-ready ZIP"
              >
                {isDownloadingZip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span>{isDownloadingZip ? "Preparing ZIP…" : "Download All"}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                aria-disabled="true"
                title={featureAccess?.print_ready_downloads?.reason || "Print-ready downloads require a paid plan"}
                className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]/70 text-xs flex items-center gap-1.5 cursor-not-allowed opacity-80 hover:bg-[#D4AF37]/10"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download All</span>
                <span className="text-[9px] font-bold uppercase tracking-wide border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full px-1.5 py-0.5 ml-0.5">
                  Upgrade
                </span>
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-full border border-white/15 bg-transparent text-white hover:bg-white/5 text-xs">
              <Link href={`/event/${event.slug}`} target="_blank" className="flex items-center gap-1">
                <span>Live Portal</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
            <Button
              onClick={() => setIsDrawerOpen(true)}
              className="rounded-full bg-[#D4AF37] text-[#141110] hover:bg-[#c19f2e] text-xs font-semibold flex items-center gap-1 border-none cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Stats Board */}
      <section className="bg-gradient-to-b from-[#1C1814]/60 to-transparent py-8 px-4 sm:px-6 border-b border-[#3D332A]/60">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

          {/* Circular/Visual Metrics Widget */}
          <div className="md:col-span-2 grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Photos", value: totalPhotosCount, icon: ImageIcon },
              { label: "Videos", value: totalVideosCount, icon: Video },
              { label: "Voice Notes", value: totalVoicesCount, icon: Mic },
              { label: "Messages", value: totalMessagesCount, icon: MessageSquare },
              { label: "Guests", value: totalGuestsCount, icon: Users },
              { label: "AI Matches", value: totalAiClusters, icon: Sparkles },
            ].map((stat, idx) => (
              <div key={idx} className="rounded-2xl border border-[#3D332A] bg-[#1C1814] p-3 text-center space-y-1.5 hover:border-[#D4AF37]/40 transition-all">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mx-auto">
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl font-bold text-[#D4AF37]">{stat.value}</p>
                  <p className="text-[9px] uppercase tracking-wider text-white/60 font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Capsule countdown indicator circle */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-bold">Unlocking Capsule</span>
              <p className="font-playfair text-xl font-bold text-white tabular-nums">{countdownText || "Calculating..."}</p>
              <p className="text-[10px] text-white/60">Revealing memories automatically</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#D4AF37]/30 border-t-[#D4AF37] flex items-center justify-center animate-spin shrink-0" style={{ animationDuration: "10s" }}>
              <Clock className="h-5 w-5 text-[#D4AF37] rotate-[-45deg]" />
            </div>
          </div>

        </div>
      </section>

      {/* Master Workspace Layout */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Memory timeline */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#3D332A] pb-3">
            <h2 className="font-playfair text-2xl font-light text-white">Memory Timeline</h2>

            {/* Timeline content filters */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 rounded-full text-xs">
              {[
                { id: "all", label: "All" },
                { id: "photos", label: "Photos" },
                { id: "videos", label: "Videos" },
                { id: "voices", label: "Voices" },
                { id: "messages", label: "Messages" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMediaTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    activeMediaTab === tab.id ? "bg-[#D4AF37] text-[#141110] font-bold" : "text-white/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chronological media timeline content list */}
          <div className="space-y-6 relative before:absolute before:top-4 before:bottom-4 before:left-6 before:w-0.5 before:bg-[#3D332A]">
            
            <AnimatePresence mode="popLayout">
              


              {/* Dynamic filtered Mock Timeline items (voice, videos, messages) */}
              {filteredTimeline.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="timeline-item flex gap-4 items-start relative z-10"
                >
                  <div className="w-12 h-12 rounded-full border-4 border-[#141110] bg-[#1C1814] flex items-center justify-center shrink-0 relative">
                    <img src={item.avatar} alt={item.guest} className="w-full h-full object-cover rounded-full" />
                    <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-[#1C1814] border border-[#3D332A] flex items-center justify-center text-[10px]">
                      {item.type === "photo_group" && "📸"}
                      {item.type === "message" && "💌"}
                      {item.type === "voice" && "🎤"}
                      {item.type === "video" && "🎥"}
                    </div>
                  </div>

                  <div className="flex-1 rounded-2xl border border-[#3D332A] bg-[#1C1814] p-4 space-y-3 hover:border-[#D4AF37]/30 transition-all">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white/90">{item.guest}</span>
                      <span className="text-white/50">{item.time}</span>
                    </div>

                    {/* Photo group display */}
                    {item.type === "photo_group" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {item.photos?.map((p: any, idx: number) => (
                            <div
                              key={idx}
                              className="aspect-square bg-white/5 rounded-lg overflow-hidden relative group cursor-pointer"
                              onClick={() => setActiveLightboxMedia(toLightboxMedia(p))}
                              title="View & react"
                            >
                              <img src={getImageUrl(p.thumbnail_path || p.storage_path)} alt="Upload" className="w-full h-full object-cover" />
                              {watermarkEnabled && <WatermarkOverlay />}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Search className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-[#D4AF37] font-semibold">Uploaded {item.photos?.length || 0} high-resolution prints to Capsule</p>
                      </div>
                    )}

                    {/* Messages content display */}
                    {item.type === "message" && (
                      <div className="space-y-2">
                        <blockquote className="text-sm italic text-white/70 leading-relaxed">
                          "{item.content}"
                        </blockquote>
                        <div className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 inline-block text-white/70">
                          {item.reaction}
                        </div>
                      </div>
                    )}

                    {/* Video player visual display */}
                    {item.type === "video" && (
                      <div className="space-y-2">
                        <div className="aspect-video bg-black rounded-xl overflow-hidden relative flex items-center justify-center group shadow-inner">
                          <video
                            src={item.videoUrl}
                            poster={item.thumbnail}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-contain"
                          >
                            Your browser does not support video playback.
                          </video>
                          {watermarkEnabled && <WatermarkOverlay />}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white/90">{item.title}</p>
                          <button
                            onClick={() => item.raw && setActiveLightboxMedia(toLightboxMedia(item.raw))}
                            className="text-[10px] font-bold text-[#D4AF37] hover:text-white flex items-center gap-1"
                          >
                            <MessageSquare className="h-3 w-3" /> React & Comment
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Voice audio card contribution */}
                    {item.type === "voice" && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl">
                          <audio
                            src={item.audioUrl}
                            controls
                            preload="none"
                            className="flex-1 h-10"
                          >
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                        <button
                          onClick={() => item.raw && setActiveLightboxMedia(toLightboxMedia(item.raw))}
                          className="text-[10px] font-bold text-[#D4AF37] hover:text-white flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" /> React & Comment
                        </button>
                      </div>
                    )}

                  </div>
                </motion.div>
              ))}

            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT COLUMN: AI matching & Activity feeds */}
        <div className="space-y-8">

          {/* Default Persistent Event QR Code Card with Custom Snapsy Logo */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4 text-center relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-4.5 w-4.5 text-[#D4AF37]" />
                <h3 className="text-sm font-bold text-white/90">Event QR Code</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live QR
              </span>
            </div>

            {/* Custom Branded QR Code Display (Full Logo Embedded behind QR matrix) */}
            <div className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center space-y-3 group">
              <div className="p-3 bg-white rounded-2xl shadow-lg shadow-black/30 border border-[#3D332A] relative overflow-hidden flex items-center justify-center">
                <img
                  src="/Favicon.png"
                  alt="Snapsy Logo Background"
                  className="absolute inset-0 w-full h-full object-contain opacity-25 p-2 pointer-events-none filter saturate-150"
                />
                <QRCodeSVG
                  id="event-dashboard-qr"
                  value={publicEventUrl}
                  size={200}
                  bgColor={"transparent"}
                  fgColor={"#1c1a17"}
                  level={"H"}
                  imageSettings={{
                    src: "/Favicon.png",
                    x: undefined,
                    y: undefined,
                    height: 48,
                    width: 48,
                    excavate: true,
                  }}
                  className="relative z-10"
                />
              </div>
              <div className="space-y-0.5 text-center">
                <p className="text-xs font-bold text-white/90">Scan to Upload Photos</p>
              </div>
            </div>

            {/* Short join code — no-scan fallback for guests who'd rather type
                a code than scan/paste a link (migrations/0023_event_join_code.sql). */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-2">
              <div className="text-left">
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">Or Join With Code</p>
                <p className="inline-block mt-1 text-base font-bold tracking-[0.2em] text-[#D4AF37] font-mono bg-[#141110] border border-[#3D332A] rounded-full px-3 py-1">
                  {event.join_code || "——————"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJoinCode}
                  disabled={!event.join_code}
                  className="h-10 w-10 p-0 rounded-full border border-white/15 bg-transparent hover:bg-white/10 text-white"
                  title="Copy code"
                >
                  {codeCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateJoinCode}
                  disabled={regeneratingCode}
                  className="h-10 w-10 p-0 rounded-full border border-white/15 bg-transparent hover:bg-white/10 text-white"
                  title="Generate a new code (old one stops working)"
                >
                  {regeneratingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Share the host-designed invitation card (cover photo, theme,
                welcome message from the event wizard + this QR) rather than
                a bare link — on mobile this opens the OS share sheet with
                WhatsApp/Instagram/etc. already listed and the card attached. */}
            <Button
              size="sm"
              onClick={handleShareInvitation}
              disabled={sharing !== null}
              className="w-full text-xs bg-[#D4AF37] hover:bg-[#c19f2e] text-[#141110] font-semibold flex items-center justify-center gap-1.5 rounded-full"
            >
              {sharing === "native" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>Share Invitation</span>
            </Button>

            {/* QR Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                disabled={sharing !== null}
                className="text-xs rounded-full border border-white/15 bg-transparent hover:bg-white/10 flex items-center justify-center gap-1 text-white px-2"
              >
                {sharing === "whatsapp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs rounded-full border border-white/15 bg-transparent hover:bg-white/10 flex items-center justify-center gap-1 text-white px-2"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadQr}
                className="text-xs rounded-full border border-white/15 bg-transparent hover:bg-white/10 flex items-center justify-center gap-1 text-white px-2"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">QR</span>
              </Button>
            </div>
          </div>

          {/* Recap Video card — auto-composed highlight reel with an
              animated stats intro, generated via the long-running
              POST /api/events/[id]/recap/generate route (same up-to-~300s
              synchronous pattern as the download-zip route: the client
              awaits the full response with a loading state, no polling). */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Film className="h-4.5 w-4.5 text-[#D4AF37]" />
                <h3 className="font-playfair text-lg font-light text-white">Recap Video</h3>
              </div>
              {recapStatus === "ready" && recapAllowed && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 capitalize">
                  {recapVideo?.mood}
                </span>
              )}
              {!recapAllowed && (
                <span className="text-[10px] font-bold uppercase tracking-wide border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full px-2 py-0.5 shrink-0">
                  Premium feature
                </span>
              )}
            </div>

            {(recapStatus === "idle" || recapStatus === "rendering") && (
              <div className="space-y-4">
                <p className="text-xs text-white/60">Turn your event into a highlight reel — an auto-composed video with an animated stats intro built from your photos, videos, and messages.</p>

                {recapAllowed ? (
                  <>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Recap mood">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={recapMood === "joyful"}
                        disabled={recapStatus === "rendering"}
                        onClick={() => setRecapMood("joyful")}
                        className={`rounded-2xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed ${
                          recapMood === "joyful"
                            ? "border-[#D4AF37] bg-[#D4AF37]/10"
                            : "border-white/15 bg-transparent hover:bg-white/5"
                        }`}
                      >
                        <p className="text-xs font-bold text-white/90">Joyful</p>
                        <p className="text-[10px] text-white/50 mt-0.5">Upbeat and vibrant</p>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={recapMood === "sentimental"}
                        disabled={recapStatus === "rendering"}
                        onClick={() => setRecapMood("sentimental")}
                        className={`rounded-2xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed ${
                          recapMood === "sentimental"
                            ? "border-[#D4AF37] bg-[#D4AF37]/10"
                            : "border-white/15 bg-transparent hover:bg-white/5"
                        }`}
                      >
                        <p className="text-xs font-bold text-white/90">Sentimental</p>
                        <p className="text-[10px] text-white/50 mt-0.5">Warm and reflective</p>
                      </button>
                    </div>

                    {recapStatus === "rendering" ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center border border-white/10 bg-white/5 rounded-2xl">
                        <Loader2 className="h-5 w-5 text-[#D4AF37] animate-spin" />
                        <p className="text-xs font-semibold text-white/80">Composing your recap… this can take a few minutes</p>
                        <p className="text-[10px] text-white/50">You can leave this page — we'll save it here when it's ready.</p>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleGenerateRecap}
                        disabled={recapMutation.isPending}
                        className="w-full text-xs bg-[#D4AF37] hover:bg-[#c19f2e] text-[#141110] font-semibold flex items-center justify-center gap-1.5 rounded-full"
                      >
                        <Film className="h-3.5 w-3.5" />
                        <span>Generate Recap</span>
                      </Button>
                    )}
                  </>
                ) : (
                  // Locked state — this event's plan doesn't include Recap Video.
                  // Shown up front instead of letting the host click "Generate
                  // Recap" and land on a 403 after the fact.
                  <div className="space-y-3">
                    <div
                      className="grid grid-cols-2 gap-2 opacity-40 pointer-events-none select-none"
                      aria-hidden="true"
                    >
                      <div className="rounded-2xl border border-white/15 bg-transparent p-3 text-left">
                        <p className="text-xs font-bold text-white/70">Joyful</p>
                        <p className="text-[10px] text-white/40 mt-0.5">Upbeat and vibrant</p>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-transparent p-3 text-left">
                        <p className="text-xs font-bold text-white/70">Sentimental</p>
                        <p className="text-[10px] text-white/40 mt-0.5">Warm and reflective</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled
                      aria-disabled="true"
                      title={featureAccess?.recap_video?.reason || "Recap Video requires a paid plan"}
                      className="w-full text-xs bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37]/70 font-semibold flex items-center justify-center gap-1.5 rounded-full cursor-not-allowed pointer-events-none opacity-90"
                    >
                      <Film className="h-3.5 w-3.5" />
                      <span>Generate Recap</span>
                    </Button>
                    <p className="text-[10px] text-white/40 text-center">Upgrade your plan to unlock recap videos for this event.</p>
                  </div>
                )}
              </div>
            )}

            {recapStatus === "ready" && recapVideo?.video_url && (
              <div className="space-y-3">
                <video
                  src={recapVideo.video_url}
                  controls
                  playsInline
                  preload="metadata"
                  poster={event?.cover_image_url || undefined}
                  className="w-full aspect-video rounded-2xl border border-white/10 bg-black"
                >
                  Your browser does not support video playback.
                </video>

                <p className="text-[10px] text-white/50 text-center">
                  {recapVideo.stats
                    ? `${recapVideo.stats.guests} guests · ${recapVideo.stats.photos} photos · ${recapVideo.stats.videos} videos · ${recapVideo.stats.voiceNotes} voice notes`
                    : `${totalGuestsCount} guests · ${totalPhotosCount} photos · ${totalVideosCount} videos · ${totalVoicesCount} voice notes`}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={forceDownloadUrl(recapVideo.video_url, `${event.slug || "event"}-recap.mp4`)}
                    download
                    className="rounded-full border border-white/15 bg-transparent hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                  <button
                    type="button"
                    onClick={handleShareRecap}
                    className="rounded-full border border-white/15 bg-transparent hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetRecap}
                  className="w-full text-[11px] font-semibold text-white/60 hover:text-white flex items-center justify-center gap-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-full"
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
              </div>
            )}

            {recapStatus === "failed" && (
              <div className="space-y-3 text-center py-2">
                <AlertCircle className="h-6 w-6 text-red-400 mx-auto" />
                <p className="text-xs text-white/70">{recapErrorMessage}</p>
                <Button
                  size="sm"
                  onClick={handleResetRecap}
                  className="w-full text-xs bg-[#D4AF37] hover:bg-[#c19f2e] text-[#141110] font-semibold rounded-full"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>

          {/* AI Matches clustered panel */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-[#D4AF37]" />
                <h3 className="text-sm font-bold text-white/90">AI Smart Clusters</h3>
              </div>
              {!faceSearchAllowed && (
                <span className="text-[10px] font-bold uppercase tracking-wide border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full px-2 py-0.5 shrink-0">
                  Premium feature
                </span>
              )}
            </div>

            <div className="space-y-3">
              {dynamicAiMatches.length > 0 ? dynamicAiMatches.map((cluster) => (
                <div key={cluster.id} className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <img src={cluster.cover} alt="Cluster Cover" className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" />
                    <div>
                      <p className="font-semibold text-white/90">{cluster.label}</p>
                      <p className="text-[10px] text-white/50">{cluster.photoCount} match files</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </div>
              )) : (
                <p className="text-xs text-white/50 text-center py-4">
                  {faceSearchAllowed ? "No smart clusters found yet." : "AI face clustering isn't included on this event's plan."}
                </p>
              )}
            </div>

            {faceSearchAllowed ? (
              <Button
                variant="outline"
                className="w-full text-xs py-5 rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
                disabled={faceMatchMutation.isPending}
                onClick={() => faceMatchMutation.mutate()}
              >
                <Search className={`h-3.5 w-3.5 ${faceMatchMutation.isPending ? "animate-spin" : ""}`} />
                <span>{faceMatchMutation.isPending ? "Scanning photos..." : "Initiate New Face Match"}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                aria-disabled="true"
                title={featureAccess?.ai_face_search?.reason || "AI Smart Clusters require a paid plan"}
                className="w-full text-xs py-5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]/70 flex items-center justify-center gap-1.5 cursor-not-allowed pointer-events-none opacity-90"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Initiate New Face Match</span>
              </Button>
            )}
          </div>

          {/* Recent Activity waterfall feed */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Activity className="h-4.5 w-4.5 text-[#D4AF37]" />
              <h3 className="text-sm font-bold text-white/90">Recent Guest Activity</h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              {dynamicActivities.length > 0 ? dynamicActivities.slice(0, 10).map((act, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 text-white/70 border-b border-white/5 pb-2.5 last:border-none last:pb-0">
                  <p>
                    <span className="font-bold text-white/90">{act.actor}</span> {act.action}
                  </p>
                  <span className="text-[9px] text-white/50 shrink-0">{act.time}</span>
                </div>
              )) : (
                <p className="text-xs text-white/50 text-center py-4">No recent activity.</p>
              )}
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Host Quick Tools</h3>

            <div className="grid grid-cols-2 gap-2.5">
              <Link href={`/dashboard/events/${event.slug}/qr`} className="p-3 border border-white/10 rounded-xl text-center space-y-1 hover:border-[#D4AF37]/50 transition-all bg-white/5">
                <QrCode className="h-4 w-4 text-[#D4AF37] mx-auto" />
                <p className="text-[10px] font-bold text-white/80">QR Manager</p>
              </Link>
              <Link href={`/dashboard/events/${event.slug}/gallery`} className="p-3 border border-white/10 rounded-xl text-center space-y-1 hover:border-[#D4AF37]/50 transition-all bg-white/5">
                <Images className="h-4 w-4 text-[#D4AF37] mx-auto" />
                <p className="text-[10px] font-bold text-white/80">Gallery Toggles</p>
              </Link>
            </div>
          </div>

        </div>

      </section>

      {/* SETTINGS DRAWER OVERLAY (Radix dialog equivalent but smoother drawer) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black"
            />
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
              className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-[#1C1814] border-l border-[#3D332A] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="font-playfair text-xl font-medium text-white">Edit Capsule Settings</h3>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                    <X className="h-5 w-5 text-white/60" />
                  </button>
                </div>

                <form onSubmit={handleUpdateSave} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-white/60">Event Name</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="!bg-white/5 border-white/15 !text-white placeholder:!text-white/30 focus-visible:!ring-[#D4AF37] focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="end_date" className="text-xs font-bold text-white/60">Countdown Ends Lock Date</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="!bg-white/5 border-white/15 !text-white placeholder:!text-white/30 focus-visible:!ring-[#D4AF37] focus:border-[#D4AF37] [color-scheme:dark]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-bold text-white/60">Event Status</Label>
                    <select
                      id="status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as EventStatus)}
                      className="w-full h-10 rounded-md border border-white/15 bg-white/5 text-white px-3 py-2 text-sm focus:border-[#D4AF37] outline-none [color-scheme:dark]"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published (Live)</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-white/60">Guest Camera Filters</Label>
                    <p className="text-[10px] text-white/50 mb-2">Select which premium filters guests can use.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "normal", name: "Normal" },
                        { id: "golden_hour", name: "Golden Hour" },
                        { id: "vintage", name: "Vintage" },
                        { id: "bw", name: "B&W" },
                        { id: "cinematic", name: "Cinematic" },
                        { id: "vivid", name: "Vivid" },
                        { id: "cyberpunk", name: "Cyberpunk" },
                        { id: "dreamy", name: "Dreamy" }
                      ].map(filter => (
                        <div key={filter.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`filter-${filter.id}`}
                            checked={editAllowedFilters.includes(filter.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditAllowedFilters(prev => [...prev, filter.id])
                              } else {
                                setEditAllowedFilters(prev => prev.filter(id => id !== filter.id))
                              }
                            }}
                            className="rounded border-white/20 bg-white/5 text-[#D4AF37] focus:ring-[#D4AF37]"
                          />
                          <Label htmlFor={`filter-${filter.id}`} className="text-xs text-white/80">{filter.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Settings toggle display list */}
                  <div className="border border-white/10 rounded-xl p-4 bg-white/5 space-y-4">
                    <p className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-bold">Capsule Locks & Limits</p>

                    <div className="flex items-center justify-between text-xs text-white/80">
                      <span>Auto face cluster indexing</span>
                      <span className="font-semibold text-white/60">{settings.ai_features?.face_search ? "Active" : "Inactive"}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-4 text-white/80">
                      <span className="shrink-0">Video durations allowed</span>
                      <select
                        value={editVideoDuration}
                        onChange={(e) => setEditVideoDuration(Number(e.target.value))}
                        className="rounded-lg border border-white/15 bg-[#141110] px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] [color-scheme:dark]"
                      >
                        <option value={5}>5 seconds</option>
                        <option value={10}>10 seconds</option>
                        <option value={15}>15 seconds</option>
                        <option value={20}>20 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>60 seconds</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-4 text-white/80">
                      <span className="shrink-0">Vocal note greetings allowed</span>
                      <select
                        value={editVoiceDuration}
                        onChange={(e) => setEditVoiceDuration(Number(e.target.value))}
                        className="rounded-lg border border-white/15 bg-[#141110] px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] [color-scheme:dark]"
                      >
                        <option value={5}>5 seconds</option>
                        <option value={10}>10 seconds</option>
                        <option value={15}>15 seconds</option>
                        <option value={20}>20 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>60 seconds</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-white/10">
                    <Button type="button" variant="outline" onClick={() => setIsDrawerOpen(false)} className="flex-1 rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-[#D4AF37] text-[#141110] font-semibold hover:bg-[#c19f2e] rounded-full border-none">
                      {updateMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Danger zone delete option */}
              <div className="border-t border-red-500/20 pt-6">
                {!isDeleteOpen ? (
                  <button
                    onClick={() => setIsDeleteOpen(true)}
                    className="w-full py-3 bg-red-500/10 text-red-400 rounded-full text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Memory Capsule</span>
                  </button>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-red-400">Are you absolutely sure?</p>
                    <p className="text-[10px] text-red-300/80">This action permanently deletes all photos, messages, audio and event configuration files. It is irreversible.</p>
                    <div className="flex gap-2">
                      <Button onClick={() => setIsDeleteOpen(false)} variant="outline" className="flex-1 text-xs py-1 rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => deleteMutation.mutate(slug)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 bg-red-600 text-white hover:bg-red-700 text-xs py-1 border-none rounded-full"
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeLightboxMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setActiveLightboxMedia(null)}
        >
          <div className="relative max-h-full max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <MediaLightbox
              p={activeLightboxMedia}
              watermarkEnabled={watermarkEnabled}
              maxVoiceDuration={Number((settings as ExtEventSettings)?.voice_note_duration_limit) || 10}
              onClose={() => setActiveLightboxMedia(null)}
              onReact={(emoji) => handleDashboardReact(activeLightboxMedia.id, emoji)}
              onComment={(text, author) => handleDashboardComment(activeLightboxMedia.id, text, author)}
              onVoiceComment={(file, author) => handleDashboardVoiceComment(activeLightboxMedia.id, file, author)}
            />
          </div>
        </div>
      )}

    </div>
  )
}