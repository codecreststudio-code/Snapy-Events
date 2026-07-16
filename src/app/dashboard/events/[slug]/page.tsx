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
import { Playfair_Display } from "next/font/google"
import { motion, AnimatePresence } from "framer-motion"
import { QRCodeSVG } from "qrcode.react"
import { generateInvitationCard, buildInvitationCaption, type InvitationTheme } from "@/lib/invitation-card"
import { useWatermarkEnabled } from "@/lib/hooks"
import { toDatetimeLocalValue } from "@/lib/utils"
import { WatermarkOverlay } from "@/lib/components/media/watermark-overlay"
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
  Loader2
} from "lucide-react"

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
})

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

    const blob = await generateInvitationCard({
      eventName: event.name,
      welcomeMessage,
      theme,
      eventDate: event.event_date,
      coverImageUrl: event.cover_image_url,
      inviteUrl: publicEventUrl,
      qrSvgElementId: "event-dashboard-qr",
      headingFontFamily: playfair.style.fontFamily,
    })
    if (!blob) return null
    return { blob, caption: buildInvitationCaption(event.name, welcomeMessage, publicEventUrl) }
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
      <div className="min-h-screen bg-[#FAF9F6] p-8 space-y-6 flex flex-col justify-center items-center">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-64 w-full max-w-4xl rounded-2xl" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Camera className="h-12 w-12 text-[#A58263]" />
        <h2 className={`${playfair.className} text-2xl font-light`}>Experience Capsule Not Found</h2>
        <Button asChild className="bg-[#A58263] hover:bg-[#8D6B50] text-white">
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
        duration: "0:15"
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
        audioUrl: getImageUrl(p.storage_path, "")
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
    updateMutation.mutate({
      name: editName,
      status: editStatus,
      end_date: editEndDate,
      settings: {
        ...event?.settings,
        allowed_filters: editAllowedFilters,
        video_duration_limit: Number(editVideoDuration),
        voice_note_duration_limit: Number(editVoiceDuration),
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1A17] flex flex-col font-sans selection:bg-[#EAE4D9] pb-16">
      
      {/* Top Banner Navigation */}
      <header className="px-6 py-4 bg-white border-b border-[#EAE5DF] sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/events" className="p-2 hover:bg-stone-50 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-[#69635C]" />
            </Link>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#A58263] font-bold block">Memory Capsule</span>
              <h1 className={`${playfair.className} text-xl md:text-2xl font-light text-[#1C1A17]`}>{event.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="border-[#EAE5DF] text-[#69635C] rounded-full text-xs">
              <Link href={`/event/${event.slug}`} target="_blank" className="flex items-center gap-1">
                <span>Live Portal</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
            <Button
              onClick={() => setIsDrawerOpen(true)}
              className="bg-[#A58263] text-white hover:bg-[#8D6B50] rounded-full text-xs flex items-center gap-1 border-none cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Stats Board */}
      <section className="bg-gradient-to-b from-white to-transparent py-8 px-6 border-b border-[#EAE5DF]/55">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Circular/Visual Metrics Widget */}
          <div className="md:col-span-2 grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Photos", value: totalPhotosCount, icon: ImageIcon, color: "text-[#B89B85]" },
              { label: "Videos", value: totalVideosCount, icon: Video, color: "text-[#D29F6C]" },
              { label: "Voice Notes", value: totalVoicesCount, icon: Mic, color: "text-[#C68CA3]" },
              { label: "Messages", value: totalMessagesCount, icon: MessageSquare, color: "text-[#5F87A8]" },
              { label: "Guests", value: totalGuestsCount, icon: Users, color: "text-[#6EB887]" },
              { label: "AI Matches", value: totalAiClusters, icon: Sparkles, color: "text-[#B28659]" },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white border border-[#EAE5DF] rounded-2xl p-3 text-center space-y-1.5 shadow-sm hover:shadow-md transition-all">
                <div className={`w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center mx-auto ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl font-bold text-[#1C1A17]">{stat.value}</p>
                  <p className="text-[9px] uppercase tracking-wider text-[#9C958E] font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Capsule countdown indicator circle */}
          <div className="bg-[#FAF2EB] border border-[#EAE5DF] rounded-3xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-[#A58263] font-bold">Unlocking Capsule</span>
              <p className={`${playfair.className} text-xl font-bold text-[#1C1A17] tabular-nums`}>{countdownText || "Calculating..."}</p>
              <p className="text-[10px] text-[#7A756E]">Revealing memories automatically</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#A58263]/30 border-t-[#A58263] flex items-center justify-center animate-spin shrink-0" style={{ animationDuration: "10s" }}>
              <Clock className="h-5 w-5 text-[#A58263] rotate-[-45deg]" />
            </div>
          </div>

        </div>
      </section>

      {/* Master Workspace Layout */}
      <section className="max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Memory timeline */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between border-b border-[#EAE5DF] pb-3">
            <h2 className={`${playfair.className} text-2xl font-light text-[#1C1A17]`}>Memory Timeline</h2>
            
            {/* Timeline content filters */}
            <div className="flex items-center gap-1 bg-stone-100/80 p-0.5 rounded-lg text-xs">
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
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    activeMediaTab === tab.id ? "bg-white text-[#1C1A17] font-bold shadow-sm" : "text-[#7A756E]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chronological media timeline content list */}
          <div className="space-y-6 relative before:absolute before:top-4 before:bottom-4 before:left-6 before:w-0.5 before:bg-[#EAE5DF]">
            
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
                  <div className="w-12 h-12 rounded-full border-4 border-[#FAF9F6] bg-[#FAF2EB] flex items-center justify-center shrink-0 shadow-sm relative">
                    <img src={item.avatar} alt={item.guest} className="w-full h-full object-cover rounded-full" />
                    <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center text-[10px] shadow-sm">
                      {item.type === "photo_group" && "📸"}
                      {item.type === "message" && "💌"}
                      {item.type === "voice" && "🎤"}
                      {item.type === "video" && "🎥"}
                    </div>
                  </div>

                  <div className="flex-1 bg-white border border-[#EAE5DF] rounded-2xl p-4 space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#1C1A17]">{item.guest}</span>
                      <span className="text-[#9C958E]">{item.time}</span>
                    </div>

                    {/* Photo group display */}
                    {item.type === "photo_group" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {item.photos?.map((p: any, idx: number) => (
                            <div key={idx} className="aspect-square bg-stone-100 rounded-lg overflow-hidden relative group">
                              <img src={getImageUrl(p.thumbnail_path || p.storage_path)} alt="Upload" className="w-full h-full object-cover" />
                              {watermarkEnabled && <WatermarkOverlay />}
                              <div
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                onClick={() => window.open(`/api/photos/${p.id}/download`, "_blank")}
                                title="Download original"
                              >
                                <Download className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-[#A58263] font-semibold">Uploaded {item.photos?.length || 0} high-resolution prints to Capsule</p>
                      </div>
                    )}

                    {/* Messages content display */}
                    {item.type === "message" && (
                      <div className="space-y-2">
                        <blockquote className="text-sm italic text-[#5C564F] leading-relaxed">
                          "{item.content}"
                        </blockquote>
                        <div className="text-[10px] bg-stone-50 border border-stone-100 rounded-full px-2 py-0.5 inline-block text-[#69635C]">
                          {item.reaction}
                        </div>
                      </div>
                    )}

                    {/* Video player visual display */}
                    {item.type === "video" && (
                      <div className="space-y-2">
                        <div className="aspect-video bg-stone-900 rounded-xl overflow-hidden relative flex items-center justify-center group shadow-inner">
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
                        <p className="text-xs font-semibold text-[#1C1A17]">{item.title}</p>
                      </div>
                    )}

                    {/* Voice audio card contribution */}
                    {item.type === "voice" && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3 bg-[#FAF9F6] border border-[#F2EDE7] p-3 rounded-xl">
                          <audio
                            src={item.audioUrl}
                            controls
                            preload="none"
                            className="flex-1 h-10"
                          >
                            Your browser does not support audio playback.
                          </audio>
                        </div>
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
          <div className="bg-white border border-[#EAE5DF] rounded-3xl p-5 space-y-4 shadow-sm text-center relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-4.5 w-4.5 text-[#A58263]" />
                <h3 className="text-sm font-bold text-[#1C1A17]">Event QR Code</h3>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live QR
              </span>
            </div>

            {/* Custom Branded QR Code Display (Full Logo Embedded behind QR matrix) */}
            <div className="p-4 bg-gradient-to-b from-[#FAF9F6] to-white border border-[#EAE5DF] rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-inner group">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-[#EAE5DF] relative overflow-hidden flex items-center justify-center">
                <img
                  src="/Favicon.png"
                  alt="Snapsy Logo Background"
                  className="absolute inset-0 w-full h-full object-contain opacity-25 p-2 pointer-events-none filter saturate-150"
                />
                <QRCodeSVG
                  id="event-dashboard-qr"
                  value={publicEventUrl}
                  size={180}
                  bgColor={"transparent"}
                  fgColor={"#1c1a17"}
                  level={"H"}
                  imageSettings={{
                    src: "/Favicon.png",
                    x: undefined,
                    y: undefined,
                    height: 44,
                    width: 44,
                    excavate: true,
                  }}
                  className="relative z-10"
                />
              </div>
              <div className="space-y-0.5 text-center">
                <p className="text-xs font-bold text-[#1C1A17]">Scan to Upload Photos</p>
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
              className="w-full text-xs bg-[#1C1A17] hover:bg-[#2A2620] text-white flex items-center justify-center gap-1.5 rounded-xl"
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
                className="text-xs border-[#EAE5DF] hover:bg-stone-50 flex items-center justify-center gap-1 text-[#69635C] rounded-xl px-2"
              >
                {sharing === "whatsapp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                <span>WhatsApp</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs border-[#EAE5DF] hover:bg-stone-50 flex items-center justify-center gap-1 text-[#69635C] rounded-xl px-2"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadQr}
                className="text-xs border-[#EAE5DF] hover:bg-stone-50 flex items-center justify-center gap-1 text-[#69635C] rounded-xl px-2"
              >
                <Download className="h-3.5 w-3.5" />
                <span>QR</span>
              </Button>
            </div>
          </div>

          {/* AI Matches clustered panel */}
          <div className="bg-white border border-[#EAE5DF] rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <Sparkles className="h-4.5 w-4.5 text-[#A58263]" />
              <h3 className="text-sm font-bold text-[#1C1A17]">AI Smart Clusters</h3>
            </div>
            
            <div className="space-y-3">
              {dynamicAiMatches.length > 0 ? dynamicAiMatches.map((cluster) => (
                <div key={cluster.id} className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-150 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <img src={cluster.cover} alt="Cluster Cover" className="w-10 h-10 rounded-lg object-cover border border-stone-100 shrink-0" />
                    <div>
                      <p className="font-semibold text-[#1C1A17]">{cluster.label}</p>
                      <p className="text-[10px] text-[#9C958E]">{cluster.photoCount} match files</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-300" />
                </div>
              )) : (
                <p className="text-xs text-stone-500 text-center py-4">No smart clusters found yet.</p>
              )}
            </div>

            <Button variant="outline" className="w-full text-xs py-5 border-[#EAE5DF] text-[#69635C] rounded-xl flex items-center justify-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              <span>Initiate New Face Match</span>
            </Button>
          </div>

          {/* Recent Activity waterfall feed */}
          <div className="bg-white border border-[#EAE5DF] rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <Activity className="h-4.5 w-4.5 text-[#A58263]" />
              <h3 className="text-sm font-bold text-[#1C1A17]">Recent Guest Activity</h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              {dynamicActivities.length > 0 ? dynamicActivities.slice(0, 10).map((act, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 text-stone-600 border-b border-stone-50 pb-2.5 last:border-none last:pb-0">
                  <p>
                    <span className="font-bold text-[#1C1A17]">{act.actor}</span> {act.action}
                  </p>
                  <span className="text-[9px] text-[#9C958E] shrink-0">{act.time}</span>
                </div>
              )) : (
                <p className="text-xs text-stone-500 text-center py-4">No recent activity.</p>
              )}
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="bg-white border border-[#EAE5DF] rounded-3xl p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A58263]">Host Quick Tools</h3>
            
            <div className="grid grid-cols-2 gap-2.5">
              <Link href={`/dashboard/events/${event.slug}/qr`} className="p-3 border border-[#EAE5DF] rounded-xl text-center space-y-1 hover:border-[#A58263] transition-all bg-stone-50/50">
                <QrCode className="h-4 w-4 text-[#A58263] mx-auto" />
                <p className="text-[10px] font-bold">QR Manager</p>
              </Link>
              <Link href={`/dashboard/events/${event.slug}/gallery`} className="p-3 border border-[#EAE5DF] rounded-xl text-center space-y-1 hover:border-[#A58263] transition-all bg-stone-50/50">
                <Images className="h-4 w-4 text-[#A58263] mx-auto" />
                <p className="text-[10px] font-bold">Gallery Toggles</p>
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
              className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#EAE5DF] pb-3">
                  <h3 className={`${playfair.className} text-xl font-medium text-[#1C1A17]`}>Edit Capsule Settings</h3>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-1 hover:bg-stone-100 rounded-full">
                    <X className="h-5 w-5 text-stone-500" />
                  </button>
                </div>

                <form onSubmit={handleUpdateSave} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-stone-600">Event Name</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border-[#EAE5DF] focus:border-[#A58263]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="end_date" className="text-xs font-bold text-stone-600">Countdown Ends Lock Date</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="border-[#EAE5DF] focus:border-[#A58263]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-bold text-stone-600">Event Status</Label>
                    <select
                      id="status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as EventStatus)}
                      className="w-full h-10 rounded-md border border-[#EAE5DF] bg-white px-3 py-2 text-sm focus:border-[#A58263] outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published (Live)</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-stone-600">Guest Camera Filters</Label>
                    <p className="text-[10px] text-stone-500 mb-2">Select which premium filters guests can use.</p>
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
                            className="rounded border-[#EAE5DF] text-[#A58263] focus:ring-[#A58263]"
                          />
                          <Label htmlFor={`filter-${filter.id}`} className="text-xs">{filter.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Settings toggle display list */}
                  <div className="border border-stone-100 rounded-xl p-4 bg-stone-50/50 space-y-4">
                    <p className="text-[10px] uppercase tracking-wider text-[#A58263] font-bold">Capsule Locks & Limits</p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span>Auto face cluster indexing</span>
                      <span className="font-semibold text-stone-600">{settings.ai_features?.face_search ? "Active" : "Inactive"}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-4">
                      <span className="shrink-0">Video durations allowed</span>
                      <select
                        value={editVideoDuration}
                        onChange={(e) => setEditVideoDuration(Number(e.target.value))}
                        className="rounded-lg border border-[#EAE5DF] bg-white px-2.5 py-1 text-xs font-semibold text-[#1C1A17] focus:outline-none focus:ring-1 focus:ring-[#A58263]"
                      >
                        <option value={5}>5 seconds</option>
                        <option value={10}>10 seconds</option>
                        <option value={15}>15 seconds</option>
                        <option value={20}>20 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>60 seconds</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-xs gap-4">
                      <span className="shrink-0">Vocal note greetings allowed</span>
                      <select
                        value={editVoiceDuration}
                        onChange={(e) => setEditVoiceDuration(Number(e.target.value))}
                        className="rounded-lg border border-[#EAE5DF] bg-white px-2.5 py-1 text-xs font-semibold text-[#1C1A17] focus:outline-none focus:ring-1 focus:ring-[#A58263]"
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

                  <div className="pt-4 flex gap-3 border-t border-[#EAE5DF]">
                    <Button type="button" variant="outline" onClick={() => setIsDrawerOpen(false)} className="flex-1 rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-[#A58263] text-white hover:bg-[#8D6B50] rounded-xl border-none">
                      {updateMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Danger zone delete option */}
              <div className="border-t border-red-100 pt-6">
                {!isDeleteOpen ? (
                  <button
                    onClick={() => setIsDeleteOpen(true)}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Memory Capsule</span>
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-red-700">Are you absolutely sure?</p>
                    <p className="text-[10px] text-red-600">This action permanently deletes all photos, messages, audio and event configuration files. It is irreversible.</p>
                    <div className="flex gap-2">
                      <Button onClick={() => setIsDeleteOpen(false)} variant="outline" className="flex-1 text-xs py-1 border-stone-200">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => deleteMutation.mutate(slug)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 bg-red-650 text-white hover:bg-red-700 text-xs py-1 border-none"
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

    </div>
  )
}