"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Script from "next/script"
import { Check, ShieldCheck, AlertCircle, CreditCard, Loader2 } from "lucide-react"
import { Logo } from "@/lib/components/layout/logo"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { useAuth } from "@/lib/hooks"
import { toast } from "@/lib/components/ui/toaster"

import { useCurrency } from "@/lib/context/currency-context"
import { CurrencyToggle } from "@/lib/components/ui/currency-toggle"

// Fallback-only values, used only until the live catalog loads (or if that
// fetch fails). The actual display AND the actual charge are both driven by
// the live Admin > Add-ons catalog: this page fetches it via
// /api/payments/addons (see fetchAddons below) and /api/payments/checkout
// re-fetches it server-side so the Razorpay order amount can't be spoofed.
const PLAN_BASE_PHOTO_LIMITS: Record<string, number> = { free: 5, starter: 20, standard: 45, premium: 85 }
const PHOTO_LIMIT_ADDON_PRICES: Record<number, number> = { 5: 0, 10: 99, 25: 179, 50: 249, [-1]: 599 }
const VIDEO_UNLOCK_ADDON_PRICE = 599
const VOICE_UNLOCK_ADDON_PRICE = 399

const GUEST_PRICES: Record<number, number> = {
  0: 0,
  5: 199,
  25: 399,
}

const SHOT_PRICES: Record<number, number> = {
  0: 0,
  5: 99,
  10: 179,
  25: 249,
}

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter Plan",
  standard: "Standard Plan",
  premium: "Premium Plan",
}

const PLAN_DEFAULT_PRICES: Record<string, number> = {
  starter: 499,
  standard: 1499,
  premium: 3999,
}

const PLAN_DEFAULT_USD: Record<string, number> = {
  starter: 6,
  standard: 19,
  premium: 50,
}

function CheckoutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currency, symbol, getPrice } = useCurrency()
  
  const plan = searchParams?.get("plan") || "starter"
  const eventId = searchParams?.get("event_id") || ""
  const eventSlug = searchParams?.get("event") || ""
  const guests = parseInt(searchParams?.get("guests") || "0")
  const shots = parseInt(searchParams?.get("shots") || "0")
  const photoLimitParam = searchParams?.get("photo_limit")
  const photoLimit = photoLimitParam !== null ? parseInt(photoLimitParam) : undefined
  const videos = searchParams?.get("videos") === "1"
  const voiceNotes = searchParams?.get("voice_notes") === "1"

  const [initiating, setInitiating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planPrices, setPlanPrices] = useState<Record<string, number>>(PLAN_DEFAULT_PRICES)
  const [planUsdPrices, setPlanUsdPrices] = useState<Record<string, number>>(PLAN_DEFAULT_USD)
  const [guestPrices, setGuestPrices] = useState<Record<number, number>>(GUEST_PRICES)
  const [shotPrices, setShotPrices] = useState<Record<number, number>>(SHOT_PRICES)
  const [photoLimitPrices, setPhotoLimitPrices] = useState<Record<number, number>>(PHOTO_LIMIT_ADDON_PRICES)
  const [videoAddonPrice, setVideoAddonPrice] = useState<number>(VIDEO_UNLOCK_ADDON_PRICE)
  const [voiceAddonPrice, setVoiceAddonPrice] = useState<number>(VOICE_UNLOCK_ADDON_PRICE)

  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{ discount_type: string, discount_value: number, code: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")

  // Every event is its own purchase — there is no "already on this plan, so
  // the base price is waived" concept in a per-event billing model. This
  // page used to check the account's `subscriptions` row and zero out the
  // base price whenever it matched the plan being checked out again, which
  // is exactly the bug that let a second event go through with no payment:
  // pay once for a tier, and every later event on that tier priced at ₹0 for
  // as long as the subscription row said "active". Removed — the full plan
  // price is always shown and always charged.
  const rawBaseInr = planPrices[plan] || PLAN_DEFAULT_PRICES[plan] || 0
  const rawBaseUsd = planUsdPrices[plan] || PLAN_DEFAULT_USD[plan] || Math.round((planPrices[plan] || 0) / 80) || 1
  
  const rawGuestInr = guestPrices[guests] || (guests > 0 ? Math.round(guests * 19.9) : 0)
  const rawGuestUsd = Math.round(rawGuestInr / 80) || (guests > 0 ? 3 : 0)
  
  const rawShotInr = shotPrices[shots] || (shots > 0 ? Math.round(shots * 19.9) : 0)
  const rawShotUsd = Math.round(rawShotInr / 80) || (shots > 0 ? 2 : 0)

  // Wizard selections beyond what the plan itself includes — Unlimited (or
  // any tier above the plan's own) photo cap, Videos/Voice Notes unlocked on
  // a plan that doesn't include them. Priced here only for display; the
  // authoritative charge is recomputed server-side in /api/payments/checkout
  // so this can't be spoofed by editing the URL.
  const planBasePhotoLimit = PLAN_BASE_PHOTO_LIMITS[plan] ?? 0
  const photoAddonInr = typeof photoLimit === "number" && photoLimit !== planBasePhotoLimit && (photoLimit === -1 || photoLimit > planBasePhotoLimit)
    ? (photoLimitPrices[photoLimit] ?? 0)
    : 0
  const videoAddonInr = videos && plan !== "standard" && plan !== "premium" ? videoAddonPrice : 0
  const voiceAddonInr = voiceNotes && plan !== "premium" ? voiceAddonPrice : 0
  const featureAddonInr = photoAddonInr + videoAddonInr + voiceAddonInr
  const featureAddonUsd = Math.round(featureAddonInr / 80) || (featureAddonInr > 0 ? 1 : 0)

  const basePrice = getPrice(rawBaseInr, rawBaseUsd)
  const guestAddonPrice = getPrice(rawGuestInr, rawGuestUsd)
  const shotAddonPrice = getPrice(rawShotInr, rawShotUsd)
  const featureAddonPrice = getPrice(featureAddonInr, featureAddonUsd)

  let totalPrice = basePrice + guestAddonPrice + shotAddonPrice + featureAddonPrice
  let discountAmount = 0
  
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      discountAmount = totalPrice * (appliedCoupon.discount_value / 100)
    } else {
      discountAmount = currency === "USD" ? Math.round(appliedCoupon.discount_value / 80) : appliedCoupon.discount_value
    }
    totalPrice = Math.max(0, totalPrice - discountAmount)
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError("")
    try {
      const res = await fetch("/api/payments/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || "Invalid coupon")
      setAppliedCoupon({ discount_type: data.data.discount_type, discount_value: data.data.discount_value, code: couponCode })
    } catch (e: any) {
      setCouponError(e.message)
      setAppliedCoupon(null)
    } finally {
      setCouponLoading(false)
    }
  }

  // Fetch plans and addons from DB on mount to sync with admin adjustments
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/payments/plans")
        if (res.ok) {
          const result = await res.json()
          if (result.success && Array.isArray(result.data)) {
            const mappedInr: Record<string, number> = {}
            const mappedUsd: Record<string, number> = {}
            result.data.forEach((p: any) => {
              mappedInr[p.id] = p.price_inr
              mappedUsd[p.id] = p.price_usd || Math.round(p.price_inr / 80) || 1
            })
            setPlanPrices(prev => ({ ...prev, ...mappedInr }))
            setPlanUsdPrices(prev => ({ ...prev, ...mappedUsd }))
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic plan prices", e)
      }
    }
    
    const fetchAddons = async () => {
      try {
        const res = await fetch("/api/payments/addons")
        if (res.ok) {
          const result = await res.json()
          if (result.guest_boosts) {
            const guestMap: Record<number, number> = {}
            result.guest_boosts.forEach((b: any) => {
              guestMap[b.value] = b.price
            })
            setGuestPrices(guestMap)
          }
          if (result.shot_boosts) {
            const shotMap: Record<number, number> = {}
            result.shot_boosts.forEach((b: any) => {
              shotMap[b.value] = b.price
            })
            setShotPrices(shotMap)
          }
          if (result.photo_limit_boosts) {
            const photoMap: Record<number, number> = {}
            result.photo_limit_boosts.forEach((b: any) => {
              photoMap[b.value] = b.price
            })
            setPhotoLimitPrices(photoMap)
          }
          if (typeof result.video_addon_price === "number") {
            setVideoAddonPrice(result.video_addon_price)
          }
          if (typeof result.voice_addon_price === "number") {
            setVoiceAddonPrice(result.voice_addon_price)
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic addon prices", e)
      }
    }

    fetchPlans()
    fetchAddons()
  }, [])

  // Double check user session
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?next=/checkout")
    }
  }, [user, authLoading, router])

  const handlePayment = async () => {
    setInitiating(true)
    setError(null)

    try {
      // 1. Create Razorpay order on server with currency
      const orderRes = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: plan,
          event_id: eventId,
          guest_boost: guests,
          shots_boost: shots,
          coupon_code: appliedCoupon?.code,
          currency: currency,
          photo_limit: photoLimit,
          videos,
          voice_notes: voiceNotes,
        }),
      })

      if (!orderRes.ok) {
        const errorData = await orderRes.json()
        throw new Error((typeof errorData.error === "object" ? errorData.error?.message : errorData.error) || "Failed to initiate payment")
      }

      const responseJson = await orderRes.json()
      const orderData = responseJson.data

      // 2. Open Razorpay checkout modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Snapsy Events",
        description: `${PLAN_NAMES[plan]} + Custom Boosts`,
        order_id: orderData.order_id,
        prefill: {
          name: profile?.full_name || user?.email?.split("@")[0] || "",
          email: user?.email || "",
        },
        theme: {
          color: "#f97316", // orange theme color
        },
        handler: async (response: any) => {
          setInitiating(true)
          try {
            // 3. Verify signature on backend
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: plan,
                guest_boost: guests,
                shots_boost: shots,
              }),
            })

            if (!verifyRes.ok) {
              const verifyData = await verifyRes.json()
              const errDetail = verifyData?.error
              const errMessage = typeof errDetail === "object"
                ? (errDetail?.message || errDetail?.code || JSON.stringify(errDetail))
                : (errDetail || "Payment verification failed")
              throw new Error(errMessage)
            }

            toast({
              title: "Payment Successful",
              description: `You have successfully subscribed to ${PLAN_NAMES[plan]}!`,
            })

            // Redirect to dashboard with success query
            router.push("/dashboard?subscribed=success")
          } catch (err: any) {
            const msg = typeof err === "object" && err?.message ? err.message : String(err)
            setError(msg || "Failed to verify signature")
            setInitiating(false)
          }
        },
        modal: {
          ondismiss: () => {
            setInitiating(false)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
      setInitiating(false)
    }
  }

  // When the plan is already active and there are no paid add-ons, totalPrice
  // is legitimately 0 — but Razorpay rejects orders below its minimum charge,
  // so routing this through handlePayment would just surface a payment
  // error. Activate directly instead, no payment gateway involved.
  const handleFreeActivation = async () => {
    setInitiating(true)
    setError(null)
    try {
      const res = await fetch("/api/payments/checkout-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: plan,
          event_id: eventId,
          guest_boost: guests,
          shots_boost: shots,
          coupon_code: appliedCoupon?.code,
          currency: currency,
          photo_limit: photoLimit,
          videos,
          voice_notes: voiceNotes,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error((typeof errorData.error === "object" ? errorData.error?.message : errorData.error) || "Failed to activate plan")
      }

      toast({
        title: "Plan Activated",
        description: `You're all set on ${PLAN_NAMES[plan] || plan}!`,
      })
      router.push("/dashboard?subscribed=success")
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
      setInitiating(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!eventId) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-orange-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Missing event</h1>
          <p className="text-sm text-slate-500">
            This checkout link is missing its event. Please start checkout from your event creation wizard or dashboard.
          </p>
          <Link href="/dashboard">
            <Button className="mt-2 bg-orange-500 text-white hover:bg-orange-600 font-bold rounded-xl border-none">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
        {/* Logo */}
        <Link href="/" className="mb-8">
          <Logo />
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 w-full">
          {/* Order Details Receipt */}
          <Card className="md:col-span-3 bg-white border-slate-200 p-6 flex flex-col justify-between shadow-sm">
            <div>
              <CardHeader className="p-0 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">Review your subscription</CardTitle>
                    <CardDescription className="text-slate-500 text-sm">
                      Complete payment to activate limits and features.
                    </CardDescription>
                  </div>
                  <CurrencyToggle />
                </div>
              </CardHeader>

              <div className="space-y-4">
                {/* Plan Base */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800">{PLAN_NAMES[plan] || plan}</span>
                    <p className="text-xs text-slate-400">
                      Base event plan features
                    </p>
                  </div>
                  <span className="font-bold text-slate-800">
                    {symbol}{basePrice}
                  </span>
                </div>

                {/* Guest Boost */}
                {guests > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800">Guest Quota Boost</span>
                      <p className="text-xs text-slate-400">+{guests} guests invite limit</p>
                    </div>
                    <span className="font-bold text-slate-800">{symbol}{guestAddonPrice}</span>
                  </div>
                )}

                {/* Shots Boost */}
                {shots > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800">Shots Quota Boost</span>
                      <p className="text-xs text-slate-400">+{shots} shots limit per guest</p>
                    </div>
                    <span className="font-bold text-slate-800">{symbol}{shotAddonPrice}</span>
                  </div>
                )}

                {/* Photo limit above plan (incl. Unlimited) */}
                {photoAddonInr > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800">Photo Cap Upgrade</span>
                      <p className="text-xs text-slate-400">{photoLimit === -1 ? "Unlimited" : photoLimit} photos per guest</p>
                    </div>
                    <span className="font-bold text-slate-800">{symbol}{getPrice(photoAddonInr, Math.round(photoAddonInr / 80) || 1)}</span>
                  </div>
                )}

                {/* Videos unlock */}
                {videoAddonInr > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800">Videos Add-on</span>
                      <p className="text-xs text-slate-400">Not included in {PLAN_NAMES[plan] || plan}</p>
                    </div>
                    <span className="font-bold text-slate-800">{symbol}{getPrice(videoAddonInr, Math.round(videoAddonInr / 80) || 1)}</span>
                  </div>
                )}

                {/* Voice Notes unlock */}
                {voiceAddonInr > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800">Voice Notes Add-on</span>
                      <p className="text-xs text-slate-400">Premium-only feature</p>
                    </div>
                    <span className="font-bold text-slate-800">{symbol}{getPrice(voiceAddonInr, Math.round(voiceAddonInr / 80) || 1)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              {/* Coupon Section */}
              <div className="flex items-start gap-2 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Have a coupon code?"
                    disabled={initiating || !!appliedCoupon}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500 disabled:opacity-50"
                  />
                  {couponError && <p className="text-rose-500 text-[10px] mt-1 font-semibold">{couponError}</p>}
                </div>
                {!appliedCoupon ? (
                  <Button onClick={handleApplyCoupon} disabled={!couponCode || couponLoading || initiating} variant="outline" size="sm" className="text-xs h-8">
                    {couponLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                  </Button>
                ) : (
                  <Button onClick={() => { setAppliedCoupon(null); setCouponCode(""); setCouponError("") }} disabled={initiating} variant="outline" size="sm" className="text-xs h-8 text-rose-500 hover:text-rose-600">
                    Remove
                  </Button>
                )}
              </div>

              {/* Total Summary */}
              {appliedCoupon && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Discount Applied
                  </span>
                  <span className="text-sm font-bold text-emerald-600">-{symbol}{Math.floor(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-6 pt-2 border-t border-slate-100/50">
                <span className="text-base font-medium text-slate-650">Total Price ({currency})</span>
                <span className="text-3xl font-extrabold text-slate-900">{symbol}{Math.floor(totalPrice)}</span>
              </div>

              {error && (
                <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={totalPrice > 0 ? handlePayment : handleFreeActivation}
                disabled={initiating}
                className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold py-6 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.2)] flex items-center justify-center gap-2 border-none"
              >
                {initiating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{totalPrice > 0 ? "Processing Payment..." : "Activating..."}</span>
                  </>
                ) : totalPrice > 0 ? (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>Pay with Razorpay</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Continue — No Payment Required</span>
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Secure Details Badge & Features */}
          <div className="md:col-span-2 space-y-6 flex flex-col justify-center">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-orange-500">
                <ShieldCheck className="h-6 w-6 shrink-0" />
                <span className="font-bold text-slate-800">Secure Payments</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transactions are securely processed using Razorpay. Snapsy does not store card numbers or other payment credentials.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700">Included in your plan:</h4>
              <ul className="space-y-2.5 text-xs text-slate-500">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-500 shrink-0" />
                  <span>Instant event photo collection web app</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-500 shrink-0" />
                  <span>QR codes for guest scanning and direct uploads</span>
                </li>
                {plan !== "starter" && (
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-orange-500 shrink-0" />
                    <span>AI Face Search matching engine</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-500 shrink-0" />
                  <span>High quality storage limits</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 py-6 mt-12">
        © {new Date().getFullYear()} Snapsy Inc. All rights reserved.
      </footer>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  )
}
