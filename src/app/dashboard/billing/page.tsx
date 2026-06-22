"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks"
import { createClient } from "@/lib/supabase/client"
import { PLANS, PLAN_LIMITS, PLAN_PRICES } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Badge } from "@/lib/components/ui/badge"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { Separator } from "@/lib/components/ui/separator"
import { toast } from "@/lib/components/ui/toaster"
import { Check, CreditCard, Zap, Crown, Sparkles, ArrowRight } from "lucide-react"
import type { PlanId, Subscription } from "@/lib/types"

interface PlanInfo {
  id: PlanId
  name: string
  description: string
  price: number
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
    description: "Perfect for trying out Snapsy",
    price: 0,
    priceMonthly: 0,
    features: [
      "1 event",
      "1 GB storage",
      "100 photos",
      "1 QR code per event",
      "Basic support",
    ],
    limits: { events: 1, storage: 1, photos: 100 },
  },
  {
    id: "starter",
    name: "Starter",
    description: "For small events and gatherings",
    price: 499,
    priceMonthly: 499,
    features: [
      "5 events",
      "10 GB storage",
      "5,000 photos",
      "10 QR codes per event",
      "Email support",
      "Custom branding",
    ],
    limits: { events: 5, storage: 10, photos: 5000 },
  },
  {
    id: "standard",
    name: "Standard",
    description: "For professional photographers",
    price: 1499,
    priceMonthly: 1499,
    features: [
      "25 events",
      "100 GB storage",
      "50,000 photos",
      "50 QR codes per event",
      "AI face search",
      "Priority support",
      "White-label",
      "Advanced analytics",
    ],
    limits: { events: 25, storage: 100, photos: 50000 },
  },
  {
    id: "premium",
    name: "Premium",
    description: "For agencies and high-volume needs",
    price: 3999,
    priceMonthly: 3999,
    features: [
      "Unlimited events",
      "1 TB storage",
      "Unlimited photos",
      "Unlimited QR codes",
      "AI face search",
      "24/7 priority support",
      "White-label",
      "Advanced analytics",
      "Custom domains",
      "API access",
      "Dedicated account manager",
    ],
    limits: { events: -1, storage: 1000, photos: -1 },
  },
]

async function getSubscription(): Promise<Subscription | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return null

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("status", "active")
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data || null
}

