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
import { MemoryViewer, type MemoryViewerItem } from "@/lib/components/media/memory-viewer"
import { SLIDESHOW_TRACKS, resolveTrackUrl } from "@/lib/integrations/slideshow-music"
import { renderMovie, MovieRenderError } from "@/lib/movie/movie-renderer"
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
  AlertCircle,
  Trophy,
  LayoutGrid,
  PlayCircle,
  Gift,
  FileDown
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
  // Host opt-out for Snapsy Memories' automatic generation (Memory Stories
  // cron, etc.) — see isMemoriesEnabled() in src/lib/integrations/memories.ts.
  memories_enabled?: boolean
  // Host-controlled hardening: when true, GuestCaptureModal requires the
  // event's join_code before check-in succeeds — enforced server-side in
  // src/app/actions/guest.ts's logGuestAccess, not just this flag. Missing
  // key defaults to false/off so existing events don't suddenly start
  // requiring a code guests were never given.
  require_join_code?: boolean
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

// Fetch advisory plan-gate result for Download All — see
// src/app/api/events/[id]/feature-access/route.ts. Used purely for
// proactive UX (disable + "upgrade" tag before the host clicks); the
// underlying action route still enforces its own gate server-side.
// (Recap Video and AI Smart Clusters used to be checked here too — both
// removed along with their cards.)
interface FeatureAccessResult {
  allowed: boolean
  planId: string
  reason?: string
}
interface FeatureAccessResponse {
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
  // cover_image_url is a top-level column (set at creation by the event
  // wizard) rather than inside settings — only touch it when the caller
  // actually supplied a new value, so saving the rest of the form never
  // accidentally blanks out an existing cover.
  if (data.cover_image_url !== undefined) {
    eventData.cover_image_url = data.cover_image_url
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

  // Advisory plan-gate check for Download All — fetched once per event load
  // so the UI can show a calm disabled state with an "upgrade" tag instead
  // of letting the host click into a 403 from the actual action route. Not
  // refetched on an interval since plan tier doesn't change mid-session;
  // invalidated implicitly on next event load / navigation. (Recap Video and
  // AI Smart Clusters used to be checked here too — both removed.)
  const { data: featureAccess } = useQuery({
    queryKey: ["feature-access", event?.id],
    queryFn: () => getFeatureAccess(event!.id),
    enabled: !!event?.id,
  })
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

  // Recap Video and AI Smart Clusters (host-triggered face-cluster batch
  // re-scan) were both removed at the host's request — Recap Video never
  // rendered reliably in production, and AI Smart Clusters' underlying face
  // detection already runs automatically on upload (see
  // detectAndStoreFaces() in photos/upload/route.ts), so the manual button
  // added nothing guest-facing face search doesn't already get for free.

  // --- Snapsy Memories: Guest Awards, Event Summary, Auto Collage, Slideshow, Stories ---
  // Pure Next.js + Supabase, no ffmpeg/AI services — see
  // src/lib/integrations/memories.ts and supabase/migrations/0028_snapsy_memories.sql.
  const { data: memoriesAwards } = useQuery({
    queryKey: ["memories-awards", event?.id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${event!.id}/memories/awards`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to load guest awards")
      return json.data as { awards: { key: string; emoji: string; title: string; guestName: string; value: number }[]; guestCount: number }
    },
    enabled: !!event?.id,
  })

  const { data: memoriesSummary } = useQuery({
    queryKey: ["memories-summary", event?.id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${event!.id}/memories/summary`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to load event summary")
      return json.data as {
        photos: number
        videos: number
        voiceNotes: number
        guests: number
        totalReactions: number
        totalComments: number
        storageFormatted: string
        peakUploadTimeFormatted: string
        mostActiveUploader: string | null
      }
    },
    enabled: !!event?.id,
  })

  const { data: memoriesCollages, refetch: refetchCollages } = useQuery({
    queryKey: ["memories-collages", event?.id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${event!.id}/memories/collage`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) return { collages: [] }
      return json.data as { collages: { id: string; layout: string; image_url: string; width: number; height: number; metadata?: { reactions?: Record<string, number> }; created_at: string }[] }
    },
    enabled: !!event?.id,
  })

  const { data: memoriesSlideshow, refetch: refetchSlideshow } = useQuery({
    queryKey: ["memories-slideshow", event?.id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${event!.id}/memories/slideshow`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) return { slideshow: null, photos: [], musicTrackUrl: null }
      return json.data as {
        slideshow: { id: string; transition: string; interval_seconds: number; music_track: string | null } | null
        photos: { id: string; storage_path: string; thumbnail_path: string | null; reactions?: Record<string, number> }[]
        musicTrackUrl: string | null
      }
    },
    enabled: !!event?.id,
  })

  const { data: memoriesStories } = useQuery({
    queryKey: ["memories-stories", event?.id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${event!.id}/memories/stories`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) return { stories: [] }
      return json.data as { stories: { id: string; milestone_days: number; title: string; viewed_at: string | null; created_at: string }[] }
    },
    enabled: !!event?.id,
  })

  const [collageLayout, setCollageLayout] = useState<"grid-2" | "grid-4" | "grid-9" | "polaroid">("grid-4")
  const collageMutation = useMutation({
    mutationFn: async (layout: typeof collageLayout) => {
      const res = await fetch(`/api/events/${event!.id}/memories/collage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to generate collage")
      return json.data
    },
    onSuccess: () => {
      refetchCollages()
      toast({ title: "Collage ready!", description: "Your photo collage has been generated." })
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't generate collage", description: error.message, variant: "destructive" })
    },
  })

