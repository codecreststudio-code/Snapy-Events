"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

async function createSubscription(planId: PlanId) {
  const supabase = createClient()
  const response = await fetch("/api/billing/create-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error || "Failed to create subscription")

  if (data.checkout_url) {
    window.location.href = data.checkout_url
  }
}

async function cancelSubscription() {
  const supabase = createClient()
  const response = await fetch("/api/billing/cancel-subscription", {
    method: "POST",
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error || "Failed to cancel subscription")
  toast({ title: "Subscription cancelled", description: "Your subscription will remain active until the end of the billing period." })
}

export default function BillingPage() {
  const queryClient = useQueryClient()
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly")

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
  })

  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: getOrganization,
  })

  const upgradeMutation = useMutation({
    mutationFn: (planId: PlanId) => createSubscription(planId),
    onError: (error: Error) => {
      toast({ title: "Failed to upgrade", description: error.message, variant: "destructive" })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] })
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_INFO.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${isCurrentPlan(plan.id) ? "border-primary" : ""}`}
          >
            {isCurrentPlan(plan.id) && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Badge>Current Plan</Badge>
              </div>
            )}
            {plan.id === "standard" && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Badge variant="default" className="bg-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Popular
                </Badge>
              </div>
            )}
            {plan.id === "premium" && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500">
                  <Crown className="h-3 w-3 mr-1" />
                  Best Value
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                ₹{billingInterval === "yearly" ? plan.price * 10 : plan.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /{billingInterval === "yearly" ? "year" : "month"}
                </span>
              </div>
              {billingInterval === "yearly" && (
                <p className="text-xs text-green-600">Save 2 months free!</p>
              )}
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{plan.limits.events === -1 ? "Unlimited events" : `Up to ${plan.limits.events} events`}</p>
                <p>{plan.limits.storage === 1000 ? "1 TB storage" : `${plan.limits.storage} GB storage`}</p>
                <p>{plan.limits.photos === -1 ? "Unlimited photos" : `${plan.limits.photos.toLocaleString()} photos`}</p>
              </div>
              <Button
                className="w-full"
                variant={isCurrentPlan(plan.id) ? "outline" : isUpgrade(plan.id) ? "default" : "outline"}
                disabled={isCurrentPlan(plan.id) || upgradeMutation.isPending}
                onClick={() => upgradeMutation.mutate(plan.id)}
              >
                {isCurrentPlan(plan.id) ? (
                  "Current Plan"
                ) : isUpgrade(plan.id) ? (
                  <>
                    <Zap className="h-4 w-4" />
                    Upgrade
                  </>
                ) : (
                  "Downgrade"
                )}
              </Button>
            </CardContent>
          </Card>
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