"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { slugify, formatDate } from "@/lib/utils"
import {
  PLAN_BASE_PHOTO_LIMITS,
  PHOTO_LIMIT_ADDON_PRICES,
  VIDEO_UNLOCK_ADDON_PRICE,
  VOICE_UNLOCK_ADDON_PRICE,
} from "@/lib/constants"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Switch } from "@/lib/components/ui/switch"
import { toast } from "@/lib/components/ui/toaster"
import { useAuth } from "@/lib/hooks"
import { Playfair_Display } from "next/font/google"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Upload,
  Wand2,
  Check,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Mic,
  Video,
  Image as ImageIcon,
  ShieldCheck,
  Share2,
  Copy,
  Download as DownloadIcon,
  Smile,
  Users,
  Camera,
  User
} from "lucide-react"
import QRCode from "qrcode"
import { QRCodeSVG } from "qrcode.react"

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
})

const getSuggestions = (userName?: string) => {
  const name = userName ? userName.trim().split(" ")[0] : "Alex"
  const firstName = name.charAt(0).toUpperCase() + name.slice(1)
  return [
    `${firstName}'s Wedding Celebration`,
    `${firstName}'s Birthday Party`,
    `${firstName}'s Baby Shower`,
    `${firstName}'s Engagement Night`,
    `${firstName}'s Corporate Gathering`,
    `${firstName}'s Anniversary Dinner`,
  ]
}

const EVENT_TYPE_CARDS = [
  { id: "wedding", name: "Wedding", emoji: "💍", gradient: "from-zinc-900 to-zinc-800", color: "#B89B85" },
  { id: "birthday", name: "Birthday", emoji: "🎂", gradient: "from-zinc-900 to-zinc-800", color: "#D29F6C" },
  { id: "engagement", name: "Engagement", emoji: "🍾", gradient: "from-zinc-900 to-zinc-800", color: "#C68CA3" },
  { id: "corporate", name: "Corporate", emoji: "🏢", gradient: "from-zinc-900 to-zinc-800", color: "#5F87A8" },
  { id: "baby_shower", name: "Baby Shower", emoji: "👶", gradient: "from-zinc-900 to-zinc-800", color: "#5FB6A8" },
  { id: "graduation", name: "Graduation", emoji: "🎓", gradient: "from-zinc-900 to-zinc-800", color: "#6EB887" },
  { id: "festival", name: "Festival", emoji: "🎪", gradient: "from-zinc-900 to-zinc-800", color: "#B28659" },
  { id: "custom", name: "Custom", emoji: "✨", gradient: "from-zinc-900 to-zinc-800", color: "#8E8E93" },
]

const TEMPLATE_COVERS = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop", // Wedding
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=600&auto=format&fit=crop", // Party
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600&auto=format&fit=crop", // Flowers
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop", // Paris / Lights
]

const GRADIENT_COVERS = [
  { name: "Golden Hour", css: "linear-gradient(135deg, #FFDEB4 0%, #FFB4B4 100%)" },
  { name: "Dusk Rose", css: "linear-gradient(135deg, #FAD0C4 0%, #FFD1FF 100%)" },
  { name: "Emerald Mist", css: "linear-gradient(135deg, #D4FC79 0%, #96E6A1 100%)" },
  { name: "Midnight Velvet", css: "linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)" },
]

const THEME_PRESETS: Record<string, {
  containerBg: string
  overlayBg: string
  cardBg: string
  titleColor: string
  subtextColor: string
  accentColor: string
  navColor: string
  navActive: string
  boxBg: string
  boxText: string
}> = {
  minimal: {
    containerBg: "bg-[#FAF9F6]",
    overlayBg: "from-black/20 via-black/10 to-[#FAF9F6]",
    cardBg: "bg-white/90 border-[#F2EDE7] text-[#1C1A17]",
    titleColor: "text-[#1C1A17]",
    subtextColor: "text-[#7A756E]",
    accentColor: "text-[#A58263]",
    navColor: "text-stone-400",
    navActive: "text-[#A58263]",
    boxBg: "bg-white/80 border-[#F2EDE7]",
    boxText: "text-[#69635C]",
  },
  luxury: {
    containerBg: "bg-gradient-to-b from-[#1C1814] via-[#2A241F] to-[#121110]",
    overlayBg: "from-black/40 via-black/20 to-[#121110]",
    cardBg: "bg-[#27211B]/95 border-[#D4AF37]/40 shadow-[0_4px_20px_rgba(212,175,55,0.15)] text-[#F5E6C8]",
    titleColor: "text-[#F5E6C8]",
    subtextColor: "text-[#C5A059]",
    accentColor: "text-[#D4AF37]",
    navColor: "text-[#8C7654]",
    navActive: "text-[#D4AF37]",
    boxBg: "bg-[#1F1A15]/90 border-[#D4AF37]/30",
    boxText: "text-[#D4C3A3]",
  },
  modern: {
    containerBg: "bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#0F172A]",
    overlayBg: "from-black/50 via-purple-950/30 to-[#0F172A]",
    cardBg: "bg-[#1E1B4B]/85 backdrop-blur-md border-purple-500/30 shadow-[0_4px_20px_rgba(168,85,247,0.2)] text-white",
    titleColor: "text-white",
    subtextColor: "text-indigo-200",
    accentColor: "text-purple-400",
    navColor: "text-indigo-300/60",
    navActive: "text-purple-400",
    boxBg: "bg-[#131138]/85 border-purple-500/30",
    boxText: "text-indigo-200",
  },
  elegant: {
    containerBg: "bg-gradient-to-b from-[#FAF5F0] via-[#F5EBE1] to-[#EFE2D3]",
    overlayBg: "from-black/20 via-black/10 to-[#EFE2D3]",
    cardBg: "bg-white/95 border-[#D8C7B5] shadow-md text-[#2C221E]",
    titleColor: "text-[#2C221E]",
    subtextColor: "text-[#8C7665]",
    accentColor: "text-[#9E5A47]",
    navColor: "text-[#A38D7C]",
    navActive: "text-[#9E5A47]",
    boxBg: "bg-white/90 border-[#D8C7B5]",
    boxText: "text-[#5C4B40]",
  },
  glass: {
    containerBg: "bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950",
    overlayBg: "from-black/40 via-purple-950/20 to-slate-950",
    cardBg: "bg-white/20 backdrop-blur-xl border-white/35 shadow-[0_8px_32px_rgba(31,38,135,0.37)] text-white",
    titleColor: "text-white",
    subtextColor: "text-white/80",
    accentColor: "text-pink-300",
    navColor: "text-white/50",
    navActive: "text-pink-300",
    boxBg: "bg-white/15 backdrop-blur-md border-white/25",
    boxText: "text-white/95",
  },
  dark: {
    containerBg: "bg-[#09090B]",
    overlayBg: "from-black/60 via-black/40 to-[#09090B]",
    cardBg: "bg-[#18181B]/95 border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-zinc-100",
    titleColor: "text-zinc-100",
    subtextColor: "text-zinc-400",
    accentColor: "text-amber-400",
    navColor: "text-zinc-500",
    navActive: "text-amber-400",
    boxBg: "bg-[#18181B]/90 border-zinc-800",
    boxText: "text-zinc-300",
  },
}