  const [slideshowDuration, setSlideshowDuration] = useState<30 | 60 | 180>(60)
  const [slideshowMusicTrack, setSlideshowMusicTrack] = useState<string | null>(SLIDESHOW_TRACKS[0]?.id ?? null)
  const [showSlideshowPlayer, setShowSlideshowPlayer] = useState(false)
  const slideshowMutation = useMutation({
    mutationFn: async (duration: typeof slideshowDuration) => {
      const res = await fetch(`/api/events/${event!.id}/memories/slideshow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration_seconds: duration, transition: "fade", show_brand: true, music_track: slideshowMusicTrack }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to build slideshow")
      return json.data
    },
    onSuccess: () => {
      refetchSlideshow()
      setShowSlideshowPlayer(true)
      toast({ title: "Slideshow ready!", description: "Tap play to watch your slideshow." })
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't build slideshow", description: error.message, variant: "destructive" })
    },
  })

  // In-app viewer state for Auto Collage + Slideshow (MemoryViewer) — replaces
  // the old <a target="_blank"> collage thumbnails and the plain
  // autoplay-only <SlideshowPlayer>. `collageViewerIndex` also doubles as
  // "is the collage viewer open" (null = closed); `showSlideshowPlayer` keeps
  // its original name since it already means "is the slideshow viewer open".
  const [collageViewerIndex, setCollageViewerIndex] = useState<number | null>(null)

  const collageReactMutation = useMutation({
    mutationFn: async ({ collageId, emoji }: { collageId: string; emoji: string }) => {
      const res = await fetch(`/api/events/${event!.id}/memories/collage/${collageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to save reaction")
      return { collageId, reactions: json.data.reactions as Record<string, number> }
    },
    onSuccess: ({ collageId, reactions }) => {
      queryClient.setQueryData(["memories-collages", event?.id], (old: typeof memoriesCollages) => {
        if (!old) return old
        return { collages: old.collages.map((c) => (c.id === collageId ? { ...c, metadata: { ...c.metadata, reactions } } : c)) }
      })
    },
    onError: () => {
      toast({ title: "Couldn't save reaction", variant: "destructive" })
    },
  })

  const slideshowReactMutation = useMutation({
    mutationFn: async ({ photoId, emoji }: { photoId: string; emoji: string }) => {
      const res = await fetch(`/api/photos/${photoId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error("Failed to save reaction")
      return { photoId, reactions: json.data.reactions as Record<string, number> }
    },
    onSuccess: ({ photoId, reactions }) => {
      queryClient.setQueryData(["memories-slideshow", event?.id], (old: typeof memoriesSlideshow) => {
        if (!old) return old
        return { ...old, photos: old.photos.map((p) => (p.id === photoId ? { ...p, reactions } : p)) }
      })
    },
    onError: () => {
      toast({ title: "Couldn't save reaction", variant: "destructive" })
    },
  })

  const supabasePhotoUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`

  const collageViewerItems: MemoryViewerItem[] = (memoriesCollages?.collages ?? []).map((c) => ({
    id: c.id,
    url: c.image_url,
    downloadUrl: c.image_url,
    storyUrl: event?.id ? `/api/events/${event.id}/memories/collage/${c.id}/story` : null,
    reactions: c.metadata?.reactions,
  }))

  const slideshowViewerItems: MemoryViewerItem[] = (memoriesSlideshow?.photos ?? []).map((p) => ({
    id: p.id,
    url: supabasePhotoUrl(p.storage_path),
    downloadUrl: `/api/photos/${p.id}/download`,
    storyUrl: `/api/photos/${p.id}/story`,
    reactions: p.reactions,
  }))

  // --- Movie — client-rendered 9:16 video (canvas Ken Burns + crossfade +
  // MediaRecorder, src/lib/movie/movie-renderer.ts). See that file's header
  // comment for why this deliberately avoids server-side ffmpeg (the old
  // Recap Video feature's failure mode). Independent of Slideshow — its own
  // duration/music picker and its own photo selection (memories/movie/photos
  // route) rather than reusing/overwriting the `slideshows` table.
  const { data: memoriesMovies, refetch: refetchMovies } = useQuery({
    queryKey: ["memories-movies", event?.id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${event!.id}/memories/movie`)
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) return { movies: [] }
      return json.data as {
        movies: { id: string; video_url: string; mime_type: string; duration_seconds: number | null; music_track: string | null; width: number; height: number; metadata?: { reactions?: Record<string, number> }; created_at: string }[]
      }
    },
    enabled: !!event?.id,
  })

  const [movieDuration, setMovieDuration] = useState<30 | 60 | 180>(30)
  const [movieMusicTrack, setMovieMusicTrack] = useState<string | null>(SLIDESHOW_TRACKS[0]?.id ?? null)
  const [movieRendering, setMovieRendering] = useState(false)
  const [movieProgress, setMovieProgress] = useState(0)
  const [showMovieViewer, setShowMovieViewer] = useState(false)
  // Surfaced inline on the card (not just as a toast) — a toast can be
  // missed entirely, and "the button just resets with no explanation" was
  // exactly what made the missing-migration failure mode confusing.
  const [movieError, setMovieError] = useState<string | null>(null)

  const movieReactMutation = useMutation({
    mutationFn: async ({ movieId, emoji }: { movieId: string; emoji: string }) => {
      const res = await fetch(`/api/events/${event!.id}/memories/movie/${movieId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error("Failed to save reaction")
      return { movieId, reactions: json.data.reactions as Record<string, number> }
    },
    onSuccess: ({ movieId, reactions }) => {
      queryClient.setQueryData(["memories-movies", event?.id], (old: typeof memoriesMovies) => {
        if (!old) return old
        return { movies: old.movies.map((m) => (m.id === movieId ? { ...m, metadata: { ...m.metadata, reactions } } : m)) }
      })
    },
    onError: () => {
      toast({ title: "Couldn't save reaction", variant: "destructive" })
    },
  })

  async function handleGenerateMovie() {
    if (!event?.id) return
    setMovieRendering(true)
    setMovieProgress(0)
    setMovieError(null)
    try {
      const photosRes = await fetch(`/api/events/${event.id}/memories/movie/photos?duration_seconds=${movieDuration}`)
      const photosJson = await photosRes.json().catch(() => null)
      if (!photosRes.ok || !photosJson?.success) {
        throw new MovieRenderError(photosJson?.error?.message || "No approved photos are available yet to build a movie")
      }
      const photos = (photosJson.data.photos as { id: string; storage_path: string }[]).map((p) => ({
        id: p.id,
        url: supabasePhotoUrl(p.storage_path),
      }))

      const rendered = await renderMovie({
        photos,
        durationSeconds: movieDuration,
        musicUrl: resolveTrackUrl(movieMusicTrack),
        eventName: event.name,
        onProgress: setMovieProgress,
      })

      // Vercel Serverless Functions cap request bodies at 4.5MB — a rendered
      // movie is routinely well past that, so the file never goes through a
      // normal POST body. Instead: get a signed Storage URL, PUT the blob
      // straight to Supabase Storage, then confirm with a small JSON call.
      const normalizedMimeType = rendered.mimeType.split(";")[0].trim() as "video/webm" | "video/mp4"
      const urlRes = await fetch(`/api/events/${event.id}/memories/movie/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mime_type: normalizedMimeType }),
      })
      const urlJson = await urlRes.json().catch(() => null)
      if (!urlRes.ok || !urlJson?.success) {
        throw new MovieRenderError(urlJson?.error?.message || "Couldn't prepare the upload")
      }
      const { signedUrl, path } = urlJson.data as { signedUrl: string; token: string; path: string }

      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": normalizedMimeType },
        body: rendered.blob,
      })
      if (!putRes.ok) {
        throw new MovieRenderError("Couldn't upload the rendered movie to storage")
      }

      const uploadRes = await fetch(`/api/events/${event.id}/memories/movie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: path,
          mime_type: normalizedMimeType,
          duration_seconds: Math.round(rendered.durationSeconds),
          music_track: movieMusicTrack,
          width: rendered.width,
          height: rendered.height,
        }),
      })
      const uploadJson = await uploadRes.json().catch(() => null)
      if (!uploadRes.ok || !uploadJson?.success) {
        throw new MovieRenderError(uploadJson?.error?.message || "Movie was uploaded but could not be saved")
      }

      await refetchMovies()
      setShowMovieViewer(true)
      toast({ title: "Movie ready!", description: "Tap play to watch your movie." })
    } catch (err) {
      const message = err instanceof MovieRenderError ? err.message : err instanceof Error ? err.message : "Couldn't build the movie"
      setMovieError(message)
      toast({ title: "Couldn't build movie", description: message, variant: "destructive" })
    } finally {
      setMovieRendering(false)
    }
  }

  const movieViewerItems: MemoryViewerItem[] = (memoriesMovies?.movies ?? []).map((m) => ({
    id: m.id,
    url: m.video_url,
    downloadUrl: m.video_url,
    reactions: m.metadata?.reactions,
    kind: "video",
    mimeType: m.mime_type,
  }))
  const latestMovie = memoriesMovies?.movies?.[0]

  const unviewedStory = memoriesStories?.stories?.find((s) => !s.viewed_at)

  // Host opt-out — mirrors isMemoriesEnabled() in src/lib/integrations/memories.ts,
  // duplicated inline rather than imported since that module is server-only
  // (importing it here would break the client bundle). Missing key defaults
  // to enabled, matching every other settings toggle in this codebase.
  const memoriesEnabled = (event?.settings as ExtEventSettings | undefined)?.memories_enabled !== false

  // Local Form state for settings edits
  const [editName, setEditName] = useState("")
  const [editStatus, setEditStatus] = useState<EventStatus>("published")
  const [editEndDate, setEditEndDate] = useState("")
  const [editAllowedFilters, setEditAllowedFilters] = useState<string[]>([])
  const [editVideoDuration, setEditVideoDuration] = useState<number>(10)
  const [editVoiceDuration, setEditVoiceDuration] = useState<number>(10)
  // Previously creation-only fields — the settings drawer only let hosts
  // touch name/status/end-date/filters/durations, so fixing a typo in the
  // cover photo or changing when guests can see photos meant deleting and
  // recreating the whole event. These three make the drawer a true "edit
  // anything" surface instead of a "tweak a few fields" one.
  const [editCoverImage, setEditCoverImage] = useState<string>("")
  const [uploadingCover, setUploadingCover] = useState(false)
  const [editRevealExperience, setEditRevealExperience] = useState<string>("immediately")
  // Host opt-out for Snapsy Memories' automatic generation (Memory Stories'
  // daily cron, etc.) — see isMemoriesEnabled() in
  // src/lib/integrations/memories.ts. Missing key defaults to enabled, same
  // as every other settings toggle here.
  const [editMemoriesEnabled, setEditMemoriesEnabled] = useState<boolean>(true)
  const [editRequireJoinCode, setEditRequireJoinCode] = useState<boolean>(false)

  useEffect(() => {
    if (event) {
      setEditName(event.name)
      setEditStatus(event.status as EventStatus)
      setEditEndDate(event.end_date ? toDatetimeLocalValue(event.end_date) : "")
      setEditAllowedFilters((event.settings as ExtEventSettings)?.allowed_filters || ["normal", "golden_hour", "vintage", "bw", "cinematic", "vivid", "cyberpunk", "dreamy"])
      setEditVideoDuration((event.settings as ExtEventSettings)?.video_duration_limit || 10)
      setEditVoiceDuration((event.settings as ExtEventSettings)?.voice_note_duration_limit || 10)
      setEditCoverImage(event.cover_image_url || "")
      setEditRevealExperience((event.settings as ExtEventSettings)?.reveal_experience || "immediately")
      setEditMemoriesEnabled((event.settings as ExtEventSettings)?.memories_enabled !== false)
      setEditRequireJoinCode((event.settings as ExtEventSettings)?.require_join_code === true)
    }
  }, [event, isDrawerOpen])

  // Mirrors the event-creation wizard's handleCustomCoverUpload (see
  // src/app/dashboard/events/new/new-event-form.tsx) so an existing event's
  // cover can be replaced the same way it was originally set — same storage
  // bucket/path convention, same base64 fallback if the upload itself fails.
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (JPG, PNG, WebP).", variant: "destructive" })
      return
    }
    setUploadingCover(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split(".").pop() || "jpg"
      const fileName = `cover-${Date.now()}-${Math.random().toString(36).slice(-4)}.${fileExt}`
      const filePath = `covers/${fileName}`
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filePath, file, { cacheControl: "3600", upsert: true })
      if (uploadError) {
        const reader = new FileReader()
        reader.onload = (evt) => {
          if (evt.target?.result) {
            setEditCoverImage(evt.target.result as string)
            toast({ title: "Cover updated", description: "Save settings to apply your new cover photo." })
          }
        }
        reader.readAsDataURL(file)
        return
      }
      const { data: publicData } = supabase.storage.from("photos").getPublicUrl(filePath)
      if (publicData?.publicUrl) {
        setEditCoverImage(publicData.publicUrl)
        toast({ title: "Cover updated", description: "Save settings to apply your new cover photo." })
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" })
    } finally {
      setUploadingCover(false)
    }
  }

  // One-click Archive — same status column the manual dropdown already
  // supports, just surfaced as its own action (matching once.film's
  // dedicated Archive button in Film Settings) instead of requiring the host
  // to know "archived" is hiding in the status <select>.
  const handleArchive = () => {
    updateMutation.mutate({
      name: editName,
      status: "archived",
      end_date: editEndDate,
      cover_image_url: editCoverImage || null,
      settings: { ...event?.settings },
    })
  }

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
        <Camera className="h-12 w-12 text-[#B28DAE]" />
        <h2 className="font-playfair text-2xl font-light text-white/90">Experience Capsule Not Found</h2>
        <Button asChild className="rounded-full bg-[#B28DAE] hover:bg-[#a468a0] text-[#141110] font-semibold">
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
    // Same instant/delayed derivation the creation wizard uses (see
    // new-event-form.tsx) so editing this post-creation drives the guest-
    // facing reveal gate (event/[slug]/page.tsx) exactly the same way
    // choosing it during setup would have.
    const isInstantReveal = editRevealExperience === "immediately" || editRevealExperience === "during"
    updateMutation.mutate({
      name: editName,
      status: editStatus,
      end_date: editEndDate,
      cover_image_url: editCoverImage || null,
      settings: {
        ...event?.settings,
        allowed_filters: editAllowedFilters,
        video_duration_limit: Number(editVideoDuration),
        voice_note_duration_limit: Number(editVoiceDuration),
        reveal_experience: editRevealExperience,
        photo_reveal_mode: isInstantReveal ? "instant" : "delayed",
        reveal_type: isInstantReveal ? "instant" : "delayed",
        memories_enabled: editMemoriesEnabled,
        require_join_code: editRequireJoinCode,
        ...(isoEndDate ? { countdown_date: isoEndDate } : {}),
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#141110] text-white/90 flex flex-col font-sans selection:bg-[#B28DAE]/30 pb-16">

      {/* Top Banner Navigation */}
      <header className="px-4 py-4 sm:px-6 bg-[#1C1814] border-b border-[#3D332A] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard/events" className="shrink-0 p-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-white/70" />
            </Link>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-widest text-[#B28DAE] font-bold block">Memory Capsule</span>
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
                className="rounded-full border border-[#B28DAE]/40 bg-[#B28DAE]/10 text-[#B28DAE]/70 text-xs flex items-center gap-1.5 cursor-not-allowed opacity-80 hover:bg-[#B28DAE]/10"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download All</span>
                <span className="text-[9px] font-bold uppercase tracking-wide border border-[#B28DAE]/40 bg-[#B28DAE]/10 text-[#B28DAE] rounded-full px-1.5 py-0.5 ml-0.5">
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
              className="rounded-full bg-[#B28DAE] text-[#141110] hover:bg-[#a468a0] text-xs font-semibold flex items-center gap-1 border-none cursor-pointer"
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
              <div key={idx} className="rounded-2xl border border-[#3D332A] bg-[#1C1814] p-3 text-center space-y-1.5 hover:border-[#B28DAE]/40 transition-all">
                <div className="w-8 h-8 rounded-full bg-[#B28DAE]/10 text-[#B28DAE] flex items-center justify-center mx-auto">
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl font-bold text-[#B28DAE]">{stat.value}</p>
                  <p className="text-[9px] uppercase tracking-wider text-white/60 font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Capsule countdown indicator circle */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-[#B28DAE] font-bold">Unlocking Capsule</span>
              <p className="font-playfair text-xl font-bold text-white tabular-nums">{countdownText || "Calculating..."}</p>
              <p className="text-[10px] text-white/60">Revealing memories automatically</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#B28DAE]/30 border-t-[#B28DAE] flex items-center justify-center animate-spin shrink-0" style={{ animationDuration: "10s" }}>
              <Clock className="h-5 w-5 text-[#B28DAE] rotate-[-45deg]" />
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
                    activeMediaTab === tab.id ? "bg-[#B28DAE] text-[#141110] font-bold" : "text-white/60 hover:text-white"
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

                  <div className="flex-1 rounded-2xl border border-[#3D332A] bg-[#1C1814] p-4 space-y-3 hover:border-[#B28DAE]/30 transition-all">
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
                        <p className="text-[10px] text-[#B28DAE] font-semibold">Uploaded {item.photos?.length || 0} high-resolution prints to Capsule</p>
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
                            className="text-[10px] font-bold text-[#B28DAE] hover:text-white flex items-center gap-1"
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
                          className="text-[10px] font-bold text-[#B28DAE] hover:text-white flex items-center gap-1"
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
                <QrCode className="h-4.5 w-4.5 text-[#B28DAE]" />
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
                <p className="inline-block mt-1 text-base font-bold tracking-[0.2em] text-[#B28DAE] font-mono bg-[#141110] border border-[#3D332A] rounded-full px-3 py-1">
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
              className="w-full text-xs bg-[#B28DAE] hover:bg-[#a468a0] text-[#141110] font-semibold flex items-center justify-center gap-1.5 rounded-full"
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

          {/* ✨ Snapsy Memories — Guest Awards, Event Summary, Auto Collage, Slideshow, Stories.
              Pure Next.js + Supabase, no ffmpeg/AI services. Gated behind the host's
              memories_enabled toggle in Edit Capsule Settings — this whole section disappears
              when the host turns it off, matching that toggle's description. */}
          {memoriesEnabled && (
          <>
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#B28DAE] font-bold">✨ Snapsy Memories</p>
          </div>

          {unviewedStory && (
            <div className="rounded-3xl border border-[#B28DAE]/30 bg-gradient-to-br from-[#B28DAE]/10 to-transparent p-5 flex items-center gap-3">
              <Gift className="h-5 w-5 text-[#B28DAE] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white/90 truncate">{unviewedStory.title}</p>
                <p className="text-[10px] text-white/50">A memory story just unlocked for this event</p>
              </div>
            </div>
          )}

          {/* Guest Awards */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Trophy className="h-4.5 w-4.5 text-[#B28DAE]" />
              <h3 className="text-sm font-bold text-white/90">Guest Awards</h3>
            </div>
            {memoriesAwards && memoriesAwards.awards.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {memoriesAwards.awards.map((award) => (
                  <div key={award.key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-lg leading-none mb-1">{award.emoji}</p>
                    <p className="text-[10px] text-white/50 uppercase tracking-wide">{award.title}</p>
                    <p className="text-xs font-semibold text-white/90 truncate">{award.guestName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/50 text-center py-4">Awards will appear once guests start uploading.</p>
            )}
          </div>

          {/* Event Summary */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Images className="h-4.5 w-4.5 text-[#B28DAE]" />
                <h3 className="text-sm font-bold text-white/90">Event Summary</h3>
              </div>
              <a
                href={event?.id ? `/api/events/${event.id}/memories/summary/pdf` : "#"}
                className="text-[10px] font-semibold text-[#B28DAE] hover:underline flex items-center gap-1"
              >
                <FileDown className="h-3 w-3" /> PDF
              </a>
            </div>
            {memoriesSummary ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xl font-bold text-white">{memoriesSummary.photos}</p>
                  <p className="text-[10px] text-white/50 uppercase">Photos</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xl font-bold text-white">{memoriesSummary.videos}</p>
                  <p className="text-[10px] text-white/50 uppercase">Videos</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xl font-bold text-white">{memoriesSummary.guests}</p>
                  <p className="text-[10px] text-white/50 uppercase">Guests</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xl font-bold text-white">{memoriesSummary.storageFormatted}</p>
                  <p className="text-[10px] text-white/50 uppercase">Storage</p>
                </div>
                {memoriesSummary.mostActiveUploader && (
                  <div className="col-span-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="text-white/60">Most Active</span>
                    <span className="font-semibold text-white">{memoriesSummary.mostActiveUploader}</span>
                  </div>
                )}
                <div className="col-span-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-white/60">Peak Upload Time</span>
                  <span className="font-semibold text-white">{memoriesSummary.peakUploadTimeFormatted}</span>
                </div>
              </div>
            ) : (
              <Skeleton className="h-24 w-full rounded-xl" />
            )}
          </div>

          {/* Auto Collage */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <LayoutGrid className="h-4.5 w-4.5 text-[#B28DAE]" />
              <h3 className="text-sm font-bold text-white/90">Auto Collage</h3>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(["grid-2", "grid-4", "grid-9", "polaroid"] as const).map((layout) => (
                <button
                  key={layout}
                  onClick={() => setCollageLayout(layout)}
                  className={`rounded-lg border py-2 text-[10px] font-semibold transition-colors ${
                    collageLayout === layout
                      ? "border-[#B28DAE] bg-[#B28DAE]/15 text-[#B28DAE]"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  {layout === "grid-2" ? "2-Grid" : layout === "grid-4" ? "4-Grid" : layout === "grid-9" ? "9-Grid" : "Polaroid"}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full text-xs py-5 rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
              disabled={collageMutation.isPending}
              onClick={() => collageMutation.mutate(collageLayout)}
            >
              <LayoutGrid className={`h-3.5 w-3.5 ${collageMutation.isPending ? "animate-pulse" : ""}`} />
              <span>{collageMutation.isPending ? "Composing collage…" : "Generate Collage"}</span>
            </Button>
            {memoriesCollages && memoriesCollages.collages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {memoriesCollages.collages.slice(0, 3).map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCollageViewerIndex(i)}
                    className="block rounded-lg overflow-hidden border border-white/10 aspect-square bg-black/20"
                  >
                    <img src={c.image_url} alt={`${c.layout} collage`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Slideshow — live in-browser player, no video export/encoding cost */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <PlayCircle className="h-4.5 w-4.5 text-[#B28DAE]" />
              <h3 className="text-sm font-bold text-white/90">Slideshow</h3>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([30, 60, 180] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setSlideshowDuration(d)}
                  className={`rounded-lg border py-2 text-[10px] font-semibold transition-colors ${
                    slideshowDuration === d
                      ? "border-[#B28DAE] bg-[#B28DAE]/15 text-[#B28DAE]"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  {d < 60 ? `${d} sec` : `${d / 60} min`}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">Background music</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setSlideshowMusicTrack(null)}
                  className={`rounded-lg border py-2 px-2 text-[10px] font-semibold transition-colors text-left ${
                    slideshowMusicTrack === null
                      ? "border-[#B28DAE] bg-[#B28DAE]/15 text-[#B28DAE]"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  🔇 None
                </button>
                {SLIDESHOW_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSlideshowMusicTrack(track.id)}
                    title={track.mood}
                    className={`rounded-lg border py-2 px-2 text-[10px] font-semibold transition-colors text-left ${
                      slideshowMusicTrack === track.id
                        ? "border-[#B28DAE] bg-[#B28DAE]/15 text-[#B28DAE]"
                        : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                    }`}
                  >
                    🎵 {track.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full text-xs py-5 rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
              disabled={slideshowMutation.isPending}
              onClick={() => slideshowMutation.mutate(slideshowDuration)}
            >
              <PlayCircle className={`h-3.5 w-3.5 ${slideshowMutation.isPending ? "animate-pulse" : ""}`} />
              <span>{slideshowMutation.isPending ? "Building slideshow…" : "Generate Slideshow"}</span>
            </Button>
            {memoriesSlideshow?.slideshow && memoriesSlideshow.photos.length > 0 && (
              <>
                <Button
                  variant="outline"
                  className="w-full text-xs py-3 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                  onClick={() => setShowSlideshowPlayer(true)}
                >
                  ▶ Watch Slideshow ({memoriesSlideshow.photos.length} photos)
                </Button>
                {/* Share — merged in from the old standalone "Share Movie" card
                    once Recap Video was removed; points guests at the same
                    slideshow via a public link + QR instead of a video file.
                    Uses the native share sheet (falls back to copy-link) so
                    tapping this never navigates the host away from their
                    dashboard into a new tab. */}
                {event?.slug && (
                  <Button
                    variant="outline"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-transparent text-white text-xs font-semibold py-3 hover:bg-white/10 transition-colors"
                    onClick={async () => {
                      const url = `${window.location.origin}/movie/${event.slug}`
                      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
                      try {
                        if (nav.share) {
                          await nav.share({ title: event.name, text: `Check out the highlights from ${event.name}!`, url })
                          return
                        }
                        await navigator.clipboard.writeText(url)
                        toast({ title: "Link copied!", description: "Paste it anywhere to share your slideshow." })
                      } catch (err) {
                        if (err instanceof Error && err.name === "AbortError") return
                        toast({ title: "Couldn't share", variant: "destructive" })
                      }
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share Slideshow
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Movie — real 9:16 video, rendered entirely in-browser (canvas
              Ken Burns + crossfades + MediaRecorder) and uploaded once
              finished. No server-side ffmpeg — see movie-renderer.ts. */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Film className="h-4.5 w-4.5 text-[#B28DAE]" />
              <h3 className="text-sm font-bold text-white/90">Movie</h3>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([30, 60, 180] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setMovieDuration(d)}
                  disabled={movieRendering}
                  className={`rounded-lg border py-2 text-[10px] font-semibold transition-colors disabled:opacity-50 ${
                    movieDuration === d
                      ? "border-[#B28DAE] bg-[#B28DAE]/15 text-[#B28DAE]"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  {d < 60 ? `${d} sec` : `${d / 60} min`}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">Background music</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setMovieMusicTrack(null)}
                  disabled={movieRendering}
                  className={`rounded-lg border py-2 px-2 text-[10px] font-semibold transition-colors text-left disabled:opacity-50 ${
                    movieMusicTrack === null
                      ? "border-[#B28DAE] bg-[#B28DAE]/15 text-[#B28DAE]"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                  }`}
                >
                  🔇 None
                </button>
                {SLIDESHOW_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setMovieMusicTrack(track.id)}
                    title={track.mood}
                    disabled={movieRendering}
                    className={`rounded-lg border py-2 px-2 text-[10px] font-semibold transition-colors text-left disabled:opacity-50 ${
                      movieMusicTrack === track.id
                        ? "border-[#B28DAE] bg-[#B28DAE]/15 text-[#B28DAE]"
                        : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                    }`}
                  >
                    🎵 {track.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full text-xs py-5 rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
              disabled={movieRendering}
              onClick={handleGenerateMovie}
            >
              <Film className={`h-3.5 w-3.5 ${movieRendering ? "animate-pulse" : ""}`} />
              <span>{movieRendering ? `Rendering… ${Math.round(movieProgress * 100)}%` : "Generate Movie"}</span>
            </Button>
            {movieRendering && (
              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#B28DAE] transition-all duration-300" style={{ width: `${Math.round(movieProgress * 100)}%` }} />
                </div>
                <p className="text-[10px] text-white/40 text-center">Keep this tab open — your movie is recording in real time.</p>
              </div>
            )}
            {movieError && !movieRendering && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <p className="text-xs font-semibold text-red-300">Couldn't build the movie</p>
                <p className="text-[11px] text-red-300/70 mt-0.5">{movieError}</p>
              </div>
            )}
            {latestMovie && !movieRendering && (
              <>
                <Button
                  variant="outline"
                  className="w-full text-xs py-3 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                  onClick={() => setShowMovieViewer(true)}
                >
                  ▶ Watch Movie {latestMovie.duration_seconds ? `(${latestMovie.duration_seconds}s)` : ""}
                </Button>
                <Button
                  variant="outline"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-transparent text-white text-xs font-semibold py-3 hover:bg-white/10 transition-colors"
                  onClick={async () => {
                    setShowMovieViewer(true)
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" /> Share Movie
                </Button>
              </>
            )}
          </div>
          </>
          )}

          {/* Recent Activity waterfall feed */}
          <div className="rounded-3xl border border-[#3D332A] bg-[#1C1814] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Activity className="h-4.5 w-4.5 text-[#B28DAE]" />
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B28DAE]">Host Quick Tools</h3>

            <div className="grid grid-cols-2 gap-2.5">
              <Link href={`/dashboard/events/${event.slug}/qr`} className="p-3 border border-white/10 rounded-xl text-center space-y-1 hover:border-[#B28DAE]/50 transition-all bg-white/5">
                <QrCode className="h-4 w-4 text-[#B28DAE] mx-auto" />
                <p className="text-[10px] font-bold text-white/80">QR Manager</p>
              </Link>
              <Link href={`/dashboard/events/${event.slug}/gallery`} className="p-3 border border-white/10 rounded-xl text-center space-y-1 hover:border-[#B28DAE]/50 transition-all bg-white/5">
                <Images className="h-4 w-4 text-[#B28DAE] mx-auto" />
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
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
              className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-[#181412] text-white border-l border-[#3D332A] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between z-50"
            >
              <div className="space-y-6">
                <div className="sticky top-0 bg-[#181412] z-20 flex justify-between items-center border-b border-white/10 pb-4 mb-2 pt-1">
                  <h3 className="font-playfair text-xl font-semibold text-white tracking-wide">Edit Capsule Settings</h3>
                  <button type="button" onClick={() => setIsDrawerOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateSave} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-white/60">Cover Photo</Label>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-16 w-16 shrink-0 rounded-xl bg-cover bg-center border border-hairline-dark bg-surface-dark"
                        style={{ backgroundImage: editCoverImage ? `url(${editCoverImage})` : undefined }}
                      />
                      <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-hairline-dark bg-white/5 px-3 py-2.5 text-center text-xs font-medium text-white/70 hover:border-mauve/40 hover:text-white transition-colors">
                        {uploadingCover ? "Uploading…" : "Change cover photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-white/60">Event Name</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="!bg-[#221C19] border-white/15 !text-white placeholder:!text-white/30 focus-visible:!ring-[#B28DAE] focus:border-[#B28DAE]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="end_date" className="text-xs font-bold text-white/60">Countdown Ends Lock Date</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="!bg-[#221C19] border-white/15 !text-white placeholder:!text-white/30 focus-visible:!ring-[#B28DAE] focus:border-[#B28DAE] [color-scheme:dark]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-bold text-white/60">Event Status</Label>
                    <select
                      id="status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as EventStatus)}
                      className="w-full h-10 rounded-xl border border-white/15 bg-[#221C19] text-white px-3 py-2 text-sm focus:border-[#B28DAE] focus:ring-1 focus:ring-[#B28DAE] outline-none cursor-pointer [color-scheme:dark]"
                    >
                      <option value="draft" className="bg-[#1C1814] text-white py-1.5 px-3">Draft</option>
                      <option value="published" className="bg-[#1C1814] text-white py-1.5 px-3">Published (Live)</option>
                      <option value="completed" className="bg-[#1C1814] text-white py-1.5 px-3">Completed</option>
                      <option value="archived" className="bg-[#1C1814] text-white py-1.5 px-3">Archived</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reveal" className="text-xs font-bold text-white/60">When guests see the memories</Label>
                    <select
                      id="reveal"
                      value={editRevealExperience}
                      onChange={(e) => setEditRevealExperience(e.target.value)}
                      className="w-full h-10 rounded-xl border border-white/15 bg-[#221C19] text-white px-3 py-2 text-sm focus:border-[#B28DAE] focus:ring-1 focus:ring-[#B28DAE] outline-none cursor-pointer [color-scheme:dark]"
                    >
                      <option value="immediately" className="bg-[#1C1814] text-white py-1.5 px-3">Immediately</option>
                      <option value="during" className="bg-[#1C1814] text-white py-1.5 px-3">During Event</option>
                      <option value="after" className="bg-[#1C1814] text-white py-1.5 px-3">After Event Ends</option>
                      <option value="24h" className="bg-[#1C1814] text-white py-1.5 px-3">24 Hours Later</option>
                      <option value="7d" className="bg-[#1C1814] text-white py-1.5 px-3">7 Days Later</option>
                      <option value="custom" className="bg-[#1C1814] text-white py-1.5 px-3">Custom Date</option>
                    </select>
                    {(editRevealExperience === "after" || editRevealExperience === "24h" || editRevealExperience === "7d" || editRevealExperience === "custom") && (
                      <p className="text-[10px] text-white/50">Uses the Countdown Ends Lock Date above as the reveal moment.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#221C19] p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-mauve font-bold">Capacity</p>
                    <div className="flex items-center justify-between text-xs text-white/80">
                      <span>Guests plan</span>
                      <span className="font-semibold text-white">
                        {settings.guest_count_plan || "free"}{(settings.guests_boost ?? 0) > 0 ? ` +${settings.guests_boost} boost` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/80">
                      <span>Shots per guest boost</span>
                      <span className="font-semibold text-white">{settings.shots_boost ?? 0}</span>
                    </div>
                    <Link
                      href="/dashboard/billing"
                      className="inline-block text-[10px] font-semibold text-mauve hover:underline pt-1"
                    >
                      Need more capacity? Manage add-ons in Billing →
                    </Link>
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
                            className="rounded border-white/20 bg-white/5 text-[#B28DAE] focus:ring-[#B28DAE]"
                          />
                          <Label htmlFor={`filter-${filter.id}`} className="text-xs text-white/80">{filter.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Settings toggle display list */}
                  <div className="border border-white/10 rounded-xl p-4 bg-[#221C19] space-y-4">
                    <p className="text-[10px] uppercase tracking-wider text-[#B28DAE] font-bold">Capsule Locks & Limits</p>

                    <div className="flex items-center justify-between text-xs text-white/80">
                      <span>Auto face cluster indexing</span>
                      <span className="font-semibold text-white/60">{settings.ai_features?.face_search ? "Active" : "Inactive"}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-4 text-white/80">
                      <span className="shrink-0">Video durations allowed</span>
                      <select
                        value={editVideoDuration}
                        onChange={(e) => setEditVideoDuration(Number(e.target.value))}
                        className="rounded-lg border border-white/15 bg-[#181412] px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#B28DAE] cursor-pointer [color-scheme:dark]"
                      >
                        <option value={5} className="bg-[#1C1814] text-white">5 seconds</option>
                        <option value={10} className="bg-[#1C1814] text-white">10 seconds</option>
                        <option value={15} className="bg-[#1C1814] text-white">15 seconds</option>
                        <option value={20} className="bg-[#1C1814] text-white">20 seconds</option>
                        <option value={30} className="bg-[#1C1814] text-white">30 seconds</option>
                        <option value={60} className="bg-[#1C1814] text-white">60 seconds</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-4 text-white/80">
                      <span className="shrink-0">Vocal note greetings allowed</span>
                      <select
                        value={editVoiceDuration}
                        onChange={(e) => setEditVoiceDuration(Number(e.target.value))}
                        className="rounded-lg border border-white/15 bg-[#181412] px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#B28DAE] cursor-pointer [color-scheme:dark]"
                      >
                        <option value={5} className="bg-[#1C1814] text-white">5 seconds</option>
                        <option value={10} className="bg-[#1C1814] text-white">10 seconds</option>
                        <option value={15} className="bg-[#1C1814] text-white">15 seconds</option>
                        <option value={20} className="bg-[#1C1814] text-white">20 seconds</option>
                        <option value={30} className="bg-[#1C1814] text-white">30 seconds</option>
                        <option value={60} className="bg-[#1C1814] text-white">60 seconds</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/80 pt-1 border-t border-white/10">
                      <div>
                        <span className="block">✨ Snapsy Memories</span>
                        <span className="block text-[10px] text-white/40">Auto highlight movie, stories, collages &amp; awards</span>
                      </div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editMemoriesEnabled}
                          onChange={(e) => setEditMemoriesEnabled(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-[#B28DAE] focus:ring-[#B28DAE] h-4 w-4"
                        />
                      </label>
                    </div>

                    {/* Hardens the "Or Join With Code" box above: without this
                        on, the code is just a shortcut to the same public
                        slug URL — anyone with the link skips it entirely.
                        With it on, guests must enter the exact code shown
                        above before check-in succeeds (enforced server-side
                        in src/app/actions/guest.ts, not just this toggle). */}
                    <div className="flex items-center justify-between text-xs text-white/80 pt-1 border-t border-white/10">
                      <div>
                        <span className="block">🔒 Require join code to enter</span>
                        <span className="block text-[10px] text-white/40">Guests must enter the code above before they can check in</span>
                      </div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editRequireJoinCode}
                          onChange={(e) => setEditRequireJoinCode(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-[#B28DAE] focus:ring-[#B28DAE] h-4 w-4"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-white/10">
                    <Button type="button" variant="outline" onClick={() => setIsDrawerOpen(false)} className="flex-1 rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-[#B28DAE] text-[#141110] font-semibold hover:bg-[#a468a0] rounded-full border-none">
                      {updateMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Archive + Delete actions */}
              <div className="border-t border-red-500/20 pt-6 space-y-2">
                {!isDeleteOpen ? (
                  <>
                    {event.status !== "archived" && (
                      <button
                        onClick={handleArchive}
                        disabled={updateMutation.isPending}
                        className="w-full py-3 bg-white/5 text-white/80 border border-hairline-dark rounded-full text-xs font-bold hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Images className="h-4 w-4" />
                        <span>{updateMutation.isPending ? "Archiving…" : "Archive Memory Capsule"}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsDeleteOpen(true)}
                      className="w-full py-3 bg-red-500/10 text-red-400 rounded-full text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Memory Capsule</span>
                    </button>
                  </>
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

      {showSlideshowPlayer && slideshowViewerItems.length > 0 && (
        <MemoryViewer
          items={slideshowViewerItems}
          title={event?.name}
          shareUrl={event?.slug ? `${window.location.origin}/movie/${event.slug}` : undefined}
          shareText={event?.name ? `Check out the highlights from ${event.name}!` : undefined}
          musicUrl={memoriesSlideshow?.musicTrackUrl}
          autoPlaySeconds={memoriesSlideshow?.slideshow?.interval_seconds || 4}
          watermarkPreview={watermarkEnabled}
          onClose={() => setShowSlideshowPlayer(false)}
          onReact={(photoId, emoji) => slideshowReactMutation.mutate({ photoId, emoji })}
        />
      )}

      {collageViewerIndex !== null && collageViewerItems.length > 0 && (
        <MemoryViewer
          items={collageViewerItems}
          initialIndex={collageViewerIndex}
          title={event?.name}
          watermarkPreview={watermarkEnabled}
          onClose={() => setCollageViewerIndex(null)}
          onReact={(collageId, emoji) => collageReactMutation.mutate({ collageId, emoji })}
        />
      )}

      {showMovieViewer && movieViewerItems.length > 0 && (
        <MemoryViewer
          items={movieViewerItems}
          title={event?.name}
          shareText={event?.name ? `Check out our movie from ${event.name}!` : undefined}
          onClose={() => setShowMovieViewer(false)}
          onReact={(movieId, emoji) => movieReactMutation.mutate({ movieId, emoji })}
        />
      )}

    </div>
  )
}