async function getOrganization() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("users")
    .select("organization:organizations(*)")
    .eq("id", user.id)
    .single()
  return (data?.organization as any as { id: string; name: string; plan: PlanId } | null)
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function BillingCard({
  plan,
  billingInterval,
  isCurrentPlan,
  isUpgrade,
  upgradeMutation,
}: {
  plan: PlanInfo
  billingInterval: "monthly" | "yearly"
  isCurrentPlan: (id: PlanId) => boolean
  isUpgrade: (id: PlanId) => boolean
  upgradeMutation: any
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

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-3xl border bg-white p-8 flex flex-col justify-between transition-all duration-300 ${
        isCurrentPlan(plan.id)
          ? "border-[#4f46e5] ring-2 ring-[#4f46e5]/20 shadow-md"
          : isPopular
          ? "border-violet-500 shadow-[0_20px_50px_rgba(139,92,246,0.15)] ring-1 ring-violet-500 z-10"
          : "border-slate-200 hover:border-slate-350 hover:shadow-xl"
      }`}
    >
      {/* Background Spotlight Glow */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px transition duration-300 opacity-100"
          style={{
            background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, ${
              isPopular ? "rgba(139, 92, 246, 0.12)" : "rgba(139, 92, 246, 0.06)"
            }, transparent 80%)`,
          }}
        />
      )}

      {/* Badges */}
      {isCurrentPlan(plan.id) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-1 text-[9px] font-bold text-white tracking-widest uppercase shadow-md">
          Current Plan
        </div>
      )}
      {!isCurrentPlan(plan.id) && isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-1 text-[9px] font-bold text-white tracking-widest uppercase shadow-md flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Popular
        </div>
      )}
      {!isCurrentPlan(plan.id) && isPremium && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 text-[9px] font-bold text-white tracking-widest uppercase shadow-md flex items-center gap-1">
          <Crown className="h-3 w-3" />
          Best Value
        </div>
      )}

      <div>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            <p className="mt-2 text-xs text-slate-450 leading-relaxed font-light min-h-[32px]">
              {plan.description}
            </p>
          </div>
          {isPopular && (
            <span className="h-8 w-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
              <Sparkles className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-slate-900">
            ₹{billingInterval === "yearly" ? plan.price * 10 : plan.price}
          </span>
          <span className="text-slate-400 text-xs font-light">
            / {billingInterval === "yearly" ? "year" : "month"}
          </span>
        </div>
        
        {billingInterval === "yearly" && (
          <p className="text-xs text-emerald-600 font-semibold mt-1">Save 2 months free!</p>
        )}

        <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-slate-600 font-light">
              <Check className={`h-4 w-4 flex-shrink-0 ${isPopular ? "text-violet-600" : "text-slate-400"}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Separator className="my-4" />

        <div className="text-[11px] text-slate-400 font-light space-y-1">
          <p>{plan.limits.events === -1 ? "Unlimited events" : `Up to ${plan.limits.events} events`}</p>
          <p>{plan.limits.storage === 1000 ? "1 TB storage" : `${plan.limits.storage} GB storage`}</p>
          <p>{plan.limits.photos === -1 ? "Unlimited photos" : `${plan.limits.photos.toLocaleString()} photos`}</p>
        </div>
      </div>

      <div className="mt-8 pt-4">
        <Button
          className={`w-full font-bold py-5 rounded-full transition-transform active:scale-[0.98] ${
            isCurrentPlan(plan.id)
              ? "bg-slate-100 text-slate-500 hover:bg-slate-100 cursor-not-allowed border-none"
              : isPopular
              ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 border-none"
              : "bg-slate-900 text-white hover:bg-slate-800 border-none"
          }`}
          disabled={isCurrentPlan(plan.id) || upgradeMutation.isPending}
          onClick={() => upgradeMutation.mutate(plan.id)}
        >
          {isCurrentPlan(plan.id) ? (
            "Current Plan"
          ) : isUpgrade(plan.id) ? (
            <span className="flex items-center justify-center gap-1.5">
              <Zap className="h-4 w-4 shrink-0" />
              Upgrade
            </span>
          ) : (
            "Downgrade"
          )}
        </Button>
      </div>
    </motion.div>
  )
}

export default function BillingPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { profile, user } = useAuth()
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly")
  const [plansList, setPlansList] = useState<PlanInfo[]>(PLAN_INFO)

  // Dynamic database plans sync
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/payments/plans")
        if (res.ok) {
          const result = await res.json()
          if (result.success && Array.isArray(result.data)) {
            const mapped = PLAN_INFO.map(plan => {
              const dbPlan = result.data.find((p: any) => p.id === plan.id)
              if (dbPlan) {
                return {
                  ...plan,
                  price: dbPlan.price_inr,
                  priceMonthly: dbPlan.price_inr,
                  features: Array.isArray(dbPlan.features) ? dbPlan.features : plan.features,
                  limits: {
                    events: dbPlan.limits?.events_limit ?? plan.limits.events,
                    storage: dbPlan.limits?.storage_limit_gb ?? plan.limits.storage,
                    photos: dbPlan.limits?.photo_limit ?? plan.limits.photos,
                  }
                }
              }
              return plan
            })
            setPlansList(mapped)
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic billing plans", e)
      }
    }
    fetchPlans()
  }, [])

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
  })

  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: getOrganization,
  })

  const upgradeMutation = useMutation({
    mutationFn: async (planId: PlanId) => {
      const response = await fetch("/api/payments/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to create subscription")
      const checkoutData = result.data

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your connection.")
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_Stre2LIpvla35v",
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: "Snapy",
        description: `Upgrade to ${checkoutData.plan} plan`,
        order_id: checkoutData.order_id,
        customer_id: checkoutData.customer_id,
        prefill: {
          email: user?.email || "",
          name: profile?.full_name || "",
        },
        theme: {
          color: "#4f46e5",
        },
        handler: async function (response: any) {
          toast({
            title: "Payment captured successfully",
            description: "Your workspace is being upgraded. Please wait...",
          })
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["subscription"] })
            queryClient.invalidateQueries({ queryKey: ["organization"] })
            router.refresh()
          }, 2000)
        },
        modal: {
          ondismiss: function () {
            toast({
              title: "Payment cancelled",
              description: "You cancelled the payment process.",
              variant: "destructive",
            })
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upgrade", description: error.message, variant: "destructive" })
    },
  })

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
      queryClient.invalidateQueries({ queryKey: ["organization"] })
      router.refresh()
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" })
    },
  })

  const currentPlan = organization?.plan || "free"
  const isCurrentPlan = (planId: PlanId) => planId === currentPlan
  const isUpgrade = (planId: PlanId) => {
    const order = ["free", "starter", "standard", "premium"]
    return order.indexOf(planId) > order.indexOf(currentPlan as PlanId)
  }

  if (subLoading || orgLoading) {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>Your active subscription details</CardDescription>
              </div>
              <Badge
                variant={subscription.status === "active" ? "success" : "secondary"}
                className="text-sm"
              >
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-medium capitalize">{subscription.plan_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Period</p>
                <p className="text-lg font-medium">
                  {subscription.current_period_start
                    ? `${formatDate(subscription.current_period_start)} - ${formatDate(subscription.current_period_end!)}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Billing</p>
                <p className="text-lg font-medium">
                  {subscription.current_period_end ? formatDate(subscription.current_period_end) : "—"}
                </p>
              </div>
            </div>
            {subscription.cancel_at_period_end && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800">
                  Your subscription will cancel at the end of the current billing period.
                </p>
              </div>
            )}
            {!subscription.cancel_at_period_end && subscription.plan_id !== "free" && (
              <Button
                variant="outline"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Available Plans</h2>
        <div className="flex items-center gap-2 rounded-lg border p-1">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              billingInterval === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("yearly")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              billingInterval === "yearly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {plansList.map((plan) => (
          <BillingCard
            key={plan.id}
            plan={plan}
            billingInterval={billingInterval}
            isCurrentPlan={isCurrentPlan}
            isUpgrade={isUpgrade}
            upgradeMutation={upgradeMutation}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Payment Method</CardTitle>
          </div>
          <CardDescription>Manage your payment details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Razorpay</p>
                <p className="text-sm text-muted-foreground">
                  Secure payment via Razorpay
                </p>
              </div>
            </div>
            <Button variant="outline">Manage</Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Your payment is securely processed by Razorpay. We never store your card details.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}