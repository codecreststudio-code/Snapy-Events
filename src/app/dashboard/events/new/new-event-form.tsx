"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { slugify, formatDate } from "@/lib/utils"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Switch } from "@/lib/components/ui/switch"
import { toast } from "@/lib/components/ui/toaster"
import { useAuth } from "@/lib/hooks"
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
import { EVENT_TYPES } from "@/lib/constants"

// Mirrors the shape Admin > Subscriptions > Plan Builder writes to the
// `plans` table (see src/app/admin/subscriptions/plan-builder.tsx and
// src/app/api/payments/plans/route.ts) — this is the single live source of
// truth for plan names, prices, guest/shot quotas, and feature toggles
// (video_uploads, voice_notes, ai_face_search, etc., all stored inside
// `limits`). Step 6 below renders directly from this instead of a hardcoded
// free/starter/standard/premium options array, so it can never drift from
// what's actually configured in Admin or shown on the public /pricing page.
interface LivePlan {
  id: string
  name: string
  description?: string
  price_inr: number
  price_usd: number
  features: string[]
  limits: Record<string, any>
  is_popular?: boolean
  best_value?: boolean
  sort_order?: number
}

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

// Ids/order come from the shared EVENT_TYPES constant (src/lib/constants) —
// each is decorated here with its wizard-only display metadata (emoji,
// gradient, color). Previously this array hardcoded its own separate id
// list that had drifted from EVENT_TYPES (extra ids here, missing ids
// there); deriving from EVENT_TYPES makes that impossible going forward —
// add/remove an event type in one place and this card list follows.
const EVENT_TYPE_META: Record<(typeof EVENT_TYPES)[number], { name: string; emoji: string; color: string }> = {
  wedding: { name: "Wedding", emoji: "💍", color: "#B89B85" },
  birthday: { name: "Birthday", emoji: "🎂", color: "#D29F6C" },
  engagement: { name: "Engagement", emoji: "🍾", color: "#C68CA3" },
  corporate: { name: "Corporate", emoji: "🏢", color: "#5F87A8" },
  baby_shower: { name: "Baby Shower", emoji: "👶", color: "#5FB6A8" },
  graduation: { name: "Graduation", emoji: "🎓", color: "#6EB887" },
  festival: { name: "Festival", emoji: "🎪", color: "#B28659" },
  custom: { name: "Custom", emoji: "✨", color: "#8E8E93" },
}
const EVENT_TYPE_CARDS = EVENT_TYPES.map((id) => ({
  id,
  ...EVENT_TYPE_META[id],
  gradient: "from-surface-card to-surface-card-elevated",
}))

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
    containerBg: "bg-gradient-to-b from-[#ffffff] via-[#2A241F] to-[#121110]",
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
    navColor: "text-ink-secondary",
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
  const queryClient = useQueryClient()
  
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
  // The actual occasion date (e.g. the wedding/party day itself) — distinct
  // from "when do uploads lock" (endDate/endTime below) and from whenever
  // the host happens to be sitting in this wizard filling it out. Previously
  // there was no field for this at all: every event's `event_date` column
  // was hardcoded to `new Date().toISOString()` at creation time (see the
  // mutationFn below), so any event created ahead of the actual date (which
  // is the common case — hosts set these up in advance) showed the wrong
  // date everywhere it's surfaced: the dashboard list, the guest-facing
  // event page, the countdown page, and the daily stories cron's date-range
  // query. Optional — falls back to "today" if left blank, matching the old
  // always-today behavior for anyone who skips it.
  const [eventDate, setEventDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("22:00")
  const [revealExperience, setRevealExperience] = useState("immediately")
  // Plan ids are admin-configurable (Admin > Subscriptions > Plan Builder) —
  // not a fixed "free"/"starter"/"standard"/"premium" set. Starts empty and
  // gets set to a real id once /api/payments/plans resolves (see the
  // fetchPlans effect below), the same live endpoint the public /pricing
  // page uses.
  const [guestCountPlan, setGuestCountPlan] = useState<string>("")
  
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

  // Invitation Card Design
  const [invitationTheme, setInvitationTheme] = useState("minimal")
  const [invitationWelcome, setInvitationWelcome] = useState("Scan to capture and share moments with us.")
  const [invitationCountdown, setInvitationCountdown] = useState(true)

  // Live plan catalog — the single source of truth for names, prices,
  // guest/shot quotas, and feature toggles (video_uploads, voice_notes,
  // ai_face_search, etc., all inside each plan's `limits`). Fetched from
  // /api/payments/plans, the exact same endpoint the public /pricing page
  // and Admin > Plan Builder read/write — this used to be a hardcoded
  // 4-entry Free/Starter/Standard/Premium array in the Step 6 JSX below,
  // which is why the wizard could show entirely different plans/prices/
  // limits than what was actually live (no "Starter" plan, different guest
  // caps, etc.).
  const [livePlans, setLivePlans] = useState<LivePlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const selectedPlan = livePlans.find((p) => p.id === guestCountPlan)

  // Add-on prices (fetched live from /api/payments/addons, itself backed by
  // the admin-editable `addons` table — see src/lib/payments/addons.ts).
  const [addonPrices, setAddonPrices] = useState<{
    guestBoosts: Array<{ value: number; label: string; price: number }>
    shotBoosts: Array<{ value: number; label: string; price: number }>
    photoLimitBoosts: Array<{ value: number; label: string; price: number }>
    videoAddonPrice: number
    voiceAddonPrice: number
  }>({ guestBoosts: [], shotBoosts: [], photoLimitBoosts: [], videoAddonPrice: 0, voiceAddonPrice: 0 })

  // Computed per-event total
  const planBasePrice = selectedPlan?.price_inr ?? 0
  const guestAddonPrice = addonPrices.guestBoosts.find(b => b.value === guestsBoost)?.price ?? (guestsBoost > 0 ? Math.round(guestsBoost * 19.9) : 0)
  const shotAddonPrice = addonPrices.shotBoosts.find(b => b.value === shotsBoost)?.price ?? (shotsBoost > 0 ? Math.round(shotsBoost * 19.9) : 0)

  // Step 7 selections that go beyond what the plan itself includes — these
  // used to be either silently blocked (Videos/Voice on lower plans) or
  // silently free (Unlimited photos on any plan). Now priced the same way
  // guest/shot boosts are (live from Admin > Add-ons), and re-validated
  // server-side at checkout so this display can't be the only thing
  // enforcing it. Gating is read straight off the selected plan's own
  // `limits` (shots_limit / video_uploads / voice_notes) instead of
  // hardcoded plan-id comparisons, which broke for any admin-renamed or
  // newly-added plan.
  const planBasePhotoLimit = Number(selectedPlan?.limits?.shots_limit ?? 0)
  const photoAddonPrice = photoLimit !== planBasePhotoLimit && (photoLimit === -1 || photoLimit > planBasePhotoLimit)
    ? (addonPrices.photoLimitBoosts.find(b => b.value === photoLimit)?.price ?? 0)
    : 0
  const videoAddonPrice = contentVideos && !selectedPlan?.limits?.video_uploads ? addonPrices.videoAddonPrice : 0
  const voiceAddonPrice = contentVoiceNotes && !selectedPlan?.limits?.voice_notes ? addonPrices.voiceAddonPrice : 0
  const featureAddonPrice = photoAddonPrice + videoAddonPrice + voiceAddonPrice

  const totalEventPrice = planBasePrice + guestAddonPrice + shotAddonPrice + featureAddonPrice

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/payments/plans")
        if (res.ok) {
          const result = await res.json()
          if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            const mapped: LivePlan[] = result.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description || "",
              price_inr: p.price_inr,
              price_usd: p.price_usd || Math.round(p.price_inr / 80) || 1,
              features: Array.isArray(p.features) ? p.features : [],
              limits: p.limits || {},
              is_popular: p.is_popular || false,
              best_value: p.best_value || false,
              sort_order: p.sort_order ?? 0,
            }))
            setLivePlans(mapped)
            // Default the wizard's selection to a real plan id from the live
            // catalog — the previous hardcoded default ("starter") doesn't
            // necessarily exist at all (today's live catalog has no plan
            // id'd "starter"). Prefers the plan Admin flagged as popular,
            // else the cheapest paid plan, else whatever's first.
            setGuestCountPlan((prev) => {
              if (prev && mapped.some((p) => p.id === prev)) return prev
              const recommended = mapped.find((p) => p.is_popular) || mapped.find((p) => p.price_inr > 0) || mapped[0]
              return recommended?.id || prev
            })
          }
        }
      } catch (e) {
        console.error("Failed to fetch live plans", e)
      } finally {
        setPlansLoading(false)
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
              photoLimitBoosts: result.data.photo_limit_boosts || [],
              videoAddonPrice: result.data.video_addon_price ?? 0,
              voiceAddonPrice: result.data.voice_addon_price ?? 0,
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
      // Falls back to "now" if the host left it blank — same behavior this
      // field always had before it existed, just now overridable.
      const calculatedEventDate = eventDate
        ? new Date(`${eventDate}T00:00:00`).toISOString()
        : new Date().toISOString()

      const eventData = {
        host_id: profile.id,
        name: name || "Celebration",
        slug,
        description: `Experience created with Snapsy.`,
        event_type: eventType === "custom" && customEventTypeName.trim() ? customEventTypeName.trim() : eventType,
        custom_event_type_name: eventType === "custom" ? customEventTypeName.trim() : null,
        event_date: calculatedEventDate,
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
          // Informational record of this event's own payment state — set to
          // "free" immediately for the free tier (no checkout ever happens
          // for it), or "pending" for a paid tier until /api/payments/verify
          // (or the free-checkout fallback) flips it to "paid"/"free" once
          // the purchase for THIS event actually completes. Previously there
          // was no per-event payment record at all — only an account-level
          // subscription — so nothing could tell whether a given event had
          // actually been paid for.
          payment_status: totalEventPrice === 0 ? "free" : "pending",
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
          // Option ids from the Step 5 picker below are "immediately"/"during"/"after"/"24h"/"7d"/"custom" —
          // this used to check for "during_event" (a value that option never produces), so hosts who picked
          // "During Event" got silently stored as photo_reveal_mode: "delayed", and /api/galleries/[id]/photos
          // (which does an exact "instant" match, unlike the guest event page's more lenient substring check)
          // would withhold photos from guests during a live event despite the host explicitly choosing live reveal.
          photo_reveal_mode: (revealExperience === "immediately" || revealExperience === "during") ? "instant" : "delayed",
          reveal_type: (revealExperience === "immediately" || revealExperience === "during") ? "instant" : "delayed",
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

      // Without this, the new event only shows up on the Events list /
      // Dashboard Overview / galleries+QR dropdowns after a hard refresh or
      // once the cache's staleTime naturally expires.
      queryClient.invalidateQueries({ queryKey: ["events"] })
      queryClient.invalidateQueries({ queryKey: ["events-list"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })

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

  // Auto-adjust photo/video/voice defaults to whatever the selected live
  // plan actually includes (its `limits` object) instead of a hardcoded
  // free/starter/standard/premium branch — that hardcoded version silently
  // fell through to a no-op for any plan id it didn't recognize, which is
  // exactly what happens with today's live catalog (ids don't match those
  // four assumptions).
  useEffect(() => {
    if (!selectedPlan) return
    const limits = selectedPlan.limits || {}
    setPhotoLimit(typeof limits.shots_limit === "number" ? limits.shots_limit : 20)
    setContentVideos(Boolean(limits.video_uploads))
    setContentVoiceNotes(Boolean(limits.voice_notes))
    if (limits.ai_face_search) setAiFaceSearch(true)
  }, [guestCountPlan, selectedPlan])

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      toast({ title: "Please name your experience", description: "Name is required to build the memory capsule." })
      return
    }
    if (step === 6 && !guestCountPlan) {
      toast({ title: "Please choose a plan", description: "Select an event plan to continue." })
      return
    }
    if (step === 9) {
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

    // Per-event model: a ₹0 total (free plan, no boosts, no feature add-ons)
    // skips payment entirely; anything with a nonzero total goes to checkout
    // for this specific event. Driven by totalEventPrice (which already sums
    // the live plan base price + every boost/add-on) rather than assuming
    // the plan's id is literally "free" — that assumption broke the instant
    // an admin-configured zero-price plan used a different id.
    if (totalEventPrice === 0) {
      router.push(`/dashboard/events/${createdEvent.slug}`)
      return
    }

    // Build checkout URL with event context so payment is tied to this event
    const params = new URLSearchParams({
      plan: guestCountPlan,
      event: createdEvent.slug,
      event_id: createdEvent.id,
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
    <div className="w-full min-h-[calc(100vh-6rem)] bg-surface-dark text-ink flex flex-col font-sans rounded-3xl border border-hairline-dark shadow-sm overflow-hidden selection:bg-hairline-dark">

      {/* Top Header */}
      <header className="px-4 md:px-6 py-2.5 flex items-center justify-between border-b border-hairline-dark w-full shrink-0 bg-surface-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className={`font-playfair text-lg md:text-xl font-bold tracking-wider text-mauve`}>SNAPSY</span>
          <span className="text-[10px] uppercase tracking-widest text-ink-secondary px-2 py-0.5 border border-hairline-dark rounded-full">Capsule Maker</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Live price summary — visible from Step 6 onwards */}
          {step >= 6 && step <= 10 && (
            <div className="flex items-center gap-2 bg-surface-card-elevated border border-hairline-dark rounded-full px-3 py-1">
              <span className="text-[10px] font-semibold text-mauve capitalize">
                {selectedPlan?.name || (guestCountPlan ? guestCountPlan.charAt(0).toUpperCase() + guestCountPlan.slice(1) : "Choose plan")}
              </span>
              {(guestsBoost > 0 || shotsBoost > 0) && (
                <span className="text-[9px] text-ink-secondary">
                  +{guestsBoost > 0 ? `${guestsBoost}G` : ""}{guestsBoost > 0 && shotsBoost > 0 ? " " : ""}{shotsBoost > 0 ? `${shotsBoost}S` : ""}
                </span>
              )}
              <span className="h-3 w-px bg-hairline-dark" />
              <span className="text-[11px] font-bold text-ink">
                {totalEventPrice === 0 ? "Free" : `₹${totalEventPrice.toLocaleString("en-IN")}`}
              </span>
            </div>
          )}
          <div className="text-[11px] font-semibold text-ink-secondary tracking-widest">
            {step <= 9 ? `STEP ${step} OF 9` : "READY"}
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
                  <h1 className="font-playfair text-3xl md:text-4xl font-normal leading-tight text-ink">
                    What is the name of your event?
                  </h1>
                  <p className="text-xs md:text-sm text-ink-secondary max-w-md">
                    Choose the perfect title for your event. This title will be visible to all of your event guests.
                  </p>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your event title"
                      className="w-full rounded-2xl border border-hairline-dark bg-surface-card pl-11 pr-4 py-3.5 text-sm text-ink outline-none focus:border-mauve transition-colors placeholder:text-ink-tertiary font-medium"
                      autoFocus
                    />
                  </div>
                  
                  {/* Suggestions */}
                  <div className="pt-2 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-secondary">SUGGESTIONS</p>
                    <div className="flex flex-wrap gap-2">
                      {getSuggestions(profile?.full_name || user?.user_metadata?.full_name || user?.email).map((s) => (
                        <button
                          key={s}
                          onClick={() => setName(s)}
                          className={`px-4 py-2.5 text-xs rounded-full border transition-all cursor-pointer ${
                            name === s
                              ? "bg-mauve text-[#faf6ed] border-mauve font-semibold shadow-md"
                              : "border-hairline-dark bg-surface-card hover:border-mauve text-ink-secondary"
                          }`}
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
                  <h1 className={`font-playfair text-2xl md:text-3xl font-medium leading-tight tracking-tight text-ink`}>
                    What kind of event are you creating?
                  </h1>
                  <p className="text-xs md:text-sm text-ink-secondary">
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
                            isSelected ? "border-mauve shadow-sm ring-1 ring-mauve" : "border-hairline-dark hover:border-mauve/30"
                          }`}
                        >
                          <span className="text-xl shrink-0">{type.emoji}</span>
                          <span className="text-xs font-semibold text-ink truncate">{type.name}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom Event Category Name Input */}
                  {eventType === "custom" && (
                    <div className="pt-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-semibold text-ink flex items-center gap-1">
                        <span>Enter your custom event category name</span>
                        <span className="text-mauve">*</span>
                      </label>
                      <Input
                        value={customEventTypeName}
                        onChange={(e) => setCustomEventTypeName(e.target.value)}
                        placeholder="e.g. Family Reunion, Tech Conference, Housewarming..."
                        className="bg-surface-card border-hairline-dark focus:border-mauve text-sm h-10 shadow-sm"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: EVENT COVER */}
              {step === 3 && (
                <div className="space-y-6">
                  <h1 className={`font-playfair text-4xl md:text-5xl font-light leading-tight tracking-tight text-ink`}>
                    Choose a cover for your memories.
                  </h1>
                  
                  {/* Selector tabs */}
                  <div className="flex border-b border-hairline-dark overflow-x-auto">
                    {[
                      { id: "gradient", label: "Gradients" },
                      { id: "template", label: "Templates" },
                      { id: "upload", label: "Custom Upload 📤" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setCoverType(tab.id as any)}
                        className={`pb-2 px-3.5 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                          coverType === tab.id ? "border-b-2 border-mauve text-mauve" : "text-ink-secondary"
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
                            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer bg-surface-card ${
                              isSelected ? "border-mauve shadow-sm" : "border-hairline-dark hover:border-mauve/30"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: grad.css }} />
                            <span className="text-xs font-medium text-ink-secondary">{grad.name}</span>
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
                              isSelected ? "border-mauve shadow-md scale-[1.02]" : "border-hairline-dark"
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
                      <label className="border-2 border-dashed border-hairline-dark hover:border-mauve bg-surface-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-surface-card-elevated">
                        <div className="w-12 h-12 rounded-full bg-surface-card-elevated border border-hairline-dark flex items-center justify-center text-mauve">
                          <Upload className="h-6 w-6" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-semibold text-ink">
                            {uploadingCover ? "Uploading custom cover..." : "Click to upload your custom cover photo"}
                          </p>
                          <p className="text-xs text-ink-secondary">PNG, JPG, or WebP (max 10MB)</p>
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
                        <div className="p-2 bg-surface-card rounded-xl border border-hairline-dark flex items-center gap-3">
                          <img src={coverImage} alt="Custom cover preview" className="w-14 h-14 rounded-lg object-cover border border-hairline-dark" />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-emerald-600 block">✓ Custom Cover Active</span>
                            <span className="text-[10px] text-ink-secondary">Visible live on your event memory capsule</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: EVENT DATE + UPLOAD LOCK */}
              {step === 4 && (
                <div className="space-y-6">
                  <h1 className={`font-playfair text-4xl md:text-5xl font-light leading-tight tracking-tight text-ink`}>
                    When is your event?
                  </h1>
                  <p className="text-sm text-ink-secondary">
                    The actual day of your celebration — shown to guests and used for your countdown.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-widest text-ink-secondary font-bold">Event Date</label>
                    <div className="relative bg-surface-card border border-hairline-dark rounded-xl p-3 flex items-center gap-3">
                      <CalendarIcon className="h-4 w-4 text-mauve" />
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="bg-transparent outline-none text-sm text-ink flex-1 cursor-pointer"
                      />
                    </div>
                  </div>

                  <h2 className="font-playfair text-2xl font-light leading-tight tracking-tight text-ink pt-2">
                    When does uploading end?
                  </h2>
                  <p className="text-sm text-ink-secondary">
                    Once ended, guest upload portals lock, and final preparation for the memory reveal starts.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest text-ink-secondary font-bold">End Date</label>
                      <div className="relative bg-surface-card border border-hairline-dark rounded-xl p-3 flex items-center gap-3">
                        <CalendarIcon className="h-4 w-4 text-mauve" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-transparent outline-none text-sm text-ink flex-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest text-ink-secondary font-bold">Locks at Time</label>
                      <div className="relative bg-surface-card border border-hairline-dark rounded-xl p-3 flex items-center gap-3">
                        <Clock className="h-4 w-4 text-mauve" />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="bg-transparent outline-none text-sm text-ink flex-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-card rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-ink-secondary font-medium">
                      Event active live. Countdown clock starts running immediately upon launch.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 5: REVEAL EXPERIENCE */}
              {step === 5 && (
                <div className="space-y-6">
                  <h1 className={`font-playfair text-4xl md:text-5xl font-light leading-tight tracking-tight text-ink`}>
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
                          className={`p-4 rounded-xl text-left border flex flex-col justify-between transition-all bg-surface-card cursor-pointer ${
                            isSelected ? "border-mauve shadow-sm" : "border-hairline-dark hover:border-mauve/30"
                          }`}
                        >
                          <span className="text-xs font-bold text-ink">{opt.label}</span>
                          <span className="text-[10px] text-ink-secondary mt-1">{opt.desc}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Thumbnail Reveal Blur Demo */}
                  <div className="border border-hairline-dark rounded-xl p-4 bg-surface-card space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-ink-secondary font-semibold text-center">Interactive Reveal Preview</p>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-16 h-16 rounded-lg bg-cover bg-center relative overflow-hidden shadow-inner" style={{ backgroundImage: `url(${TEMPLATE_COVERS[i % TEMPLATE_COVERS.length]})` }}>
                          <motion.div
                            animate={{ opacity: revealExperience === "immediately" ? 0 : 0.8 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 bg-surface-card/90 backdrop-blur-md flex items-center justify-center"
                          >
                            <svg className="h-4 w-4 text-mauve" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <h1 className={`font-playfair text-4xl md:text-5xl font-light leading-tight tracking-tight text-ink`}>
                    How many guests are joining?
                  </h1>
                  
                  <div className="space-y-3 pt-2">
                    {plansLoading && livePlans.length === 0 ? (
                      <div className="p-8 text-center text-ink-tertiary text-xs font-semibold">Loading plans…</div>
                    ) : livePlans.length === 0 ? (
                      <div className="p-8 text-center text-ink-tertiary text-xs font-semibold">
                        No plans are available right now. Please try again shortly.
                      </div>
                    ) : (
                      // Rendered directly from the live /api/payments/plans catalog —
                      // same data source as the public /pricing page and Admin >
                      // Plan Builder — instead of a hardcoded Free/Starter/Standard/
                      // Premium array that no longer matched what's actually
                      // configured (that array assumed 4 fixed plans/prices/limits;
                      // the live catalog may have a different count, different ids,
                      // and different guest/shot limits entirely).
                      livePlans.map((plan) => {
                        const isSelected = guestCountPlan === plan.id
                        const guestsLimit = plan.limits?.guests_limit
                        const shotsLimit = plan.limits?.shots_limit
                        const guestsLabel = guestsLimit === -1 || guestsLimit == null
                          ? (guestsLimit === -1 ? "Unlimited guests" : "Guest limit set by host")
                          : `Up to ${guestsLimit} guests`
                        const shotsLabel = shotsLimit === -1 ? "Unlimited shots/guest" : `${shotsLimit ?? "—"} shots/guest`
                        const descParts = [shotsLabel, ...plan.features.slice(0, 3)]
                        return (
                          <div
                            key={plan.id}
                            onClick={() => setGuestCountPlan(plan.id)}
                            className={`p-4 rounded-2xl border-2 transition-all bg-surface-card cursor-pointer flex justify-between items-start gap-4 ${
                              isSelected ? "border-mauve shadow-sm" : "border-hairline-dark hover:border-mauve/30"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-ink">{plan.name}</span>
                                {plan.best_value && (
                                  <span className="bg-ink text-surface-dark text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Best Value</span>
                                )}
                                {!plan.best_value && plan.is_popular && (
                                  <span className="bg-surface-dark border border-mauve/25 text-mauve-strong text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Popular</span>
                                )}
                              </div>
                              <p className="text-xs text-mauve font-medium">{guestsLabel}</p>
                              <p className="text-[10px] text-ink-secondary leading-relaxed max-w-sm">{descParts.join(" · ")}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-lg font-bold text-ink">{plan.price_inr === 0 ? "Free" : `₹${plan.price_inr}`}</span>
                              <span className="text-[9px] text-ink-secondary block">One-time event</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Addon boosters section */}
                  <div className="border border-hairline-dark rounded-2xl p-4 bg-surface-card space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mauve">
                      <Users className="h-4 w-4" />
                      <span>Custom Quota Boost Add-ons</span>
                    </div>

                    {/* Guest Boost Tier Picker */}
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-xs text-ink">Boost Guest Capacity</p>
                        <p className="text-[10px] text-ink-secondary">Add extra guests above your plan limit</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setGuestsBoost(0)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${guestsBoost === 0 ? "bg-mauve text-[#faf6ed] border-mauve" : "bg-surface-card-elevated border-hairline-dark text-ink-secondary hover:border-mauve"}`}
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
                            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${guestsBoost === boost.value ? "bg-mauve text-[#faf6ed] border-mauve" : "bg-surface-card-elevated border-hairline-dark text-ink-secondary hover:border-mauve"}`}
                          >
                            +{boost.value} guests
                            <span className={`font-bold ${guestsBoost === boost.value ? "text-white/80" : "text-mauve"}`}>₹{boost.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shot Boost Tier Picker */}
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-xs text-ink">Boost Shot Quota</p>
                        <p className="text-[10px] text-ink-secondary">Add extra photo uploads allowed per guest</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setShotsBoost(0)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${shotsBoost === 0 ? "bg-mauve text-[#faf6ed] border-mauve" : "bg-surface-card-elevated border-hairline-dark text-ink-secondary hover:border-mauve"}`}
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
                            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${shotsBoost === boost.value ? "bg-mauve text-[#faf6ed] border-mauve" : "bg-surface-card-elevated border-hairline-dark text-ink-secondary hover:border-mauve"}`}
                          >
                            +{boost.value} shots/guest
                            <span className={`font-bold ${shotsBoost === boost.value ? "text-white/80" : "text-mauve"}`}>₹{boost.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live total for this event */}
                    {(guestsBoost > 0 || shotsBoost > 0) && (
                      <div className="pt-2 border-t border-hairline-dark flex items-center justify-between">
                        <p className="text-[10px] text-ink-secondary">Add-on subtotal for this event</p>
                        <p className="text-sm font-bold text-ink">₹{(guestAddonPrice + shotAddonPrice).toLocaleString("en-IN")}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 7: CONTENT TYPES & SETTINGS */}
              {step === 7 && (
                <div className="space-y-6">
                  <h1 className={`font-playfair text-4xl md:text-5xl font-light leading-tight tracking-tight text-ink`}>
                    What can your guests contribute?
                  </h1>
                  
                  <div className="space-y-4">
                    {/* Photos switch */}
                    <div className="p-4 rounded-xl border border-hairline-dark bg-surface-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📸</span>
                          <div>
                            <p className="text-sm font-bold text-ink">Photos</p>
                            <p className="text-[10px] text-ink-secondary">Still photographs of moments</p>
                          </div>
                        </div>
                        <Switch checked={contentPhotos} onCheckedChange={setContentPhotos} />
                      </div>
                      {contentPhotos && (
                        <div className="pt-2 border-t border-hairline-dark flex flex-wrap gap-2 items-center justify-between text-xs">
                          <span className="text-ink-secondary">Maximum photos per guest:</span>
                          <div className="flex gap-2">
                            {[5, 10, 25, 50, -1].map((val) => {
                              const addonPrice = val !== planBasePhotoLimit && (val === -1 || val > planBasePhotoLimit)
                                ? (addonPrices.photoLimitBoosts.find(b => b.value === val)?.price ?? 0)
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
                                    photoLimit === val ? "bg-mauve text-[#faf6ed] border-mauve" : "bg-surface-card-elevated border-hairline-dark text-ink-secondary"
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
                    <div className="p-4 rounded-xl border border-hairline-dark bg-surface-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎥</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-ink">Videos</p>
                              {videoAddonPrice > 0 && (
                                <span className="bg-surface-card-elevated text-mauve text-[9px] font-bold px-1 py-0.2 rounded-full uppercase scale-95">+₹{videoAddonPrice} add-on</span>
                              )}
                            </div>
                            <p className="text-[10px] text-ink-secondary">Capture motion events and video highlights</p>
                          </div>
                        </div>
                        <Switch
                          checked={contentVideos}
                          onCheckedChange={(c) => {
                            if (c && !selectedPlan?.limits?.video_uploads) {
                              toast({ title: "Videos add-on", description: `Not included in your plan — adds ₹${addonPrices.videoAddonPrice} to this event.` })
                            }
                            setContentVideos(c)
                          }}
                        />
                      </div>
                      {contentVideos && (
                        <div className="pt-2 border-t border-hairline-dark flex items-center justify-between text-xs">
                          <span className="text-ink-secondary">Duration limit per clip:</span>
                          <div className="flex gap-2">
                            {[10, 20, 30].map((sec) => (
                              <button
                                key={sec}
                                onClick={() => setVideoDuration(sec)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                  videoDuration === sec ? "bg-mauve text-[#faf6ed] border-mauve" : "bg-surface-card-elevated border-hairline-dark text-ink-secondary"
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
                    <div className="p-4 rounded-xl border border-hairline-dark bg-surface-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎤</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-ink">Voice Notes</p>
                              {voiceAddonPrice > 0 && (
                                <span className="bg-surface-card-elevated text-mauve text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase scale-95">+₹{voiceAddonPrice} add-on</span>
                              )}
                            </div>
                            <p className="text-[10px] text-ink-secondary">Collect voice messages and wedding wishes</p>
                          </div>
                        </div>
                        <Switch
                          checked={contentVoiceNotes}
                          onCheckedChange={(c) => {
                            if (c && !selectedPlan?.limits?.voice_notes) {
                              toast({ title: "Voice Notes add-on", description: `Not included in your plan — adds ₹${addonPrices.voiceAddonPrice} to this event.` })
                            }
                            setContentVoiceNotes(c)
                          }}
                        />
                      </div>
                      {contentVoiceNotes && (
                        <div className="pt-2 border-t border-hairline-dark space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-ink-secondary">Duration limit per note:</span>
                            <div className="flex gap-2">
                              {[10, 20, 30].map((sec) => (
                                <button
                                  key={sec}
                                  onClick={() => setVoiceDuration(sec)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                    voiceDuration === sec ? "bg-mauve text-[#faf6ed] border-mauve" : "bg-surface-card-elevated border-hairline-dark text-ink-secondary"
                                  }`}
                                >
                                  {sec}s
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Voice player design mock */}
                          <div className="bg-surface-card border border-hairline-dark rounded-xl p-2 flex items-center gap-3 mt-1">
                            <div className="w-8 h-8 rounded-full bg-mauve flex items-center justify-center text-white shrink-0">
                              <Mic className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="h-1 bg-stone-200 rounded-full w-full overflow-hidden">
                                <div className="h-full bg-mauve w-1/3" />
                              </div>
                              <p className="text-[8px] text-ink-secondary">Preview: "Wedding Wishes" audio note</p>
                            </div>
                            <span className="text-[10px] text-ink-secondary font-mono shrink-0">0:04 / 0:15</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Messages switch */}
                    <div className="p-4 rounded-xl border border-hairline-dark bg-surface-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💌</span>
                        <div>
                          <p className="text-sm font-bold text-ink">Reaction Messages</p>
                          <p className="text-[10px] text-ink-secondary">Guest notes, emoji reaction tags, and advice cards</p>
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
                  <h1 className={`font-playfair text-4xl md:text-5xl font-light leading-tight tracking-tight text-ink`}>
                    Let AI organize your memories.
                  </h1>
                  <p className="text-sm text-ink-secondary">
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
                      <div key={idx} className="p-3.5 rounded-xl border border-hairline-dark bg-surface-card flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-ink">{feature.label}</span>
                            {feature.premium && (
                              <span className="bg-surface-card-elevated text-mauve text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase scale-90">Premium</span>
                            )}
                          </div>
                          <p className="text-[10px] text-ink-secondary leading-relaxed max-w-sm">{feature.desc}</p>
                        </div>
                        <Switch
                          checked={feature.state}
                          onCheckedChange={(c) => {
                            if (feature.premium && !selectedPlan?.limits?.ai_face_search) {
                              toast({ title: "Upgrade required", description: "This AI capability is unlocked on plans that include AI Face Search." })
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

              {/* STEP 9: INVITATION CARD DESIGN
                  (previously Step 10 — the old Step 9 "Memory Capsule" toggle
                  was removed. It stored settings.capsule but nothing server-side
                  ever read it to actually hide content; Step 5's Reveal
                  Experience already covers "delay guest visibility until a
                  date" for real, via photo_reveal_mode/reveal_experience, so
                  keeping both was two competing controls where only one worked.) */}
              {step === 9 && (
                <div className="space-y-6">
                  <h1 className={`font-playfair text-4xl md:text-5xl font-light leading-tight tracking-tight text-ink`}>
                    Design your invitation experience.
                  </h1>
                  
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-ink-secondary font-bold block mb-2">Select Theme Template</label>
                      <div className="flex flex-wrap gap-2">
                        {["minimal", "luxury", "modern", "elegant", "glass", "dark"].map((theme) => (
                          <button
                            key={theme}
                            type="button"
                            onClick={() => setInvitationTheme(theme)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-all cursor-pointer ${
                              invitationTheme === theme ? "bg-mauve text-[#faf6ed] border-mauve" : "bg-surface-card border-hairline-dark text-ink-secondary"
                            }`}
                          >
                            {theme}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-widest text-ink-secondary font-bold block">Welcome Message</label>
                      <textarea
                        value={invitationWelcome}
                        onChange={(e) => setInvitationWelcome(e.target.value)}
                        rows={2}
                        className="w-full bg-surface-card border border-hairline-dark rounded-xl p-3 text-xs outline-none focus:border-mauve"
                        placeholder="Write a greeting for guests scanning the QR card..."
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-hairline-dark bg-surface-card">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-ink">Display Countdown Clock</p>
                        <p className="text-[9px] text-ink-secondary">Shows ticks countdown till reveal unlocks</p>
                      </div>
                      <Switch checked={invitationCountdown} onCheckedChange={setInvitationCountdown} />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="pt-8 flex items-center justify-between border-t border-hairline-dark">
                {step > 1 ? (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-secondary hover:text-ink transition-colors cursor-pointer"
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
                  className="bg-mauve text-[#faf6ed] hover:bg-mauve-strong font-bold px-6 py-5 rounded-full flex items-center gap-2 border-none shadow-[0_4px_14px_rgba(184,146,90,0.25)] cursor-pointer"
                >
                  {mutation.isPending ? (
                    <span>Saving Capsule...</span>
                  ) : (
                    <>
                      <span>{step === 9 ? "Launch Capsule" : "Continue"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Progress Dots indicators */}
              <div className="flex items-center justify-center gap-1.5 pt-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i + 1 === step ? "w-6 bg-mauve" : "w-1.5 bg-hairline-dark"
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
                    
                    <h3 className={`font-playfair text-xl leading-tight font-medium ${currentTheme.titleColor}`}>
                      {name || "Your Event Name"}
                    </h3>

                    {/* Event timeline details preview */}
                    <div className={`flex flex-col gap-1 text-[9px] ${currentTheme.subtextColor}`}>
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className={`h-3 w-3 ${currentTheme.accentColor}`} />
                        <span>Locks: {endDate ? formatDate(endDate) : "Oct 12, 2026"} at {endTime}</span>
                      </div>
                      {revealExperience !== "immediately" && (
                        <div className={`flex items-center gap-1.5 font-semibold ${currentTheme.accentColor}`}>
                          <ShieldCheck className="h-3 w-3" />
                          <span>Reveal: {(
                            {
                              during: "During the event",
                              after: "After the event ends",
                              "24h": "24 hours later",
                              "7d": "7 days later",
                              custom: "On a custom date",
                            } as Record<string, string>
                          )[revealExperience] || revealExperience}</span>
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
            className="fixed inset-0 bg-[#faf6ed]/85 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#ffffff] border border-[#e5dfd0] rounded-3xl p-8 sm:p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-6"
            >

              {/* Celebratory Badge */}
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-[#b8925a] flex items-center justify-center shadow-lg border-4 border-[#ffffff]">
                <Sparkles className="h-8 w-8 text-[#faf6ed]" />
              </div>

              <div className="text-center pt-8 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#b8925a]">Setup Complete</span>
                <h2 className={`font-playfair text-3xl sm:text-4xl font-medium text-ink`}>
                  Your memory capsule is ready.
                </h2>
                <p className="text-sm text-ink-secondary max-w-sm mx-auto">
                  The portal has been created. Invite guests to share photos, video clips, and vocal greetings.
                </p>
              </div>

              {/* Real Custom Snapsy Logo QR Card Output */}
              <div className="border border-[#e5dfd0] rounded-2xl p-6 bg-[#faf6ed] flex flex-col items-center gap-4 shadow-sm">
                <div className="p-3 bg-white rounded-2xl border border-[#e5dfd0] relative overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src="/Favicon.png"
                    alt="Snapsy Logo Background"
                    className="absolute inset-0 w-full h-full object-contain opacity-25 p-1 pointer-events-none"
                  />
                  <QRCodeSVG
                    id="new-event-modal-qr"
                    value={createdEvent ? `${typeof window !== "undefined" ? window.location.origin : "https://snapsy-events.vercel.app"}/event/${createdEvent.slug}` : "https://snapsy-events.vercel.app"}
                    size={168}
                    bgColor={"transparent"}
                    fgColor={"#faf6ed"}
                    level={"H"}
                    imageSettings={{
                      src: "/Favicon.png",
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                    className="relative z-10"
                  />
                </div>

                <div className="text-center space-y-0.5">
                  <p className="text-sm font-semibold text-ink">{name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#b8925a] font-bold">Plan: {(selectedPlan?.name || guestCountPlan).toUpperCase()}</p>
                </div>

                {/* Copyable join/invite pill */}
                <button
                  onClick={copyInviteLink}
                  className="w-full max-w-xs flex items-center justify-between gap-2 rounded-full border border-hairline-dark bg-transparent px-4 py-2 text-ink hover:bg-mauve/10 transition-all cursor-pointer"
                >
                  <span className="truncate text-xs font-mono">{createdEvent?.slug}</span>
                  <Copy className="h-3.5 w-3.5 shrink-0 text-[#b8925a]" />
                </button>

                {/* Share/Download Actions */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => {
                      const host = typeof window !== "undefined" ? window.location.host : ""
                      const url = `https://${host}/event/${createdEvent?.slug}`
                      if (typeof navigator !== "undefined" && "share" in navigator) {
                        (navigator as any).share({ title: name, url }).catch(() => {})
                      } else {
                        copyInviteLink()
                      }
                    }}
                    className="px-4 py-1.5 rounded-full border border-hairline-dark bg-transparent hover:bg-mauve/10 text-[11px] font-semibold text-ink-secondary transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share</span>
                  </button>
                  {qrCodeUrl && (
                    <a
                      href={qrCodeUrl}
                      download={`${slugify(name)}-qr-code.png`}
                      className="px-4 py-1.5 rounded-full border border-hairline-dark bg-transparent hover:bg-mauve/10 text-[11px] font-semibold text-ink-secondary transition-all flex items-center gap-1.5"
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                      <span>Download QR</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/events")}
                  className="flex-1 rounded-full border border-hairline-dark bg-transparent text-ink hover:bg-mauve/10 py-5"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={handleLaunch}
                  className="flex-1 rounded-full bg-[#b8925a] text-[#faf6ed] hover:bg-[#96723a] font-bold py-5 border-none shadow-[0_4px_14px_rgba(184,146,90,0.25)]"
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