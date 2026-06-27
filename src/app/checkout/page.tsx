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

const GUEST_PRICES: Record<number, number> = {
  0: 0,
  10: 199,
  25: 399,
  50: 699,
  100: 1199,
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

function CheckoutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()
  
  const plan = searchParams?.get("plan") || "starter"
  const guests = parseInt(searchParams?.get("guests") || "0")
  const shots = parseInt(searchParams?.get("shots") || "0")

  const [initiating, setInitiating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planPrices, setPlanPrices] = useState<Record<string, number>>(PLAN_DEFAULT_PRICES)
  const [guestPrices, setGuestPrices] = useState<Record<number, number>>(GUEST_PRICES)
  const [shotPrices, setShotPrices] = useState<Record<number, number>>(SHOT_PRICES)

  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{ discount_type: string, discount_value: number, code: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")

  // Calculations
  const basePrice = planPrices[plan] || PLAN_DEFAULT_PRICES[plan] || 0
  const guestAddonPrice = guestPrices[guests] || 0
  const shotAddonPrice = shotPrices[shots] || 0
  let totalPrice = basePrice + guestAddonPrice + shotAddonPrice
  let discountAmount = 0
  
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      discountAmount = totalPrice * (appliedCoupon.discount_value / 100)
    } else {
      discountAmount = appliedCoupon.discount_value
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
            const mapped: Record<string, number> = {}
            result.data.forEach((p: any) => {
              mapped[p.id] = p.price_inr
            })
            setPlanPrices(prev => ({ ...prev, ...mapped }))
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
      // 1. Create Razorpay order on server
      const orderRes = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: plan,
          guest_boost: guests,
          shots_boost: shots,
          coupon_code: appliedCoupon?.code
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
              const verifyError = await verifyRes.json()
              throw new Error(verifyError.error || "Payment verification failed")
            }

            toast({
              title: "Payment Successful",
              description: `You have successfully subscribed to ${PLAN_NAMES[plan]}!`,
            })

            // Redirect to dashboard with success query
            router.push("/dashboard?subscribed=success")
          } catch (err: any) {
            setError(err.message || "Failed to verify signature")
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
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
                <CardTitle className="text-xl font-bold text-slate-900">Review your subscription</CardTitle>
                <CardDescription className="text-slate-500 text-sm">
                  Complete payment to activate limits and features.
                </CardDescription>
              </CardHeader>

              <div className="space-y-4">
                {/* Plan Base */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800">{PLAN_NAMES[plan]}</span>
                    <p className="text-xs text-slate-400">Base monthly plan features</p>
                  </div>
                  <span className="font-bold text-slate-800">₹{basePrice}</span>
                </div>

                {/* Guest Boost */}
                {guests > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800">Guest Quota Boost</span>
                      <p className="text-xs text-slate-400">+{guests} guests invite limit</p>
                    </div>
                    <span className="font-bold text-slate-800">₹{guestAddonPrice}</span>
                  </div>
                )}

                {/* Shots Boost */}
                {shots > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800">Shots Quota Boost</span>
                      <p className="text-xs text-slate-400">+{shots} shots limit per guest</p>
                    </div>
                    <span className="font-bold text-slate-800">₹{shotAddonPrice}</span>
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
                  <span className="text-sm font-bold text-emerald-600">-₹{Math.floor(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-6 pt-2 border-t border-slate-100/50">
                <span className="text-base font-medium text-slate-650">Total Price (INR)</span>
                <span className="text-3xl font-extrabold text-slate-900">₹{Math.floor(totalPrice)}</span>
              </div>

              {error && (
                <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={handlePayment}
                disabled={initiating}
                className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold py-6 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.2)] flex items-center justify-center gap-2 border-none"
              >
                {initiating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>Pay with Razorpay</span>
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
