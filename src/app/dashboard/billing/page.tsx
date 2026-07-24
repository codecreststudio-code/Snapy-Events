"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks"
import { createClient } from "@/lib/supabase/client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
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
  is_popular?: boolean
  best_value?: boolean
}

const PLAN_INFO: PlanInfo[] = [
  {
    id: "free" as PlanId,
    name: "Basic",
    description: "Perfect for trying out Snapsy",
    price: 0,
    priceUsd: 0,
    priceMonthly: 0,
    features: [
      "Up to 5 guests limit",
      "30 shots per guest",
      "Custom reveal countdown",
      "Guestbook & photo reactions",
    ],
    limits: { events: 1, storage: 1, photos: 100 },
  },
  {
    id: "starter" as PlanId,
    name: "Standard",
    description: "For small events and personal use",
    price: 499,
    priceUsd: 6,
    priceMonthly: 499,
    features: [
      "Up to 20 guests limit",
      "36 shots per guest",
      "AI Face Search matching",
      "Custom reveal countdown",
      "All camera filters enabled",
      "Voice notes & audio greetings",
      "Guestbook & photo reactions",
    ],
    limits: { events: 10, storage: 20, photos: 5000 },
    is_popular: true,
  },
  {
    id: "premium" as PlanId,
    name: "Premium",
    description: "For professional photographers and large events",
    price: 2999,
    priceUsd: 36,
    priceMonthly: 2999,
    features: [
      "Up to 50 guests limit",
      "50 shots per guest",
      "AI Face Search matching",
      "Live Photo Wall stream",
      "Custom reveal countdown",
      "All camera filters enabled",
      "Video uploads support",
      "Voice notes & audio greetings",
      "Guestbook & photo reactions",
      "Print-ready download gallery",
      "WhatsApp notification alerts",
      "24/7 Priority support",
    ],
    limits: { events: -1, storage: 100, photos: -1 },
    best_value: true,
  },
]

// Initial/fallback state only — overwritten by the live /api/payments/addons
// fetch below as soon as it resolves. Kept in sync with the current
// Admin > Subscriptions > Add-ons catalog so there's no flash of stale
// tiers/prices before that fetch completes (or if it fails).
const GUEST_BOOSTS = [
  { label: "No extra", value: 0, price: 0 },
  { label: "+5 guests", value: 5, price: 199 },
  { label: "+25 guests", value: 25, price: 399 },
]