export function NewEventForm() {

  const router = useRouter()
  const { profile, user } = useAuth()
  
  // Current onboarding step: 1 to 10, then 11 (Final)
  const [step, setStep] = useState(1)
  const [createdEvent, setCreatedEvent] = useState<{ id: string; slug: string } | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  // Onboarding States
  const [name, setName] = useState("")
  const [eventType, setEventType] = useState("wedding")
  const [customEventTypeName, setCustomEventTypeName] = useState("")
  const [coverType, setCoverType] = useState<"template" | "gradient" | "ai" | "upload">("gradient")
  const [coverImage, setCoverImage] = useState("linear-gradient(135deg, #FFDEB4 0%, #FFB4B4 100%)")
  const [aiPrompt, setAiPrompt] = useState("")
  const [generatingAi, setGeneratingAi] = useState(false)
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("22:00")
  const [revealExperience, setRevealExperience] = useState("immediately")
  const [guestCountPlan, setGuestCountPlan] = useState<"free" | "starter" | "standard" | "premium">("starter")
  
  // Addons
  const [guestsBoost, setGuestsBoost] = useState(0)
  const [shotsBoost, setShotsBoost] = useState(0)

  // Content type configurations
  const [contentPhotos, setContentPhotos] = useState(true)
  const [contentVideos, setContentVideos] = useState(true)
  const [contentVoiceNotes, setContentVoiceNotes] = useState(true)
  const [contentMessages, setContentMessages] = useState(true)


  // Specific content limits
  const [photoLimit, setPhotoLimit] = useState(20)
  const [videoDuration, setVideoDuration] = useState(10)
  const [voiceDuration, setVoiceDuration] = useState(10)

  // AI Organize features
  const [aiFaceSearch, setAiFaceSearch] = useState(false)
  const [aiDuplicateCheck, setAiDuplicateCheck] = useState(false)
  const [aiBestShot, setAiBestShot] = useState(false)
  const [aiSmartAlbums, setAiSmartAlbums] = useState(false)
  const [aiHighlights, setAiHighlights] = useState(false)
  const [aiAutoCategorize, setAiAutoCategorize] = useState(false)
  const [aiCustomLayout, setAiCustomLayout] = useState(false)

  // Memory Capsule
  const [capsuleEnabled, setCapsuleEnabled] = useState(false)
  const [capsuleTrigger, setCapsuleTrigger] = useState("anniversary")
  const [capsuleCustomDate, setCapsuleCustomDate] = useState("")

  // Invitation Card Design
  const [invitationTheme, setInvitationTheme] = useState("minimal")
  const [invitationWelcome, setInvitationWelcome] = useState("Scan to capture and share moments with us.")
  const [invitationCountdown, setInvitationCountdown] = useState(true)

  // Dynamic plan prices (per-event pricing, synced with admin)
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({
    free: 0,
    starter: 499,
    standard: 1499,
    premium: 3999,
  })

  // Add-on prices (fetched from /api/payments/addons)
  const [addonPrices, setAddonPrices] = useState<{
    guestBoosts: Array<{ value: number; label: string; price: number }>
    shotBoosts: Array<{ value: number; label: string; price: number }>
  }>({ guestBoosts: [], shotBoosts: [] })

  // Computed per-event total
  const planBasePrice = planPrices[guestCountPlan] ?? 0
  const guestAddonPrice = addonPrices.guestBoosts.find(b => b.value === guestsBoost)?.price ?? (guestsBoost > 0 ? Math.round(guestsBoost * 19.9) : 0)
  const shotAddonPrice = addonPrices.shotBoosts.find(b => b.value === shotsBoost)?.price ?? (shotsBoost > 0 ? Math.round(shotsBoost * 19.9) : 0)

  // Step 7 selections that go beyond what the plan itself includes — these
  // used to be either silently blocked (Videos/Voice on lower plans) or
  // silently free (Unlimited photos on any plan). Now priced the same way
  // guest/shot boosts are, and re-validated server-side at checkout so this
  // display can't be the only thing enforcing it.
  const planBasePhotoLimit = PLAN_BASE_PHOTO_LIMITS[guestCountPlan] ?? 0
  const photoAddonPrice = photoLimit !== planBasePhotoLimit && (photoLimit === -1 || photoLimit > planBasePhotoLimit)
    ? (PHOTO_LIMIT_ADDON_PRICES[photoLimit] ?? 0)
    : 0
  const videoAddonPrice = contentVideos && guestCountPlan !== "standard" && guestCountPlan !== "premium" ? VIDEO_UNLOCK_ADDON_PRICE : 0
  const voiceAddonPrice = contentVoiceNotes && guestCountPlan !== "premium" ? VOICE_UNLOCK_ADDON_PRICE : 0
  const featureAddonPrice = photoAddonPrice + videoAddonPrice + voiceAddonPrice

  const totalEventPrice = planBasePrice + guestAddonPrice + shotAddonPrice + featureAddonPrice

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/payments/plans")
        if (res.ok) {
          const result = await res.json()
          if (result.success && Array.isArray(result.data)) {
            const mapped: Record<string, number> = {}
            result.data.forEach((p: any) => { mapped[p.id] = p.price_inr })
            setPlanPrices(prev => ({ ...prev, ...mapped }))
          }
        }
      } catch (e) {
        console.error("Failed to fetch plan prices", e)
      }
    }
    const fetchAddons = async () => {
      try {
        const res = await fetch("/api/payments/addons")
        if (res.ok) {
          const result = await res.json()
          if (result.success && result.data) {
            setAddonPrices({
              guestBoosts: result.data.guest_boosts?.filter((b: any) => b.value > 0) || [],
              shotBoosts: result.data.shot_boosts?.filter((b: any) => b.value > 0) || [],
            })
          }
        }
      } catch (e) {
        console.error("Failed to fetch addon prices", e)
      }
    }
    fetchPlans()
    fetchAddons()
  }, [])

  // Form Mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !user?.id) {
        throw new Error("User or workspace session not found. Please log in.")
      }

      const supabase = createClient()
      const slug = `${slugify(name || "my-event")}-${Date.now().toString(36)}`

      const calculatedEndDate = endDate 
        ? new Date(`${endDate}T${endTime}`).toISOString() 
        : new Date(Date.now() + 86400000 * 2).toISOString() // default 2 days from now

      const eventData = {
        host_id: profile.id,
        name: name || "Celebration",
        slug,
        description: `Experience created with Snapsy.`,
        event_type: eventType === "custom" && customEventTypeName.trim() ? customEventTypeName.trim() : eventType,
        custom_event_type_name: eventType === "custom" ? customEventTypeName.trim() : null,
        event_date: new Date().toISOString(),
        end_date: calculatedEndDate,
        venue: "Virtual Room",
        timezone: "Asia/Kolkata",
        cover_image_url: coverImage.startsWith("http") ? coverImage : null,
        status: "published" as const,
        settings: {
          is_public: true,
          password_protected: false,
          allow_guest_uploads: contentPhotos,
          auto_approve_photos: true,
          enable_countdown: invitationCountdown,
          countdown_date: calculatedEndDate,
          guest_count_plan: guestCountPlan,
          guests_boost: guestsBoost,
          shots_boost: shotsBoost,
          content_types: {
            photos: contentPhotos,
            videos: contentVideos,
            voice_notes: contentVoiceNotes,
            messages: contentMessages,
          },
          photo_limit: photoLimit,
          video_duration_limit: videoDuration,
          voice_note_duration_limit: voiceDuration,
          cover_gradient: coverImage.startsWith("linear") ? coverImage : null,
          photo_reveal_mode: (revealExperience === "immediately" || revealExperience === "during_event") ? "instant" : "delayed",
          reveal_type: (revealExperience === "immediately" || revealExperience === "during_event") ? "instant" : "delayed",
          reveal_experience: revealExperience,
          ai_features: {
            face_search: aiFaceSearch,
            duplicate_detection: aiDuplicateCheck,
            best_shot: aiBestShot,
            smart_albums: aiSmartAlbums,
            highlights: aiHighlights,
            auto_categorization: aiAutoCategorize,
            custom_layouts: aiCustomLayout,
          },
          capsule: {
            enabled: capsuleEnabled,
            reveal_trigger: capsuleTrigger,
            custom_date: capsuleCustomDate,
          },
          invitation: {
            theme: invitationTheme,
            welcome_message: invitationWelcome,
            countdown_enabled: invitationCountdown,
          }
        },
      }

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      })

      if (!res.ok) {
        const errData = await res.json()
        const msg = typeof errData?.error === "object"
          ? (errData.error.message || errData.error.code)
          : (errData?.error || "Failed to create event")
        throw new Error(msg)
      }

      const jsonRes = await res.json()
      const event = jsonRes.data || jsonRes

      // Default gallery creation if not auto-created by API
      const { data: existingGalleries } = await supabase
        .from("galleries")
        .select("id")
        .eq("event_id", event.id)

      if (!existingGalleries || existingGalleries.length === 0) {
        await supabase.from("galleries").insert({
          event_id: event.id,
          name: "Capsule Gallery",
          slug: "capsule-gallery",
        })
      }

      return event
    },
    onSuccess: (data) => {
      setCreatedEvent(data)
      // Generate QR Code URL
      const host = window.location.host
      const url = `https://${host}/event/${data.slug}`
      QRCode.toDataURL(url)
        .then((code) => setQrCodeUrl(code))
        .catch(console.error)
      
      // Move to Step 11
      setStep(11)
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create event",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Set default countdown end date on mount
  useEffect(() => {
    const today = new Date()
    today.setDate(today.getDate() + 3)
    setEndDate(today.toISOString().split("T")[0])
  }, [])

  // Auto-adjust photo limits based on plans
  useEffect(() => {
    if (guestCountPlan === "free") {
      setPhotoLimit(5)
      setContentVideos(false)
      setContentVoiceNotes(false)
    } else if (guestCountPlan === "starter") {
      setPhotoLimit(20)
      setContentVideos(false)
      setContentVoiceNotes(false)
    } else if (guestCountPlan === "standard") {
      setPhotoLimit(45)
      setContentVideos(true)
    } else if (guestCountPlan === "premium") {
      setPhotoLimit(85)
      setContentVideos(true)
      setContentVoiceNotes(true)
      setAiFaceSearch(true)
    }
  }, [guestCountPlan])

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      toast({ title: "Please name your experience", description: "Name is required to build the memory capsule." })
      return
    }
    if (step === 10) {
      mutation.mutate()
      return
    }
    setStep((prev) => prev + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep((prev) => prev - 1)
  }

  const generateAiCover = () => {
    if (!aiPrompt.trim()) return
    setGeneratingAi(true)
    setTimeout(() => {
      // Mock generate a high-quality illustration photo related to the prompt
      setCoverImage("https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=600&auto=format&fit=crop")
      setGeneratingAi(false)
      toast({ title: "AI Cover generated!", description: "Applied your dream theme visual." })
    }, 1500)
  }

  const copyInviteLink = () => {
    if (!createdEvent) return
    const host = window.location.host
    navigator.clipboard.writeText(`https://${host}/event/${createdEvent.slug}`)
    toast({ title: "Invite link copied", description: "Share it with your guests!" })
  }

  const handleLaunch = () => {
    if (!createdEvent) return

    // Per-event model: free plan skips payment, all paid plans (and any paid
    // add-on — guest/shot boosts, or a photo cap / video / voice upsell) go
    // to checkout for this specific event.
    if (guestCountPlan === "free" && guestsBoost === 0 && shotsBoost === 0 && featureAddonPrice === 0) {
      router.push(`/dashboard/events/${createdEvent.slug}`)
      return
    }

    // Build checkout URL with event context so payment is tied to this event
    const params = new URLSearchParams({
      plan: guestCountPlan,
      event: createdEvent.slug,
      guests: String(guestsBoost),
      shots: String(shotsBoost),
      photo_limit: String(photoLimit),
      videos: contentVideos ? "1" : "0",
      voice_notes: contentVoiceNotes ? "1" : "0",
    })
    router.push(`/checkout?${params.toString()}`)
  }
  const [uploadingCover, setUploadingCover] = useState(false)

  const handleCustomCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please upload an image file (JPG, PNG, WebP).", variant: "destructive" })
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
        // Fallback: Read as base64 Data URL if storage bucket fails or restricted
        const reader = new FileReader()
        reader.onload = (evt) => {
          if (evt.target?.result) {
            setCoverImage(evt.target.result as string)
            toast({ title: "Custom Cover Applied!", description: "Your custom photo is set as the event cover." })
          }
        }
        reader.readAsDataURL(file)
        return
      }

      const { data: publicData } = supabase.storage.from("photos").getPublicUrl(filePath)
      if (publicData?.publicUrl) {
        setCoverImage(publicData.publicUrl)
        toast({ title: "Custom Cover Uploaded!", description: "Applied your custom photo as the event cover." })
      }
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message || "Failed to process image", variant: "destructive" })
    } finally {
      setUploadingCover(false)
    }
  }

  return (
    <div className="w-full min-h-[calc(100vh-6rem)] bg-black text-white flex flex-col font-sans rounded-3xl border border-zinc-800 shadow-sm overflow-hidden selection:bg-zinc-700">
      
      {/* Top Header */}
      <header className="px-4 md:px-6 py-2.5 flex items-center justify-between border-b border-zinc-800 w-full shrink-0 bg-zinc-950/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className={`${playfair.className} text-lg md:text-xl font-bold tracking-wider text-amber-400`}>SNAPSY</span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 px-2 py-0.5 border border-zinc-800 rounded-full">Capsule Maker</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Live price summary — visible from Step 6 onwards */}
          {step >= 6 && step <= 10 && (
            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1">
              <span className="text-[10px] font-semibold text-amber-400 capitalize">
                {guestCountPlan === "free" ? "Free Trial" : `${guestCountPlan.charAt(0).toUpperCase() + guestCountPlan.slice(1)} Plan`}
              </span>
              {(guestsBoost > 0 || shotsBoost > 0) && (
                <span className="text-[9px] text-zinc-500">
                  +{guestsBoost > 0 ? `${guestsBoost}G` : ""}{guestsBoost > 0 && shotsBoost > 0 ? " " : ""}{shotsBoost > 0 ? `${shotsBoost}S` : ""}
                </span>
              )}
              <span className="h-3 w-px bg-zinc-700" />
              <span className="text-[11px] font-bold text-white">
                {totalEventPrice === 0 ? "Free" : `₹${totalEventPrice.toLocaleString("en-IN")}`}
              </span>
            </div>
          )}
          <div className="text-[11px] font-semibold text-zinc-500 tracking-widest">
            {step <= 10 ? `STEP ${step} OF 10` : "READY"}
          </div>
        </div>
      </header>

      {/* Main Experience Layout */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 items-center justify-between gap-6 lg:gap-12 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Side: Step Card Container */}
        <div className="w-full lg:w-3/5 max-w-xl flex flex-col justify-center min-h-[360px] md:min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* STEP 1: EVENT NAME */}
              {step === 1 && (
                <div className="space-y-6">
                  <h1 className={`${playfair.className} text-4xl md:text-5xl font-light leading-tight tracking-tight text-white`}>
                    What should we call your event?
                  </h1>
                  <p className="text-sm text-zinc-400 max-w-md">
                    Give your memory capsule a name. Something personal, emotional, or celebratory.
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`e.g. ${profile?.full_name?.split(" ")[0] || "Alex"}'s Wedding Celebration`}
                      className="w-full bg-transparent border-b-2 border-zinc-700 focus:border-amber-400 outline-none text-2xl md:text-3xl py-3 transition-colors placeholder:text-zinc-600"
                      autoFocus
                    />
                  </div>
                  
                  {/* Suggestions */}
                  <div className="pt-2 space-y-3">
                    <p className="text-[11px] uppercase tracking-widest text-zinc-500">Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {getSuggestions(profile?.full_name || user?.user_metadata?.full_name || user?.email).map((s) => (
                        <button
                          key={s}
                          onClick={() => setName(s)}
                          className="px-4 py-2 text-xs rounded-full border border-zinc-800 bg-zinc-900 hover:border-amber-400 hover:bg-zinc-800 text-zinc-400 transition-all cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: EVENT TYPE */}
              {step === 2 && (
                <div className="space-y-4">
                  <h1 className={`${playfair.className} text-2xl md:text-3xl font-medium leading-tight tracking-tight text-white`}>
                    What kind of event are you creating?
                  </h1>
                  <p className="text-xs md:text-sm text-zinc-400">
                    Your choice tailors custom filters, layout designs, and countdown capsules.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {EVENT_TYPE_CARDS.map((type) => {
                      const isSelected = eventType === type.id
                      return (
                        <button
                          key={type.id}
                          onClick={() => {
                            setEventType(type.id)
                            // Auto select a gradient theme color that corresponds to event type
                            if (type.id === "wedding") setCoverImage("linear-gradient(135deg, #FAD0C4 0%, #FFD1FF 100%)")
                            else if (type.id === "birthday") setCoverImage("linear-gradient(135deg, #FFDEB4 0%, #FFB4B4 100%)")
                            else if (type.id === "corporate") setCoverImage("linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)")
                            else setCoverImage("linear-gradient(135deg, #E2E2E2 0%, #C9C9C9 100%)")
                          }}
                          className={`p-3 rounded-xl text-left border transition-all flex items-center gap-3 h-14 cursor-pointer bg-gradient-to-br ${type.gradient} ${
                            isSelected ? "border-amber-400 shadow-sm ring-1 ring-amber-400" : "border-zinc-800 hover:border-zinc-600"
                          }`}
                        >
                          <span className="text-xl shrink-0">{type.emoji}</span>
                          <span className="text-xs font-semibold text-white truncate">{type.name}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom Event Category Name Input */}
                  {eventType === "custom" && (
                    <div className="pt-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-semibold text-white flex items-center gap-1">
                        <span>Enter your custom event category name</span>
                        <span className="text-amber-400">*</span>
                      </label>
                      <Input
                        value={customEventTypeName}
                        onChange={(e) => setCustomEventTypeName(e.target.value)}
                        placeholder="e.g. Family Reunion, Tech Conference, Housewarming..."
                        className="bg-zinc-900 border-zinc-800 focus:border-amber-400 text-sm h-10 shadow-sm"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: EVENT COVER */}
              {step === 3 && (
                <div className="space-y-6">
                  <h1 className={`${playfair.className} text-4xl md:text-5xl font-light leading-tight tracking-tight text-white`}>
                    Choose a cover for your memories.
                  </h1>
                  
                  {/* Selector tabs */}
                  <div className="flex border-b border-zinc-800 overflow-x-auto">
                    {[
                      { id: "gradient", label: "Gradients" },
                      { id: "template", label: "Templates" },
                      { id: "upload", label: "Custom Upload 📤" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setCoverType(tab.id as any)}
                        className={`pb-2 px-3.5 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                          coverType === tab.id ? "border-b-2 border-amber-400 text-amber-400" : "text-zinc-500"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Gradient Section */}
                  {coverType === "gradient" && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {GRADIENT_COVERS.map((grad) => {
                        const isSelected = coverImage === grad.css
                        return (
                          <button
                            key={grad.name}
                            onClick={() => setCoverImage(grad.css)}
                            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer bg-zinc-900 ${
                              isSelected ? "border-amber-400 shadow-sm" : "border-zinc-800 hover:border-zinc-600"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: grad.css }} />
                            <span className="text-xs font-medium text-zinc-400">{grad.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Template Section */}
                  {coverType === "template" && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {TEMPLATE_COVERS.map((url, idx) => {
                        const isSelected = coverImage === url
                        return (
                          <button
                            key={idx}
                            onClick={() => setCoverImage(url)}
                            className={`h-24 rounded-xl border overflow-hidden relative transition-all cursor-pointer ${
                              isSelected ? "border-amber-400 shadow-md scale-[1.02]" : "border-zinc-800"
                            }`}
                          >
                            <img src={url} alt={`Template ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-all" />
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Custom Upload Section */}
                  {coverType === "upload" && (
                    <div className="pt-2 space-y-3">
                      <label className="border-2 border-dashed border-zinc-800 hover:border-amber-400 bg-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-zinc-800">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
                          <Upload className="h-6 w-6" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-semibold text-white">
                            {uploadingCover ? "Uploading custom cover..." : "Click to upload your custom cover photo"}
                          </p>
                          <p className="text-xs text-zinc-500">PNG, JPG, or WebP (max 10MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustomCoverUpload}
                          disabled={uploadingCover}
                          className="hidden"
                        />
                      </label>

                      {coverImage.startsWith("http") && !TEMPLATE_COVERS.includes(coverImage) && (
                        <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
                          <img src={coverImage} alt="Custom cover preview" className="w-14 h-14 rounded-lg object-cover border border-zinc-800" />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-emerald-600 block">✓ Custom Cover Active</span>
                            <span className="text-[10px] text-zinc-500">Visible live on your event memory capsule</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: EVENT END DATE */}
              {step === 4 && (
                <div className="space-y-6">
                  <h1 className={`${playfair.className} text-4xl md:text-5xl font-light leading-tight tracking-tight text-white`}>
                    When does your event end?
                  </h1>
                  <p className="text-sm text-zinc-400">
                    Once ended, guest upload portals lock, and final preparation for the memory reveal starts.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">End Date</label>
                      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                        <CalendarIcon className="h-4 w-4 text-amber-400" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-transparent outline-none text-sm text-white flex-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Locks at Time</label>
                      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                        <Clock className="h-4 w-4 text-amber-400" />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="bg-transparent outline-none text-sm text-white flex-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-zinc-400 font-medium">
                      Event active live. Countdown clock starts running immediately upon launch.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 5: REVEAL EXPERIENCE */}
              {step === 5 && (
                <div className="space-y-6">
                  <h1 className={`${playfair.className} text-4xl md:text-5xl font-light leading-tight tracking-tight text-white`}>
                    When should guests see the memories?
                  </h1>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[
                      { id: "immediately", label: "Immediately", desc: "Uploads go live instantly" },
                      { id: "during", label: "During Event", desc: "Show active photo stream" },
                      { id: "after", label: "After Event", desc: "Locks until end time is reached" },
                      { id: "24h", label: "24 Hours Later", desc: "Delivers a morning after capsule" },
                      { id: "7d", label: "7 Days Later", desc: "Presents a delayed cinematic album" },
                      { id: "custom", label: "Custom Date", desc: "Pick your own reveal date" },
                    ].map((opt) => {
                      const isSelected = revealExperience === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setRevealExperience(opt.id)}
                          className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all bg-zinc-900 cursor-pointer ${
                            isSelected ? "border-amber-400 shadow-sm" : "border-zinc-800 hover:border-zinc-600"
                          }`}
                        >
                          <span className="text-xs font-bold text-white">{opt.label}</span>
                          <span className="text-[10px] text-zinc-400 mt-1">{opt.desc}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Thumbnail Reveal Blur Demo */}
                  <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900 space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold text-center">Interactive Reveal Preview</p>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-16 h-16 rounded-lg bg-cover bg-center relative overflow-hidden shadow-inner" style={{ backgroundImage: `url(${TEMPLATE_COVERS[i % TEMPLATE_COVERS.length]})` }}>
                          <motion.div
                            animate={{ opacity: revealExperience === "immediately" ? 0 : 0.8 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 bg-zinc-900/90 backdrop-blur-md flex items-center justify-center"
                          >
                            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: GUEST COUNT & PLANS */}
              {step === 6 && (
                <div className="space-y-6">
                  <h1 className={`${playfair.className} text-4xl md:text-5xl font-light leading-tight tracking-tight text-white`}>
                    How many guests are joining?
                  </h1>
                  
                  <div className="space-y-3 pt-2">
                    {[
                      { id: "free", name: "Free Trial", price: "Free (₹0)", limit: "Up to 5 guests", desc: "5 shots/guest · Standard photo reveal · Basic web gallery · All media view" },
                      { id: "starter", name: "Starter Plan", price: `₹${planPrices.starter || 499}`, limit: "Up to 10 guests", desc: "20 shots/guest · Standard reveal · Basic web gallery · 3 filters · All media download" },
                      { id: "standard", name: "Standard Plan", price: `₹${planPrices.standard || 1499}`, limit: "Up to 25 guests", desc: "45 shots/guest · Custom reveal · 7 filters · Download option · 10s Video uploads" },
                      { id: "premium", name: "Premium Plan", price: `₹${planPrices.premium || 3999}`, limit: "Up to 100 guests", desc: "85 shots/guest · AI Face matching · 15 filters · 30s Video · 30s Voice notes · Reactions" },
                    ].map((plan) => {
                      const isSelected = guestCountPlan === plan.id
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setGuestCountPlan(plan.id as any)}
                          className={`p-4 rounded-2xl border-2 transition-all bg-zinc-900 cursor-pointer flex justify-between items-start gap-4 ${
                            isSelected ? "border-amber-400 shadow-sm" : "border-zinc-800 hover:border-zinc-600"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{plan.name}</span>
                              {plan.id === "premium" && (
                                <span className="bg-zinc-800 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Luxe</span>
                              )}
                            </div>
                            <p className="text-xs text-amber-400 font-medium">{plan.limit}</p>
                            <p className="text-[10px] text-zinc-400 leading-relaxed max-w-sm">{plan.desc}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-bold text-white">{plan.price}</span>
                            <span className="text-[9px] text-zinc-500 block">One-time event</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Addon boosters section */}
                  <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-900 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                      <Users className="h-4 w-4" />
                      <span>Custom Quota Boost Add-ons</span>
                    </div>

                    {/* Guest Boost Tier Picker */}
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-xs text-white">Boost Guest Capacity</p>
                        <p className="text-[10px] text-zinc-400">Add extra guests above your plan limit</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setGuestsBoost(0)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${guestsBoost === 0 ? "bg-amber-500 text-white border-amber-400" : "bg-zinc-800 border-zinc-800 text-zinc-400 hover:border-amber-400"}`}
                        >
                          None
                        </button>
                        {(addonPrices.guestBoosts.length > 0
                          ? addonPrices.guestBoosts
                          : [{ value: 10, label: "+10 guests", price: 199 }, { value: 25, label: "+25 guests", price: 399 }, { value: 50, label: "+50 guests", price: 699 }, { value: 100, label: "+100 guests", price: 1199 }]
                        ).map((boost) => (
                          <button
                            key={boost.value}
                            onClick={() => setGuestsBoost(boost.value)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${guestsBoost === boost.value ? "bg-amber-500 text-white border-amber-400" : "bg-zinc-800 border-zinc-800 text-zinc-400 hover:border-amber-400"}`}
                          >
                            +{boost.value} guests
                            <span className={`font-bold ${guestsBoost === boost.value ? "text-white/80" : "text-amber-400"}`}>₹{boost.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shot Boost Tier Picker */}
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-xs text-white">Boost Shot Quota</p>
                        <p className="text-[10px] text-zinc-400">Add extra photo uploads allowed per guest</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setShotsBoost(0)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${shotsBoost === 0 ? "bg-amber-500 text-white border-amber-400" : "bg-zinc-800 border-zinc-800 text-zinc-400 hover:border-amber-400"}`}
                        >
                          None
                        </button>
                        {(addonPrices.shotBoosts.length > 0
                          ? addonPrices.shotBoosts
                          : [{ value: 5, label: "+5 shots", price: 99 }, { value: 10, label: "+10 shots", price: 179 }, { value: 25, label: "+25 shots", price: 249 }]
                        ).map((boost) => (
                          <button
                            key={boost.value}
                            onClick={() => setShotsBoost(boost.value)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${shotsBoost === boost.value ? "bg-amber-500 text-white border-amber-400" : "bg-zinc-800 border-zinc-800 text-zinc-400 hover:border-amber-400"}`}
                          >
                            +{boost.value} shots/guest
                            <span className={`font-bold ${shotsBoost === boost.value ? "text-white/80" : "text-amber-400"}`}>₹{boost.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live total for this event */}
                    {(guestsBoost > 0 || shotsBoost > 0) && (
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                        <p className="text-[10px] text-zinc-400">Add-on subtotal for this event</p>
                        <p className="text-sm font-bold text-white">₹{(guestAddonPrice + shotAddonPrice).toLocaleString("en-IN")}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 7: CONTENT TYPES & SETTINGS */}
              {step === 7 && (
                <div className="space-y-6">
                  <h1 className={`${playfair.className} text-4xl md:text-5xl font-light leading-tight tracking-tight text-white`}>
                    What can your guests contribute?
                  </h1>
                  
                  <div className="space-y-4">
                    {/* Photos switch */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📸</span>
                          <div>
                            <p className="text-sm font-bold text-white">Photos</p>
                            <p className="text-[10px] text-zinc-400">Still photographs of moments</p>
                          </div>
                        </div>
                        <Switch checked={contentPhotos} onCheckedChange={setContentPhotos} />
                      </div>
                      {contentPhotos && (
                        <div className="pt-2 border-t border-zinc-800 flex flex-wrap gap-2 items-center justify-between text-xs">
                          <span className="text-zinc-400">Maximum photos per guest:</span>
                          <div className="flex gap-2">
                            {[5, 10, 25, 50, -1].map((val) => {
                              const addonPrice = val !== planBasePhotoLimit && (val === -1 || val > planBasePhotoLimit)
                                ? (PHOTO_LIMIT_ADDON_PRICES[val] ?? 0)
                                : 0
                              return (
                                <button
                                  key={val}
                                  onClick={() => {
                                    if (addonPrice > 0) {
                                      toast({ title: "Photo cap upgrade", description: `Above your plan's included limit — adds ₹${addonPrice} to this event.` })
                                    }
                                    setPhotoLimit(val)
                                  }}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                    photoLimit === val ? "bg-amber-500 text-white border-amber-400" : "bg-zinc-800 border-zinc-800 text-zinc-400"
                                  }`}
                                >
                                  {val === -1 ? "Unlimited" : val}
                                  {addonPrice > 0 && <span className="opacity-70"> +₹{addonPrice}</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Videos switch */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎥</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-white">Videos</p>
                              {videoAddonPrice > 0 && (
                                <span className="bg-zinc-800 text-amber-400 text-[9px] font-bold px-1 py-0.2 rounded-full uppercase scale-95">+₹{videoAddonPrice} add-on</span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400">Capture motion events and video highlights</p>
                          </div>
                        </div>
                        <Switch
                          checked={contentVideos}
                          onCheckedChange={(c) => {
                            if (c && guestCountPlan !== "standard" && guestCountPlan !== "premium") {
                              toast({ title: "Videos add-on", description: `Not included in your plan — adds ₹${VIDEO_UNLOCK_ADDON_PRICE} to this event.` })
                            }
                            setContentVideos(c)
                          }}
                        />
                      </div>
                      {contentVideos && (
                        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Duration limit per clip:</span>
                          <div className="flex gap-2">
                            {[10, 20, 30].map((sec) => (
                              <button
                                key={sec}
                                onClick={() => setVideoDuration(sec)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                  videoDuration === sec ? "bg-amber-500 text-white border-amber-400" : "bg-zinc-800 border-zinc-800 text-zinc-400"
                                }`}
                              >
                                {sec}s
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Voice Notes switch */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎤</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-white">Voice Notes</p>
                              {voiceAddonPrice > 0 && (
                                <span className="bg-zinc-800 text-amber-400 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase scale-95">+₹{voiceAddonPrice} add-on</span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400">Collect voice messages and wedding wishes</p>
                          </div>
                        </div>
                        <Switch
                          checked={contentVoiceNotes}
                          onCheckedChange={(c) => {
                            if (c && guestCountPlan !== "premium") {
                              toast({ title: "Voice Notes add-on", description: `Premium-tier feature — adds ₹${VOICE_UNLOCK_ADDON_PRICE} to this event.` })
                            }
                            setContentVoiceNotes(c)
                          }}
                        />
                      </div>
                      {contentVoiceNotes && (
                        <div className="pt-2 border-t border-zinc-800 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">Duration limit per note:</span>
                            <div className="flex gap-2">
                              {[10, 20, 30].map((sec) => (
                                <button
                                  key={sec}
                                  onClick={() => setVoiceDuration(sec)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                    voiceDuration === sec ? "bg-amber-500 text-white border-amber-400" : "bg-zinc-800 border-zinc-800 text-zinc-400"
                                  }`}
                                >
                                  {sec}s
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Voice player design mock */}
                          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center gap-3 mt-1">
                            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0">
                              <Mic className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="h-1 bg-stone-200 rounded-full w-full overflow-hidden">
                                <div className="h-full bg-amber-500 w-1/3" />
                              </div>
                              <p className="text-[8px] text-zinc-500">Preview: "Wedding Wishes" audio note</p>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono shrink-0">0:04 / 0:15</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Messages switch */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💌</span>
                        <div>
                          <p className="text-sm font-bold text-white">Reaction Messages</p>
                          <p className="text-[10px] text-zinc-400">Guest notes, emoji reaction tags, and advice cards</p>
                        </div>
                      </div>
                      <Switch checked={contentMessages} onCheckedChange={setContentMessages} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 8: AI FEATURES */}
              {step === 8 && (
                <div className="space-y-6">
                  <h1 className={`${playfair.className} text-4xl md:text-5xl font-light leading-tight tracking-tight text-white`}>
                    Let AI organize your memories.
                  </h1>
                  <p className="text-sm text-zinc-400">
                    Activate powerful server-side AI agents to catalog and index guest uploads.
                  </p>

                  <div className="space-y-3 pt-2">
                    {[
                      { id: "search", label: "AI Face Search", desc: "Guests scan their face to instantly pull photos they are in", state: aiFaceSearch, setter: setAiFaceSearch, premium: true },
                      { id: "dup", label: "Smart Duplicate Detection", desc: "Filters out near-identical burst shots to save layout space", state: aiDuplicateCheck, setter: setAiDuplicateCheck, premium: true },
                      { id: "best", label: "Best Shot Selection", desc: "Auto-flags high-clarity, well-lit smiles for event highlights", state: aiBestShot, setter: setAiBestShot, premium: true },
                      { id: "albums", label: "Smart Albums", desc: "Groups memories automatically by activity, timing, or hosts", state: aiSmartAlbums, setter: setAiSmartAlbums, premium: false },
                      { id: "highlights", label: "Auto Highlights Reel", desc: "Generates an emotional slideshow summarizing the day", state: aiHighlights, setter: setAiHighlights, premium: false },
                      { id: "categorize", label: "Auto Categorization", desc: "Tags items (candles, dances, cakes, sunset) automatically", state: aiAutoCategorize, setter: setAiAutoCategorize, premium: true },
                      { id: "customLayout", label: "Custom Layout Planner", desc: "Dynamically constructs custom print-ready grid spacing", state: aiCustomLayout, setter: setAiCustomLayout, premium: true },
                    ].map((feature, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{feature.label}</span>
                            {feature.premium && (
                              <span className="bg-zinc-800 text-amber-400 text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase scale-90">Premium</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed max-w-sm">{feature.desc}</p>
                        </div>
                        <Switch
                          checked={feature.state}
                          onCheckedChange={(c) => {
                            if (feature.premium && guestCountPlan !== "premium") {
                              toast({ title: "Upgrade required", description: "This AI capability is unlocked on the Premium tier." })
                              return
                            }
                            feature.setter(c)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 9: MEMORY CAPSULE */}
              {step === 9 && (
                <div className="space-y-6">
                  <h1 className={`${playfair.className} text-4xl md:text-5xl font-light leading-tight tracking-tight text-white`}>
                    Create a memory capsule?
                  </h1>
                  <p className="text-sm text-zinc-400">
                    Lock files in a secure virtual capsule until a future special date. Build anticipation.
                  </p>

                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Enable Memory Capsule</p>
                      <p className="text-[10px] text-zinc-400">Hide contribution stream until reveal date is reached</p>
                    </div>
                    <Switch checked={capsuleEnabled} onCheckedChange={setCapsuleEnabled} />
                  </div>

                  {capsuleEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 pt-2"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "after_event", label: "After Event Ends" },
                          { id: "30_days", label: "Reveal 30 Days Later" },
                          { id: "6_months", label: "Reveal 6 Months Later" },
                          { id: "anniversary", label: "Reveal on Anniversary" },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setCapsuleTrigger(t.id)}
                            className={`p-3 rounded-lg border text-[11px] font-bold text-left transition-all ${
                              capsuleTrigger === t.id ? "bg-amber-500 text-white border-amber-400" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Locked capsule safe box animation mock */}
                      <div className="p-6 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-800 border border-zinc-800 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shadow-sm relative">
                          <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 3 }}
                          >
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </motion.div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
                        </div>
                        <div className="space-y-1">
                          <p className={`${playfair.className} text-lg font-medium text-white`}>Memory Safe Activated</p>
                          <p className="text-[10px] text-zinc-400 max-w-xs mx-auto">
                            All media, audio, and messages will remain blurred and unreadable. Unlocking on Anniversary day.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* STEP 10: INVITATION CARD DESIGN */}
              {step === 10 && (
                <div className="space-y-6">
                  <h1 className={`${playfair.className} text-4xl md:text-5xl font-light leading-tight tracking-tight text-white`}>
                    Design your invitation experience.
                  </h1>
                  
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Select Theme Template</label>
                      <div className="flex flex-wrap gap-2">
                        {["minimal", "luxury", "modern", "elegant", "glass", "dark"].map((theme) => (
                          <button
                            key={theme}
                            type="button"
                            onClick={() => setInvitationTheme(theme)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-all cursor-pointer ${
                              invitationTheme === theme ? "bg-amber-500 text-white border-amber-400" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                            }`}
                          >
                            {theme}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold block">Welcome Message</label>
                      <textarea
                        value={invitationWelcome}
                        onChange={(e) => setInvitationWelcome(e.target.value)}
                        rows={2}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs outline-none focus:border-amber-400"
                        placeholder="Write a greeting for guests scanning the QR card..."
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-900">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white">Display Countdown Clock</p>
                        <p className="text-[9px] text-zinc-400">Shows ticks countdown till reveal unlocks</p>
                      </div>
                      <Switch checked={invitationCountdown} onCheckedChange={setInvitationCountdown} />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="pt-8 flex items-center justify-between border-t border-zinc-800">
                {step > 1 ? (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                <Button
                  onClick={handleNext}
                  disabled={mutation.isPending}
                  className="bg-amber-500 text-white hover:bg-amber-600 font-bold px-6 py-5 rounded-full flex items-center gap-2 border-none shadow-[0_4px_14px_rgba(165,130,99,0.2)] cursor-pointer"
                >
                  {mutation.isPending ? (
                    <span>Saving Capsule...</span>
                  ) : (
                    <>
                      <span>{step === 10 ? "Launch Capsule" : "Continue"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Progress Dots indicators */}
              <div className="flex items-center justify-center gap-1.5 pt-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i + 1 === step ? "w-6 bg-amber-400" : "w-1.5 bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Side: Phone Mockup Live Preview (Fidelity WOW factor) */}
        <div className="w-full lg:w-2/5 flex justify-center items-center py-2 shrink-0">
          <div className="w-[250px] sm:w-[270px] md:w-[280px] h-[450px] sm:h-[480px] md:h-[510px] rounded-[36px] md:rounded-[40px] border-[8px] md:border-[10px] border-[#1C1A17] bg-[#FAF8F5] shadow-xl overflow-hidden relative flex flex-col justify-between p-3.5 shrink-0 select-none scale-90 sm:scale-95 md:scale-100 origin-center transition-all">
            
            {/* Phone Camera Notch notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#1C1A17] rounded-full z-20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-[#222]" />
            </div>

            {/* Simulated App Content Wrapper */}
            {(() => {
              const currentTheme = THEME_PRESETS[invitationTheme] || THEME_PRESETS.minimal
              return (
                <div className={`absolute inset-0 ${currentTheme.containerBg} transition-colors duration-500 flex flex-col justify-between p-4 pt-10 overflow-hidden`}>
                  
                  {/* Event Cover Image Backdrop */}
                  <div className="absolute top-0 left-0 right-0 h-44 z-0 overflow-hidden">
                    <div
                      className="w-full h-full bg-cover bg-center transition-all duration-500"
                      style={{
                        backgroundImage: coverImage.startsWith("http") ? `url(${coverImage})` : coverImage,
                      }}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-b ${currentTheme.overlayBg}`} />
                  </div>

                  {/* Top Row: Brand & Mode */}
                  <div className="z-10 flex justify-between items-center text-white text-[10px] uppercase tracking-widest font-semibold drop-shadow">
                    <span>Snapsy Live</span>
                    <span className="bg-black/35 px-1.5 py-0.5 rounded-full text-[8px] backdrop-blur-sm">Mockup</span>
                  </div>

                  {/* Event Dynamic Details Card */}
                  <div className={`z-10 mt-16 ${currentTheme.cardBg} transition-all duration-500 rounded-2xl p-4 flex flex-col gap-2.5`}>
                    <span className={`text-[8px] uppercase tracking-widest ${currentTheme.accentColor} font-bold`}>
                      {eventType === "custom" ? (customEventTypeName || "Custom Capsule") : `${eventType.replace(/_/g, " ")} Capsule`}
                    </span>
                    
                    <h3 className={`${playfair.className} text-xl leading-tight font-medium ${currentTheme.titleColor}`}>
                      {name || "Your Event Name"}
                    </h3>

                    {/* Event timeline details preview */}
                    <div className={`flex flex-col gap-1 text-[9px] ${currentTheme.subtextColor}`}>
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className={`h-3 w-3 ${currentTheme.accentColor}`} />
                        <span>Locks: {endDate ? formatDate(endDate) : "Oct 12, 2026"} at {endTime}</span>
                      </div>
                      {capsuleEnabled && (
                        <div className={`flex items-center gap-1.5 font-semibold ${currentTheme.accentColor}`}>
                          <ShieldCheck className="h-3 w-3" />
                          <span>Capsule: Unlocks on {capsuleTrigger.replace(/_/g, " ")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Contribution Grid Mockup inside Phone */}
                  <div className="z-10 flex-1 mt-3 flex flex-col justify-end">
                    <div className={`${currentTheme.boxBg} transition-all duration-500 rounded-xl p-3 space-y-2`}>
                      <p className={`text-[8px] uppercase tracking-wider ${currentTheme.subtextColor} font-bold`}>Allowed contributions</p>
                      <div className={`flex items-center justify-between text-[11px] ${currentTheme.boxText}`}>
                        <div className="flex items-center gap-1">
                          <span className={contentPhotos ? "opacity-100" : "opacity-30"}>📸</span>
                          <span className={`text-[9px] ${contentPhotos ? "font-bold" : "line-through opacity-40"}`}>Photos ({photoLimit === -1 ? "∞" : photoLimit})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={contentVideos ? "opacity-100" : "opacity-30"}>🎥</span>
                          <span className={`text-[9px] ${contentVideos ? "font-bold" : "line-through opacity-40"}`}>Videos</span>
                        </div>
                      </div>
                      <div className={`flex items-center justify-between text-[11px] ${currentTheme.boxText}`}>
                        <div className="flex items-center gap-1">
                          <span className={contentVoiceNotes ? "opacity-100" : "opacity-30"}>🎤</span>
                          <span className={`text-[9px] ${contentVoiceNotes ? "font-bold" : "line-through opacity-40"}`}>Voice</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={contentMessages ? "opacity-100" : "opacity-30"}>💌</span>
                          <span className={`text-[9px] ${contentMessages ? "font-bold" : "line-through opacity-40"}`}>Reactions</span>
                        </div>
                      </div>
                    </div>

                    {/* Simulated Bottom Navigation */}
                    <div className={`mt-4 border-t border-white/10 pt-2 flex justify-around ${currentTheme.navColor}`}>
                      <span className={`text-[10px] font-bold ${currentTheme.navActive}`}>Invites</span>
                      <span className="text-[10px]">Gallery</span>
                      <span className="text-[10px]">Shots</span>
                    </div>
                  </div>

                </div>
              )
            })()}
          </div>
        </div>

      </main>

      {/* STEP 11 / FINAL CELEBRATION MODAL */}
      <AnimatePresence>
        {step === 11 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative space-y-6"
            >
              
              {/* Confetti Visual Mock */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-gradient-to-tr from-[#FFDEB4] to-[#FAD0C4] flex items-center justify-center text-3xl shadow-lg border-4 border-white animate-bounce">
                🎉
              </div>

              <div className="text-center pt-8 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Setup Complete</span>
                <h2 className={`${playfair.className} text-3xl font-medium text-white`}>
                  Your memory capsule is ready.
                </h2>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  The portal has been created. Invite guests to share photos, video clips, and vocal greetings.
                </p>
              </div>

              {/* Real Custom Snapsy Logo QR Card Output */}
              <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-900 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                <div className="p-2 bg-white rounded-xl border border-zinc-800 relative overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src="/Favicon.png"
                    alt="Snapsy Logo Background"
                    className="absolute inset-0 w-full h-full object-contain opacity-25 p-1 pointer-events-none"
                  />
                  <QRCodeSVG
                    id="new-event-modal-qr"
                    value={createdEvent ? `${typeof window !== "undefined" ? window.location.origin : "https://snapsy-events.vercel.app"}/event/${createdEvent.slug}` : "https://snapsy-events.vercel.app"}
                    size={120}
                    bgColor={"transparent"}
                    fgColor={"#1c1a17"}
                    level={"H"}
                    imageSettings={{
                      src: "/Favicon.png",
                      x: undefined,
                      y: undefined,
                      height: 32,
                      width: 32,
                      excavate: true,
                    }}
                    className="relative z-10"
                  />
                </div>

                <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">{name}</p>
                    <p className="text-[10px] text-amber-400">Plan: {guestCountPlan.toUpperCase()}</p>
                  </div>
                  
                  {/* Share/Actions */}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <button
                      onClick={copyInviteLink}
                      className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-800 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy link</span>
                    </button>
                    {qrCodeUrl && (
                      <a
                        href={qrCodeUrl}
                        download={`${slugify(name)}-qr-code.png`}
                        className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-800 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400 transition-all flex items-center gap-1.5"
                      >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        <span>Download QR</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/events")}
                  className="flex-1 border-zinc-800 text-zinc-400 hover:bg-zinc-800 rounded-xl py-5"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={handleLaunch}
                  className="flex-1 bg-amber-500 text-white hover:bg-amber-600 font-bold rounded-xl py-5 border-none shadow-[0_4px_14px_rgba(165,130,99,0.2)]"
                >
                  Launch Event
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}