"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks"
import { createClient } from "@/lib/supabase/client"

import { formatDate } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Badge } from "@/lib/components/ui/badge"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { toast } from "@/lib/components/ui/toaster"
import { Label } from "@/lib/components/ui/label"
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  ArrowRight,
  Settings
} from "lucide-react"
import type { PlanId, Subscription } from "@/lib/types"
import { Playfair_Display, Inter } from "next/font/google"

import { useCurrency } from "@/lib/context/currency-context"
import { CurrencyToggle } from "@/lib/components/ui/currency-toggle"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

interface PlanInfo {
  id: PlanId
  name: string
  description: string
  price: number
  priceUsd: number
  priceMonthly: number
  features: string[]
  limits: {
    events: number
    storage: number
    photos: number
  }
}

const PLAN_INFO: PlanInfo[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with one event",
    price: 0,
    priceUsd: 0,
    priceMonthly: 0,
    features: [
      "10 guests",
      "10 shots per guest",
      "Standard reveal",
      "Basic gallery",
    ],
    limits: { events: 1, storage: 1, photos: 100 },
  },
  {
    id: "starter",
    name: "Starter",
    description: "For photographers running a few events per year.",
    price: 499,
    priceUsd: 6,
    priceMonthly: 499,
    features: [
      "5 events",
      "10 GB storage",
      "5,000 photos",
      "10 QR codes per event",
      "Custom gallery URL",
      "Email support",
    ],
    limits: { events: 5, storage: 10, photos: 5000 },
  },
  {
    id: "standard",
    name: "Standard",
    description: "For studios running multiple weddings or events each month.",
    price: 1499,
    priceUsd: 18,
    priceMonthly: 1499,
    features: [
      "25 events",
      "100 GB storage",
      "50,000 photos",
      "Live photo wall",
      "Slideshow mode",
      "Watermarking",
      "Custom branding",
      "AI face search (500/mo)",
    ],
    limits: { events: 25, storage: 100, photos: 50000 },
  },
  {
    id: "premium",
    name: "Premium",
    description: "For agencies and enterprises at scale.",
    price: 3999,
    priceUsd: 49,
    priceMonthly: 3999,
    features: [
      "Unlimited events",
      "1 TB storage",
      "Unlimited photos",
      "Unlimited QR codes",
      "AI face search (unlimited)",
      "White label",
      "Custom domain",
      "Priority support",
      "Dedicated success manager",
    ],
    limits: { events: -1, storage: 1000, photos: -1 },
  },
]

const GUEST_BOOSTS = [
  { label: "No extra", value: 0, price: 0 },
  { label: "+10 guests", value: 10, price: 199 },
  { label: "+25 guests", value: 25, price: 399 },
  { label: "+50 guests", value: 50, price: 699 },
  { label: "+100 guests", value: 100, price: 1199 },
]

const SHOT_BOOSTS = [
  { label: "No extra", value: 0, price: 0 },
  { label: "+5 shots/guest", value: 5, price: 99 },
  { label: "+10 shots/guest", value: 10, price: 179 },
  { label: "+15 shots/guest", value: 15, price: 249 },
]

async function getSubscription(): Promise<Subscription | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data || null
}

async function getUserProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [subRes, userRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("users")
      .select("preferences")
      .eq("id", user.id)
      .single()
  ])

  const prefs = (userRes.data?.preferences as any) || {}
  return {
    plan: subRes.data?.plan_id || "free",
    settings: {
      guest_boost: prefs.guest_boost || 0,
      shots_boost: prefs.shots_boost || 0,
    }
  }
}

