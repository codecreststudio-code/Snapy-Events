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

const PLAN_BASE_PRICES: Record<string, number> = {
  starter: 99,
  standard: 499,
  premium: 1499,
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

  // Calculations
  const basePrice = PLAN_BASE_PRICES[plan] || 99
  const guestAddonPrice = GUEST_PRICES[guests] || 0
  const shotAddonPrice = SHOT_PRICES[shots] || 0
  const totalPrice = basePrice + guestAddonPrice + shotAddonPrice

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
        }),
      })

      if (!orderRes.ok) {
        const errorData = await orderRes.json()
        throw new Error(errorData.error || "Failed to initiate payment")
      }

      const orderData = await orderRes.json()

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
              {/* Total Summary */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-base font-medium text-slate-650">Total Price (INR)</span>
                <span className="text-3xl font-extrabold text-slate-900">₹{totalPrice}</span>
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