const SHOT_BOOSTS = [
  { label: "No extra", value: 0, price: 0 },
  { label: "+5 shots/guest", value: 5, price: 99 },
  { label: "+10 shots/guest", value: 10, price: 179 },
  { label: "+25 shots/guest", value: 25, price: 249 },
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
    .maybeSingle()

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
  onClick,
}: {
  plan: PlanInfo
  isSelected: boolean
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

  const isPopular = !!plan.is_popular
  const isPremium = !!plan.best_value

  let selectedClasses = "border-[#e5dfd0] hover:border-mauve/40 hover:shadow-xl"
  if (isSelected) {
    if (isPremium) {
      selectedClasses = "border-mauve-strong ring-2 ring-mauve-strong/20 shadow-[0_20px_50px_rgba(150,114,58,0.15)] md:scale-[1.03] z-10"
    } else if (isPopular) {
      selectedClasses = "border-mauve ring-2 ring-mauve/20 shadow-[0_20px_50px_rgba(184,146,90,0.15)] md:scale-[1.03] z-10"
    } else {
      selectedClasses = "border-mauve ring-2 ring-mauve/15 shadow-[0_15px_40px_rgba(184,146,90,0.1)]"
    }
  } else {
    if (isPopular) {
      selectedClasses = "border-[#e5dfd0] hover:border-mauve/50 hover:shadow-lg"
    } else if (isPremium) {
      selectedClasses = "border-[#e5dfd0] hover:border-mauve-strong/50 hover:shadow-lg"
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
      className={`relative rounded-3xl border bg-[#ffffff] p-6 cursor-pointer flex flex-col justify-between transition-all duration-300 ${selectedClasses}`}
    >
      {/* Background Spotlight Glow Wrapper */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        {isHovered && (
          <div
            className="absolute -inset-px transition duration-300 opacity-100"
            style={{
              background: `radial-gradient(320px circle at ${coords.x}px ${coords.y}px, ${
                isPremium
                  ? "rgba(150,114,58,0.10)"
                  : isPopular
                  ? "rgba(184,146,90,0.08)"
                  : "rgba(184,146,90,0.05)"
              }, transparent 80%)`,
            }}
          />
        )}
      </div>

      {/* Badges Container */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-surface-dark border border-mauve/25 px-4 py-1.5 text-[9px] font-bold text-mauve-strong tracking-widest uppercase shadow-md flex items-center gap-1 z-20">
          <Sparkles className="h-3 w-3 text-mauve" />
          POPULAR
        </div>
      )}
      {isPremium && (
        <div className="absolute -top-3 right-4 rounded-full bg-ink px-3 py-1.5 text-[9px] font-bold text-surface-dark tracking-widest uppercase shadow-md flex items-center gap-1 z-20">
          <Crown className="h-3.5 w-3.5" />
          BEST VALUE
        </div>
      )}

      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
            <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed font-light min-h-[32px]">
              {plan.description}
            </p>
          </div>
          {isPopular && (
            <span className="h-7 w-7 rounded-full bg-mauve/10 flex items-center justify-center text-mauve shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          )}
          {isPremium && (
            <span className="h-7 w-7 rounded-full bg-ink/10 flex items-center justify-center text-ink shrink-0">
              <Crown className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-ink">{symbol}{displayPrice}</span>
          <span className="text-ink-tertiary text-xs font-light">/ event</span>
        </div>

        <ul className="mt-5 space-y-3 border-t border-hairline-dark pt-5">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-ink-secondary font-light">
              <Check
                className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                  isSelected
                    ? isPremium
                      ? "text-mauve-strong"
                      : "text-mauve"
                    : "text-ink-tertiary"
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
              ? "bg-mauve text-[#1a1410] shadow-md shadow-mauve/10"
              : "bg-mauve/5 text-ink-secondary hover:bg-mauve/10"
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

  // Set default plan selection based on current organization plan on load
  useEffect(() => {
    if (userProfile) {
      setSelectedPlan(userProfile.plan || "free")
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
                },
                is_popular: dbPlan.is_popular || false,
                best_value: dbPlan.best_value || false,
              }
            })
            mapped.sort((a: any, b: any) => (a.price ?? 0) - (b.price ?? 0))
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
    if (selectedPlan === "premium") return {
      text: "text-mauve-strong",
      bg: "bg-mauve-strong/10",
      border: "border-mauve-strong/30",
      badge: "bg-mauve-strong",
      hover: "hover:border-mauve-strong/50",
      buttonActive: "bg-mauve-strong/10 border-mauve-strong text-mauve-strong shadow-[0_0_10px_rgba(150,114,58,0.15)]",
      icon: "text-mauve-strong"
    }
    return {
      text: "text-mauve",
      bg: "bg-mauve/10",
      border: "border-mauve/30",
      badge: "bg-mauve",
      hover: "hover:border-mauve/50",
      buttonActive: "bg-mauve/10 border-mauve text-mauve shadow-[0_0_10px_rgba(184,146,90,0.1)]",
      icon: "text-mauve"
    }
  }

  const activePlanDetails = plansList.find((p) => p.id === selectedPlan) || plansList[0]

  // Every plan tier is always full price — each event is its own separate
  // purchase, so having used a tier before never waives its price.
  const isSamePlan = selectedPlan === currentPlan
  const basePrice = activePlanDetails?.price || 0

  const guestAddOnPrice = guestBoostsList.find((b) => b.value === guestBoost)?.price || 0
  const shotAddOnPrice = shotBoostsList.find((b) => b.value === shotBoost)?.price || 0
  const totalPrice = basePrice + guestAddOnPrice + shotAddOnPrice

  const baseGuestLimitStr = activePlanDetails?.features.find(f => f.toLowerCase().includes("guest")) || "10 guests"
  const baseShotLimitStr = activePlanDetails?.features.find(f => f.toLowerCase().includes("shot")) || "10 shots per guest"
  const accent = getAccentColor()

  // The only legitimate "nothing to do" state left is Free→Free: there is no
  // subscription to cancel and no purchase to make. This is NOT a price
  // waiver — paid tiers are always full price, even if the host used that
  // tier before, because every event is its own separate purchase.
  const isFreeNoOp = selectedPlan === "free" && currentPlan === "free"

  const getContinueButtonClass = () => {
    const base = "w-full sm:w-auto font-bold px-8 py-6 rounded-2xl flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98] border-none "
    if (isFreeNoOp) {
      return base + "bg-ink/5 text-ink-tertiary cursor-not-allowed shadow-none"
    }
    if (selectedPlan === "free") {
      return base + "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/10"
    } else if (selectedPlan === "premium") {
      return base + "bg-mauve-strong hover:bg-mauve text-[#1a1410] shadow-md shadow-mauve-strong/20"
    }
    return base + "bg-mauve hover:bg-mauve-strong text-[#1a1410] shadow-md shadow-mauve/20"
  }

  const getActionButtonText = () => {
    if (cancelMutation.isPending) return "Processing Downgrade..."
    if (selectedPlan === "free") {
      if (isFreeNoOp) return "Already on Free"
      return "Downgrade to Free"
    }
    return "Continue to Create Event"
  }

  const handleActionClick = () => {
    if (isFreeNoOp) return
    if (selectedPlan === "free") {
      if (confirm("Are you sure you want to cancel your paid subscription and downgrade to the Free plan? Your additional storage and guest limits will be reset.")) {
        cancelMutation.mutate()
      }
    } else {
      // Every plan is purchased per event — there is no standalone checkout
      // without a specific event to attach the payment to. Send the host
      // into the event creation wizard, where the plan/add-on selection made
      // here is just an informational preview of that flow's pricing.
      router.push("/dashboard/events/new")
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
    <div className={`space-y-8 pb-16 selection:bg-mauve/20 ${inter.className}`}>
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5dfd0] pb-6">
        <div>
          <h1 className="font-playfair text-3xl font-light text-ink">Billing</h1>
          <p className="text-ink-secondary mt-1 text-sm">Manage your workspace subscription and limits</p>
        </div>
        <CurrencyToggle />
      </div>

      {/* Last purchased plan — historical reference only. Snapsy is strictly
          pay-per-event, so this is never an ongoing/free/already-active
          entitlement for the next event a host creates. */}
      {subscription && (
        <Card className="rounded-2xl border border-[#e5dfd0] bg-[#ffffff] shadow-sm overflow-hidden">
          <CardHeader className="bg-ink/[0.02] border-b border-[#e5dfd0] pb-4">
            <CardTitle className="text-lg font-bold text-ink">Last Purchased Plan</CardTitle>
            <CardDescription className="text-ink-secondary">
              Reference only. Snapsy bills per event, so this reflects your most recent purchase — not an ongoing subscription or a discount on your next event.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div>
              <p className="text-xs font-medium text-ink-tertiary uppercase tracking-wider">Plan Tier</p>
              <p className="text-lg font-bold text-ink capitalize mt-1">{subscription.plan_id}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Pricing Header */}
      <div className="text-center py-6 border-t border-[#e5dfd0] pt-8">
        <h2 className={`text-3xl font-normal tracking-tight sm:text-4xl text-ink font-light ${playfair.className}`}>
          Choose Your Perfect Plan
        </h2>
        <p className="mt-3 text-sm text-ink-secondary max-w-xl mx-auto font-light leading-relaxed">
          Select a tier that matches your event size. Instantly collect photos, boost limits, and enable premium features.
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
        {plansList.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan === plan.id}
            onClick={() => handleSelectPlan(plan.id)}
          />
        ))}
      </div>

      {/* Add-ons Customization Panel */}
      {selectedPlan !== "free" && (
        <div className="rounded-2xl border border-[#e5dfd0] bg-[#ffffff] p-8 max-w-4xl mx-auto shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between border-b border-[#e5dfd0] pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <Sparkles className={`h-5 w-5 ${accent.icon} animate-pulse`} />
              <h3 className="text-lg font-bold text-ink">
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
                <Label className="text-sm font-semibold text-ink-secondary flex items-center gap-2">
                  <span>🚀 Boost Guest Limit</span>
                  <span className="text-xs text-ink-tertiary font-normal">(Base: {baseGuestLimitStr})</span>
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
                          : "bg-ink/[0.03] border-[#e5dfd0] text-ink-secondary hover:border-mauve/30 hover:bg-mauve/5"
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

              {/* Shots Limit Boost */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-ink-secondary flex items-center gap-2">
                  <span>📸 Boost Shots Per Guest</span>
                  <span className="text-xs text-ink-tertiary font-normal">(Base: {baseShotLimitStr})</span>
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
                          : "bg-ink/[0.03] border-[#e5dfd0] text-ink-secondary hover:border-mauve/30 hover:bg-mauve/5"
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
      <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-[#e5dfd0] bg-[#ffffff] p-8 max-w-4xl mx-auto gap-6 shadow-sm">
        <div className="text-center sm:text-left">
          <span className="text-xs text-ink-tertiary uppercase tracking-widest font-semibold">Total Price</span>
          <div className="flex items-baseline gap-1.5 justify-center sm:justify-start mt-1">
            <span className="text-3xl font-extrabold text-ink">
              {symbol}{getPrice(totalPrice, Math.round(totalPrice / 80))}
            </span>
            <span className="text-sm text-ink-secondary font-light">
              {selectedPlan === "free" ? "forever" : "per event"}
            </span>
          </div>
          <p className="text-xs text-ink-tertiary mt-1.5 font-light">
            {selectedPlan === "free" ? (
              isFreeNoOp ? (
                <span className="text-ink-secondary">You&apos;re currently on the Free plan.</span>
              ) : (
                <span className="text-ink-secondary">No charge — downgrading resets any paid add-ons.</span>
              )
            ) : (
              <>
                Base {symbol}{getPrice(basePrice, Math.round(basePrice / 80))}
                {guestBoost > 0 && ` + Guest Boost ${symbol}${getPrice(guestAddOnPrice, Math.round(guestAddOnPrice / 80))}`}
                {shotBoost > 0 && ` + Shots Boost ${symbol}${getPrice(shotAddOnPrice, Math.round(shotAddOnPrice / 80))}`}
                {isSamePlan && (
                  <span className="block text-[11px] text-ink-tertiary mt-1">
                    You&apos;ve purchased the {activePlanDetails.name} plan before — this will be a new, full-price purchase for a new event.
                  </span>
                )}
              </>
            )}
          </p>
          <p className="text-[11px] text-ink-tertiary mt-2 font-light">
            Plans are purchased per event — pricing above is a preview. Checkout always happens from Create Event.
          </p>
        </div>

        <Button
          onClick={handleActionClick}
          disabled={isFreeNoOp || cancelMutation.isPending}
          className={getContinueButtonClass()}
        >
          <span>{getActionButtonText()}</span>
          {selectedPlan !== "free" && <ArrowRight className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )
}