function PricingCard({
  plan,
  isSelected,
  isCurrent,
  onClick,
}: {
  plan: PlanInfo
  isSelected: boolean
  isCurrent: boolean
  onClick: () => void
}) {
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const isPopular = plan.id === "standard"
  const isPremium = plan.id === "premium"

  let selectedClasses = "border-slate-200 hover:border-slate-350 hover:shadow-xl"
  if (isSelected) {
    if (plan.id === "free") {
      selectedClasses = "border-slate-900 ring-2 ring-slate-900/10 shadow-[0_15px_40px_rgba(0,0,0,0.05)]"
    } else if (plan.id === "starter") {
      selectedClasses = "border-indigo-600 ring-2 ring-indigo-600/15 shadow-[0_15px_40px_rgba(79,70,229,0.1)]"
    } else if (plan.id === "standard") {
      selectedClasses = "border-violet-500 ring-2 ring-violet-500/20 shadow-[0_20px_50px_rgba(139,92,246,0.15)] md:scale-[1.03] z-10"
    } else if (plan.id === "premium") {
      selectedClasses = "border-orange-500 ring-2 ring-orange-500/20 shadow-[0_20px_50px_rgba(249,115,22,0.15)] md:scale-[1.03] z-10"
    }
  } else {
    if (isPopular) {
      selectedClasses = "border-slate-200 hover:border-violet-300 hover:shadow-lg"
    } else if (isPremium) {
      selectedClasses = "border-slate-200 hover:border-orange-300 hover:shadow-lg"
    }
  }

  const { symbol, getPrice } = useCurrency()
  const displayPrice = getPrice(plan.price, plan.priceUsd || Math.round(plan.price / 80))

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative rounded-3xl border bg-white p-6 cursor-pointer flex flex-col justify-between transition-all duration-300 ${selectedClasses}`}
    >
      {/* Background Spotlight Glow Wrapper */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        {isHovered && (
          <div
            className="absolute -inset-px transition duration-300 opacity-100"
            style={{
              background: `radial-gradient(320px circle at ${coords.x}px ${coords.y}px, ${
                isPopular
                  ? "rgba(139, 92, 246, 0.08)"
                  : isPremium
                  ? "rgba(249, 115, 22, 0.08)"
                  : plan.id === "starter"
                  ? "rgba(79, 70, 229, 0.06)"
                  : "rgba(100, 116, 139, 0.05)"
              }, transparent 80%)`,
            }}
          />
        )}
      </div>

      {/* Badges Container */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-1.5 text-[9px] font-bold text-white tracking-widest uppercase shadow-md flex items-center gap-1 z-20">
          <Sparkles className="h-3 w-3" />
          POPULAR
        </div>
      )}
      {isPremium && (
        <div className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-[9px] font-bold text-white tracking-widest uppercase shadow-md flex items-center gap-1 z-20">
          <Crown className="h-3.5 w-3.5" />
          BEST VALUE
        </div>
      )}

      {/* Current Plan Indicator for existing active plan */}
      {isCurrent && (
        <div className="absolute -top-3 left-4 rounded-full bg-slate-900 px-3 py-1 text-[8px] font-bold text-white tracking-widest uppercase shadow-md z-20">
          CURRENT
        </div>
      )}

      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
            <p className="mt-1.5 text-xs text-slate-450 leading-relaxed font-light min-h-[32px]">
              {plan.description}
            </p>
          </div>
          {isPopular && (
            <span className="h-7 w-7 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          )}
          {isPremium && (
            <span className="h-7 w-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Crown className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-slate-900">{symbol}{displayPrice}</span>
          <span className="text-slate-400 text-xs font-light">/ event</span>
        </div>

        <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 font-light">
              <Check
                className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                  isSelected
                    ? plan.id === "free"
                      ? "text-slate-800"
                      : plan.id === "starter"
                      ? "text-indigo-600"
                      : isPopular
                      ? "text-violet-600"
                      : "text-orange-500"
                    : "text-slate-400"
                }`}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 pt-2">
        <button
          type="button"
          className={`w-full font-bold py-2.5 rounded-xl transition-all active:scale-[0.98] text-xs border-none ${
            isSelected
              ? plan.id === "free"
                ? "bg-slate-950 text-white shadow-md"
                : plan.id === "starter"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : isPopular
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/20"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {isSelected ? "Selected" : `Choose ${plan.name}`}
        </button>
      </div>
    </motion.div>
  )
}

export default function BillingPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { symbol, getPrice } = useCurrency()
  const [plansList, setPlansList] = useState<PlanInfo[]>(PLAN_INFO)
  const [guestBoostsList, setGuestBoostsList] = useState(GUEST_BOOSTS)
  const [shotBoostsList, setShotBoostsList] = useState(SHOT_BOOSTS)

  // Local state for unified selection
  const [selectedPlan, setSelectedPlan] = useState<string>("free")
  const [guestBoost, setGuestBoost] = useState<number>(0)
  const [shotBoost, setShotBoost] = useState<number>(0)
  const [showAddOns, setShowAddOns] = useState<boolean>(true)

  // Queries to load active plan details
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
  })

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: getUserProfile,
  })

  const currentPlan = userProfile?.plan || "free"
  const currentSettings = (userProfile?.settings as any) || {}
  const currentGuestBoost = currentSettings.guest_boost || 0
  const currentShotsBoost = currentSettings.shots_boost || 0

  // Set default selection based on current organization plan/settings on load
  useEffect(() => {
    if (userProfile) {
      setSelectedPlan(userProfile.plan || "free")
      setGuestBoost((userProfile.settings as any)?.guest_boost || 0)
      setShotBoost((userProfile.settings as any)?.shots_boost || 0)
    }
  }, [userProfile])

  // Dynamic database plans sync
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/payments/plans")
        if (res.ok) {
          const result = await res.json()
          if (result.success && Array.isArray(result.data)) {
            const mapped = result.data.map((dbPlan: any) => {
              return {
                id: dbPlan.id,
                name: dbPlan.name,
                description: dbPlan.description || "",
                price: dbPlan.price_inr,
                priceMonthly: dbPlan.price_inr,
                features: Array.isArray(dbPlan.features) ? dbPlan.features : [],
                limits: {
                  events: dbPlan.limits?.events_limit ?? -1,
                  storage: dbPlan.limits?.storage_limit_gb ?? 0,
                  photos: dbPlan.limits?.photo_limit ?? -1,
                }
              }
            })
            // Add free tier if not returned in API to preserve basic functionality
            if (!mapped.find((m: any) => m.id === "free")) {
              mapped.unshift(PLAN_INFO[0])
            }
            setPlansList(mapped)
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic billing plans", e)
      }
    }
    fetchPlans()
  }, [])

  // Dynamic database addons sync
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const res = await fetch("/api/payments/addons")
        if (res.ok) {
          const result = await res.json()
          if (result.success && result.data) {
            if (result.data.guest_boosts) setGuestBoostsList(result.data.guest_boosts)
            if (result.data.shot_boosts) setShotBoostsList(result.data.shot_boosts)
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic addons", e)
      }
    }
    fetchAddons()
  }, [])

  // Cancel subscription mutation (Downgrade to free)
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/payments/subscriptions", {
        method: "DELETE",
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to cancel subscription")
      toast({ title: "Subscription cancelled", description: "Your subscription has been successfully cancelled." })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] })
      queryClient.invalidateQueries({ queryKey: ["userProfile"] })
      router.refresh()
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" })
    },
  })

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId)
    // Free plan does not support boosts
    if (planId === "free") {
      setGuestBoost(0)
      setShotBoost(0)
    }
  }

  const getAccentColor = () => {
    if (selectedPlan === "starter") return {
      text: "text-indigo-650",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      badge: "bg-indigo-600",
      hover: "hover:border-indigo-300",
      buttonActive: "bg-indigo-50/80 border-indigo-500 text-indigo-700 shadow-[0_0_10px_rgba(79,70,229,0.05)]",
      icon: "text-indigo-600"
    }
    if (selectedPlan === "standard") return {
      text: "text-violet-650",
      bg: "bg-violet-50",
      border: "border-violet-200",
      badge: "bg-violet-600",
      hover: "hover:border-violet-300",
      buttonActive: "bg-violet-50/80 border-violet-500 text-violet-700 shadow-[0_0_10px_rgba(139,92,246,0.05)]",
      icon: "text-violet-600"
    }
    if (selectedPlan === "premium") return {
      text: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      badge: "bg-orange-600",
      hover: "hover:border-orange-300",
      buttonActive: "bg-orange-50/80 border-orange-500 text-orange-700 shadow-[0_0_10px_rgba(249,115,22,0.05)]",
      icon: "text-orange-600"
    }
    return {
      text: "text-slate-600",
      bg: "bg-slate-50",
      border: "border-slate-200",
      badge: "bg-slate-600",
      hover: "hover:border-slate-300",
      buttonActive: "bg-slate-50/80 border-slate-500 text-slate-700 shadow-[0_0_10px_rgba(100,116,139,0.05)]",
      icon: "text-slate-600"
    }
  }

  const activePlanDetails = plansList.find((p) => p.id === selectedPlan) || plansList[0]
  
  // Calculate price dynamically
  const basePrice = activePlanDetails?.price || 0
  const guestAddOnPrice = guestBoostsList.find((b) => b.value === guestBoost)?.price || 0
  const shotAddOnPrice = shotBoostsList.find((b) => b.value === shotBoost)?.price || 0
  const totalPrice = basePrice + guestAddOnPrice + shotAddOnPrice

  const baseGuestLimitStr = activePlanDetails?.features.find(f => f.toLowerCase().includes("guest")) || "10 guests"
  const baseShotLimitStr = activePlanDetails?.features.find(f => f.toLowerCase().includes("shot")) || "10 shots per guest"
  const accent = getAccentColor()

  const isActionDisabled = 
    selectedPlan === currentPlan && 
    guestBoost === currentGuestBoost && 
    shotBoost === currentShotsBoost

  const getContinueButtonClass = () => {
    const base = "w-full sm:w-auto font-bold px-8 py-6 rounded-2xl flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98] border-none "
    if (isActionDisabled) {
      return base + "bg-slate-100 text-slate-500 cursor-not-allowed shadow-none"
    }
    if (selectedPlan === "free") {
      return base + "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/10"
    } else if (selectedPlan === "starter") {
      return base + "bg-indigo-650 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
    } else if (selectedPlan === "standard") {
      return base + "bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/20"
    } else if (selectedPlan === "premium") {
      return base + "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/20"
    }
    return base + "bg-orange-500 hover:bg-orange-600 text-white"
  }

  const getActionButtonText = () => {
    if (cancelMutation.isPending) return "Processing Downgrade..."
    if (selectedPlan === "free") {
      if (currentPlan === "free") return "Current Plan"
      return "Downgrade to Free"
    }
    if (isActionDisabled) return "Current Plan"
    if (selectedPlan === currentPlan) return "Update Settings & Pay"
    return "Proceed to Payment"
  }

  const handleActionClick = () => {
    if (isActionDisabled) return
    if (selectedPlan === "free") {
      if (confirm("Are you sure you want to cancel your paid subscription and downgrade to the Free plan? Your additional storage and guest limits will be reset.")) {
        cancelMutation.mutate()
      }
    } else {
      router.push(`/checkout?plan=${selectedPlan}&guests=${guestBoost}&shots=${shotBoost}`)
    }
  }

  if (subLoading || profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-8 pb-16 selection:bg-violet-100 ${inter.className}`}>
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage your workspace subscription and limits</p>
        </div>
        <CurrencyToggle />
      </div>

      {/* Subscription Details if active */}
      {subscription && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Current Subscription</CardTitle>
                <CardDescription>Your active billing and period details</CardDescription>
              </div>
              <Badge
                variant={subscription.status === "active" ? "success" : "secondary"}
                className="text-xs uppercase font-semibold tracking-wider px-2.5 py-0.5"
              >
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Plan</p>
                <p className="text-lg font-bold text-slate-800 capitalize mt-1">{subscription.plan_id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current Period</p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {subscription.current_period_start
                    ? `${formatDate(subscription.current_period_start)} - ${formatDate(subscription.current_period_end!)}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Next Billing Date</p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {subscription.current_period_end ? formatDate(subscription.current_period_end) : "—"}
                </p>
              </div>
            </div>
            
            {subscription.cancel_at_period_end && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mt-2">
                <p className="text-sm text-amber-800">
                  Your subscription will cancel at the end of the current billing period on {formatDate(subscription.current_period_end!)}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Pricing Header */}
      <div className="text-center py-6 border-t border-slate-100 pt-8">
        <h2 className={`text-3xl font-normal tracking-tight sm:text-4xl bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent ${playfair.className}`}>
          Choose Your Perfect Plan
        </h2>
        <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto font-light leading-relaxed">
          Select a tier that matches your event size. Instantly collect photos, boost limits, and enable premium features.
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch max-w-6xl mx-auto">
        {plansList.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan === plan.id}
            isCurrent={currentPlan === plan.id}
            onClick={() => handleSelectPlan(plan.id)}
          />
        ))}
      </div>

      {/* Add-ons Customization Panel */}
      {selectedPlan !== "free" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-4xl mx-auto shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <Sparkles className={`h-5 w-5 ${accent.icon} animate-pulse`} />
              <h3 className="text-lg font-bold text-slate-900">
                Customize Limits with Add-Ons
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddOns(!showAddOns)}
              className={`text-sm font-semibold ${accent.text} hover:opacity-80 transition-all`}
            >
              {showAddOns ? "Hide add-ons" : "Show add-ons"}
            </button>
          </div>

          {showAddOns && (
            <div className="space-y-8">
              {/* Guest Limit Boost */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span>🚀 Boost Guest Limit</span>
                  <span className="text-xs text-slate-400 font-normal">(Base: {baseGuestLimitStr})</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {guestBoostsList.map((boost) => (
                    <button
                      key={boost.value}
                      type="button"
                      onClick={() => setGuestBoost(boost.value)}
                      className={`py-3 px-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        guestBoost === boost.value
                          ? accent.buttonActive
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-350 hover:bg-slate-50"
                      }`}
                    >
                      <span>{boost.label}</span>
                      <span className="opacity-80 font-normal">
                        {boost.price === 0 ? "₹0" : `+₹${boost.price}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shots Limit Boost */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span>📸 Boost Shots Per Guest</span>
                  <span className="text-xs text-slate-400 font-normal">(Base: {baseShotLimitStr})</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {shotBoostsList.map((boost) => (
                    <button
                      key={boost.value}
                      type="button"
                      onClick={() => setShotBoost(boost.value)}
                      className={`py-3 px-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        shotBoost === boost.value
                          ? accent.buttonActive
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-350 hover:bg-slate-50"
                      }`}
                    >
                      <span>{boost.label}</span>
                      <span className="opacity-80 font-normal">
                        {boost.price === 0 ? `${symbol}0` : `+${symbol}${getPrice(boost.price, Math.round(boost.price / 80))}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pricing Overview & Main Action Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200 rounded-3xl p-8 max-w-4xl mx-auto gap-6 shadow-sm">
        <div className="text-center sm:text-left">
          <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Total Price</span>
          <div className="flex items-baseline gap-1.5 justify-center sm:justify-start mt-1">
            <span className="text-3xl font-extrabold text-slate-900">
              {symbol}{getPrice(totalPrice, Math.round(totalPrice / 80))}
            </span>
            <span className="text-sm text-slate-500 font-light">
              {selectedPlan === "free" ? "forever" : "per event"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-light">
            {selectedPlan !== "free" && (
              <>
                Base {symbol}{getPrice(basePrice, Math.round(basePrice / 80))}
                {guestBoost > 0 && ` + Guest Boost ${symbol}${getPrice(guestAddOnPrice, Math.round(guestAddOnPrice / 80))}`}
                {shotBoost > 0 && ` + Shots Boost ${symbol}${getPrice(shotAddOnPrice, Math.round(shotAddOnPrice / 80))}`}
              </>
            )}
          </p>
        </div>

        <Button
          onClick={handleActionClick}
          disabled={isActionDisabled || cancelMutation.isPending}
          className={getContinueButtonClass()}
        >
          <span>{getActionButtonText()}</span>
          {selectedPlan !== "free" && !isActionDisabled && <ArrowRight className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )
}