"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks"
import type { Event, EventSettings } from "@/lib/types"
import { Button } from "@/lib/components/ui/button"
import { Switch } from "@/lib/components/ui/switch"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { toast } from "@/lib/components/ui/toaster"
import { Playfair_Display } from "next/font/google"
import { motion, AnimatePresence } from "framer-motion"
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
  Users,
  Clock,
  Sparkles,
  Play,
  Pause,
  MessageSquare,
  Mic,
  Video,
  Smile,
  X,
  Plus,
  Activity,
  UserCheck,
  Search,
  ExternalLink,
  ChevronRight
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
    .eq("organization_id", orgId)
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

// Update event details
async function updateEvent(slug: string, data: any, currentSettings: any) {
  const supabase = createClient()
  const mergedSettings = { ...currentSettings, ...data.settings }

  const eventData: any = {
    name: data.name,
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
  const orgId = profile?.organization_id

  // State management
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [activeMediaTab, setActiveMediaTab] = useState<"all" | "photos" | "videos" | "voices" | "messages">("all")
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  const [countdownText, setCountdownText] = useState("")

  // Server state queries
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", slug, orgId],
    queryFn: () => getEvent(slug, orgId!),
    enabled: !!orgId,
  })

  const { data: photos = [] } = useQuery({
    queryKey: ["event-photos", event?.id],
    queryFn: () => getEventPhotos(event!.id),
    enabled: !!event?.id,
  })

  // Mutate endpoints
  const updateMutation = useMutation({
    mutationFn: (data: any) => updateEvent(slug, data, event?.settings || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", slug] })
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
      toast({ title: "Capsule deleted successfully" })
      router.push("/dashboard/events")
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete event", description: error.message, variant: "destructive" })
    }
  })

  // Local Form state for settings edits
  const [editName, setEditName] = useState("")
  const [editEndDate, setEditEndDate] = useState("")

  useEffect(() => {
    if (event) {
      setEditName(event.name)
      if (event.end_date) {
        setEditName(event.name)
        setEditEndDate(new Date(event.end_date).toISOString().slice(0, 16))
      }
    }
  }, [event])

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

  // Mock guest counts, AI matches, messages, and voice notes for rich dashboard presentation
  const MOCK_GUESTS = [
    { name: "Sophia Miller", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop", count: 8 },
    { name: "Julian Carter", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop", count: 12 },
    { name: "Elena Rostova", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop", count: 6 },
    { name: "Marcus Vance", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop", count: 4 },
  ]

  const MOCK_TIMELINE = [
    {
      id: "m1",
      type: "message",
      guest: "Sophia Miller",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop",
      time: "2 hours ago",
      content: "Congratulations Evelyn and Liam! Truly beautiful night. Wishing you both a lifetime of happiness. ❤️🍾",
      reaction: "🥂 4"
    },
    {
      id: "v1",
      type: "voice",
      guest: "Julian Carter",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop",
      time: "3 hours ago",
      duration: "0:18",
      category: "Wedding Wish",
      audioUrl: "#"
    },
    {
      id: "vid1",
      type: "video",
      guest: "Elena Rostova",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop",
      time: "4 hours ago",
      thumbnail: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&auto=format&fit=crop",
      title: "First Dance Highlight clip",
      duration: "15s"
    },
    {
      id: "m2",
      type: "message",
      guest: "Marcus Vance",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop",
      time: "5 hours ago",
      content: "The cocktails are incredible! Best wedding reception ever.",
      reaction: "👍 2"
    }
  ]

  const MOCK_AI_MATCHES = [
    { id: "c1", label: "Bride & Groom", photoCount: 15, cover: "https://images.unsplash.com/photo-1519741497674-611481863552?w=100&h=100&fit=crop" },
    { id: "c2", label: "Best Friends Group", photoCount: 9, cover: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=100&h=100&fit=crop" },
    { id: "c3", label: "Evelyn Family", photoCount: 6, cover: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
  ]

  // Filter contributions
  const filteredTimeline = MOCK_TIMELINE.filter((item) => {
    if (activeMediaTab === "all") return true
    if (activeMediaTab === "videos") return item.type === "video"
    if (activeMediaTab === "voices") return item.type === "voice"
    if (activeMediaTab === "messages") return item.type === "message"
    return false
  })

  // Format stats counts
  const totalPhotosCount = photos.length + 18
  const totalVideosCount = 4
  const totalVoicesCount = 7
  const totalMessagesCount = 14
  const totalGuestsCount = 38
  const totalAiClusters = MOCK_AI_MATCHES.length

  const handleUpdateSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      name: editName,
      end_date: editEndDate,
      settings: {
        ...settings,
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
              
              {/* Photo contribution layout */}
              {(activeMediaTab === "all" || activeMediaTab === "photos") && (
                <div className="timeline-item flex gap-4 items-start relative z-10">
                  <div className="w-12 h-12 rounded-full border-4 border-[#FAF9F6] bg-[#FAF2EB] flex items-center justify-center text-white font-bold shrink-0 shadow-sm relative">
                    <img src={MOCK_GUESTS[0].avatar} alt="Sophia" className="w-full h-full object-cover rounded-full" />
                    <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center text-[10px] shadow-sm">📸</div>
                  </div>
                  
                  <div className="flex-1 bg-white border border-[#EAE5DF] rounded-2xl p-4 space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#1C1A17]">{MOCK_GUESTS[0].name}</span>
                      <span className="text-[#9C958E]">1 hour ago</span>
                    </div>
                    
                    {/* Masonry-like dynamic Photo Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {photos.length > 0 ? (
                        photos.map((p, idx) => (
                          <div key={idx} className="aspect-square bg-stone-100 rounded-lg overflow-hidden relative group">
                            <img src={p.thumbnailPath || "/placeholder.png"} alt="Upload" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Download className="h-4 w-4 text-white cursor-pointer" />
                            </div>
                          </div>
                        ))
                      ) : (
                        [1, 2, 3, 4].map((i) => (
                          <div key={i} className="aspect-square bg-stone-100 rounded-lg overflow-hidden relative group">
                            <img src={TEMPLATE_COVERS[i % TEMPLATE_COVERS.length]} alt="Upload Placeholder" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                              <Download className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <p className="text-[10px] text-[#A58263] font-semibold">Uploaded {photos.length || 4} high-resolution prints to Capsule</p>
                  </div>
                </div>
              )}

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
                          <img src={item.thumbnail} alt="Video thumbnail" className="w-full h-full object-cover opacity-80" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-all">
                            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-105 transition-transform">
                              <Play className="h-5 w-5 fill-white ml-0.5" />
                            </div>
                          </div>
                          <span className="absolute bottom-2 right-2 bg-black/55 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                            {item.duration}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#1C1A17]">{item.title}</p>
                      </div>
                    )}

                    {/* Voice audio card contribution */}
                    {item.type === "voice" && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3 bg-[#FAF9F6] border border-[#F2EDE7] p-3 rounded-xl">
                          <button
                            onClick={() => setPlayingVoiceId(playingVoiceId === item.id ? null : item.id)}
                            className="w-10 h-10 rounded-full bg-[#A58263] flex items-center justify-center text-white cursor-pointer hover:bg-[#8D6B50] transition-colors shrink-0 shadow-sm"
                          >
                            {playingVoiceId === item.id ? (
                              <Pause className="h-4.5 w-4.5" />
                            ) : (
                              <Play className="h-4.5 w-4.5 fill-white ml-0.5" />
                            )}
                          </button>
                          
                          <div className="flex-1 space-y-1.5">
                            {/* Simulated waveform sound lines */}
                            <div className="h-5 flex items-center gap-0.5 overflow-hidden">
                              {Array.from({ length: 30 }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className="w-0.75 bg-[#A58263] rounded-full transition-all duration-300"
                                  style={{
                                    height: playingVoiceId === item.id 
                                      ? `${Math.max(10, Math.sin(idx + Date.now()/300) * 100)}%` 
                                      : `${Math.max(15, (idx % 4) * 20)}%`,
                                    opacity: playingVoiceId === item.id ? 1 : 0.4
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-[#9C958E]">
                              <span>{item.category} Note</span>
                              <span>0:00 / {item.duration}</span>
                            </div>
                          </div>

                          {/* Playback speed toggle */}
                          <button
                            onClick={() => setVoiceSpeed(prev => prev === 2.0 ? 1.0 : prev + 0.5)}
                            className="text-[9px] font-bold bg-white border border-[#EAE5DF] rounded px-1.5 py-0.5 text-[#69635C] hover:bg-stone-50 cursor-pointer shrink-0"
                          >
                            {voiceSpeed}x
                          </button>
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
          
          {/* AI Matches clustered panel */}
          <div className="bg-white border border-[#EAE5DF] rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <Sparkles className="h-4.5 w-4.5 text-[#A58263]" />
              <h3 className="text-sm font-bold text-[#1C1A17]">AI Smart Clusters</h3>
            </div>
            
            <div className="space-y-3">
              {MOCK_AI_MATCHES.map((cluster) => (
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
              ))}
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
              {[
                { actor: "Julian", action: "joined the capsule page", time: "10m ago" },
                { actor: "Marcus", action: "unlocked Standard photo pass", time: "25m ago" },
                { actor: "Sophia", action: "reacted with 🥂 to Julian's toast", time: "1h ago" },
                { actor: "Elena", action: "uploaded video highlight", time: "4h ago" },
              ].map((act, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 text-stone-600 border-b border-stone-50 pb-2.5 last:border-none last:pb-0">
                  <p>
                    <span className="font-bold text-[#1C1A17]">{act.actor}</span> {act.action}
                  </p>
                  <span className="text-[9px] text-[#9C958E] shrink-0">{act.time}</span>
                </div>
              ))}
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

                  {/* Settings toggle display list */}
                  <div className="border border-stone-100 rounded-xl p-4 bg-stone-50/50 space-y-4">
                    <p className="text-[10px] uppercase tracking-wider text-[#A58263] font-bold">Capsule Locks</p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span>Auto face cluster indexing</span>
                      <span className="font-semibold text-stone-600">{settings.ai_features?.face_search ? "Active" : "Inactive"}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span>Video durations allowed</span>
                      <span className="font-semibold text-stone-600">{settings.video_duration_limit || 10} seconds</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span>Vocal note greetings allowed</span>
                      <span className="font-semibold text-stone-600">{settings.voice_note_duration_limit || 10} seconds</span>
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