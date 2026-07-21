"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Check, ArrowRight, ShieldCheck, Sparkles, HelpCircle, Crown } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { useAuth } from "@/lib/hooks"
import { Logo } from "@/lib/components/layout/logo"
import { motion } from "framer-motion"
import { Playfair_Display, Inter } from "next/font/google"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

const PLANS_DATA = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying out Snapsy",
    features: [
      "5 guests limit",
      "5 shots per guest",
      "Standard photo reveal",
      "Basic web gallery",
    ],
    badge: null,
  },
  {
    id: "starter",
    name: "Starter",
    price: 99,
    period: "per event",
    description: "For small events and personal use",
    features: [
      "10 guests limit",
      "10 shots per guest",
      "Custom reveal time",
      "All image filters enabled",
    ],
    badge: null,
  },
  {
    id: "standard",
    name: "Standard",
    price: 499,
    period: "per event",
    description: "For growing photographers",
    features: [
      "50 guests limit",
      "15 shots per guest",
      "AI Face Search matching",
      "Download all photos",
      "Priority customer support",
    ],
    badge: "Popular",
  },
  {
    id: "premium",
    name: "Premium",
    price: 1499,
    period: "per event",
    description: "For professional photographers and large events",
    features: [
      "100 guests limit",
      "25 shots per guest",
      "Live Photo Wall stream",
      "Print-ready download gallery",
      "WhatsApp notification alerts",
      "24/7 Priority support",
    ],
    badge: "Best Value",
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

interface PricingPlan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: string[]
  badge?: string | null
}

function SignupPricingCard({
  plan,
  isSelected,
  onClick,
}: {
  plan: PricingPlan
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

  const isPopular = plan.id === "standard"
  const isPremium = plan.id === "premium"

  let selectedClasses = "border-hairline-dark hover:border-mauve/40 hover:shadow-xl"
  if (isSelected) {
    if (plan.id === "free") {
      selectedClasses = "border-white/30 ring-2 ring-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
    } else if (plan.id === "starter") {
      selectedClasses = "border-mauve ring-2 ring-mauve/15 shadow-[0_15px_40px_rgba(178,141,174,0.15)]"
    } else if (plan.id === "standard") {
      selectedClasses = "border-mauve ring-2 ring-mauve/25 shadow-[0_20px_50px_rgba(178,141,174,0.2)] md:scale-[1.03] z-10"
    } else if (plan.id === "premium") {
      selectedClasses = "border-mauve-strong ring-2 ring-mauve-strong/25 shadow-[0_20px_50px_rgba(164,104,160,0.2)] md:scale-[1.03] z-10"
    }
  } else {
    if (isPopular) {
      selectedClasses = "border-hairline-dark hover:border-mauve/50 hover:shadow-lg"
    } else if (isPremium) {
      selectedClasses = "border-hairline-dark hover:border-mauve-strong/50 hover:shadow-lg"
    }
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative rounded-3xl border bg-surface-card p-6 cursor-pointer flex flex-col justify-between transition-all duration-300 ${selectedClasses}`}
    >
      {/* Background Spotlight Glow Wrapper */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        {isHovered && (
          <div
            className="absolute -inset-px transition duration-300 opacity-100"
            style={{
              background: `radial-gradient(320px circle at ${coords.x}px ${coords.y}px, ${
                isPopular
                  ? "rgba(178, 141, 174, 0.12)"
                  : isPremium
                  ? "rgba(164, 104, 160, 0.12)"
                  : plan.id === "starter"
                  ? "rgba(178, 141, 174, 0.08)"
                  : "rgba(255, 255, 255, 0.05)"
              }, transparent 80%)`,
            }}
          />
        )}
      </div>

      {/* Badges Container */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-mauve px-4 py-1.5 text-[9px] font-bold text-[#141110] tracking-widest uppercase shadow-md flex items-center gap-1 z-20">
          <Sparkles className="h-3 w-3" />
          POPULAR
        </div>
      )}
      {isPremium && (
        <div className="absolute -top-3 right-4 rounded-full bg-mauve-strong px-3 py-1.5 text-[9px] font-bold text-[#141110] tracking-widest uppercase shadow-md flex items-center gap-1 z-20">
          <Crown className="h-3.5 w-3.5" />
          BEST VALUE
        </div>
      )}

      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            <p className="mt-1.5 text-xs text-white/50 leading-relaxed font-light min-h-[32px]">
              {plan.description}
            </p>
          </div>
          {isPopular && (
            <span className="h-7 w-7 rounded-full bg-mauve/10 flex items-center justify-center text-mauve shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          )}
          {isPremium && (
            <span className="h-7 w-7 rounded-full bg-mauve-strong/10 flex items-center justify-center text-mauve-strong shrink-0">
              <Crown className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-white">₹{plan.price}</span>
          <span className="text-white/40 text-xs font-light">/ {plan.period}</span>
        </div>

        <ul className="mt-5 space-y-3 border-t border-hairline-dark pt-5">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-white/60 font-light">
              <Check
                className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                  isSelected
                    ? plan.id === "free"
                      ? "text-white"
                      : plan.id === "starter"
                      ? "text-mauve"
                      : isPopular
                      ? "text-mauve"
                      : "text-mauve-strong"
                    : "text-white/30"
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
                ? "bg-white/10 text-white shadow-md"
                : plan.id === "starter"
                ? "bg-mauve text-[#141110] shadow-md shadow-mauve/10"
                : isPopular
                ? "bg-mauve text-[#141110] shadow-lg shadow-mauve/20"
                : "bg-mauve-strong text-[#141110] shadow-lg shadow-mauve-strong/20"
              : "bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          {isSelected ? "Selected" : `Choose ${plan.name}`}
        </button>
      </div>
    </motion.div>
  )
}

export default function SignupPage() {
  const [step, setStep] = useState(1) // 1: Choose Plan, 2: Account Details
  const [selectedPlan, setSelectedPlan] = useState("free")
  const [guestBoost, setGuestBoost] = useState(0)
  const [shotBoost, setShotBoost] = useState(0)
  const [showAddOns, setShowAddOns] = useState(true)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { signUp, signInWithGoogle, user } = useAuth()
  const [plansList, setPlansList] = useState<PricingPlan[]>(PLANS_DATA)
  const [guestBoostsList, setGuestBoostsList] = useState(GUEST_BOOSTS)
  const [shotBoostsList, setShotBoostsList] = useState(SHOT_BOOSTS)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/payments/plans")
        if (res.ok) {
          const result = await res.json()
          if (result.success && Array.isArray(result.data)) {
            const mapped = result.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.price_inr,
              period: p.billing_interval === "monthly" ? "month" : "per event",
              description: p.description || "",
              features: Array.isArray(p.features) ? p.features : [],
              badge: p.id === "standard" ? "Popular" : p.id === "premium" ? "Best Value" : null,
            }))
            // Add free tier if not returned in API
            if (!mapped.find((m: any) => m.id === "free")) {
              mapped.unshift(PLANS_DATA[0])
            }
            const ordered = ["free", "starter", "standard", "premium"]
            const sortedMapped = mapped.sort((a: any, b: any) => ordered.indexOf(a.id) - ordered.indexOf(b.id))
            setPlansList(sortedMapped)

            // Sync URL param selection with dynamic plans list
            if (typeof window !== "undefined") {
              const params = new URLSearchParams(window.location.search)
              const planParam = params.get("plan")
              if (planParam && sortedMapped.some((p: any) => p.id === planParam)) {
                setSelectedPlan(planParam)
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic plans for signup:", e)
      }
    }

    const fetchAddons = async () => {
      try {
        const res = await fetch("/api/payments/addons")
        if (res.ok) {
          const result = await res.json()
          if (result.guest_boosts) setGuestBoostsList(result.guest_boosts)
          if (result.shot_boosts) setShotBoostsList(result.shot_boosts)
        }
      } catch (e) {
        console.error("Failed to fetch dynamic addon pricing:", e)
      }
    }

    fetchPlans()
    fetchAddons()

    // Immediate local URL check for zero-latency default select on mount
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const planParam = params.get("plan")
      if (planParam && PLANS_DATA.some((p) => p.id === planParam)) {
        setSelectedPlan(planParam)
      }
    }
  }, [])

  const activePlanDetails = plansList.find((p) => p.id === selectedPlan) || PLANS_DATA.find((p) => p.id === selectedPlan) || PLANS_DATA[0]
  
  // Calculate pricing
  const basePrice = activePlanDetails.price
  const guestAddOnPrice = guestBoostsList.find((b) => b.value === guestBoost)?.price || 0
  const shotAddOnPrice = shotBoostsList.find((b) => b.value === shotBoost)?.price || 0
  const totalPrice = basePrice + guestAddOnPrice + shotAddOnPrice

  const handleNextStep = () => {
    setStep(2)
  }

  const handleContinue = () => {
    if (user) {
      if (selectedPlan === "free") {
        router.push("/dashboard?welcome=true")
      } else {
        router.push(`/checkout?plan=${selectedPlan}&guests=${guestBoost}&shots=${shotBoost}`)
      }
    } else {
      setStep(2)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError("")
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // 1. Register Auth
    const { error: signUpError } = await signUp(email, password, fullName)

    if (signUpError) {
      setError(signUpError.message)
      setIsLoading(false)
      return
    }

    // 2. Fetch created user/org context or route accordingly
    if (selectedPlan === "free") {
      // Free plan registers and routes to dashboard instantly
      router.push("/dashboard?welcome=true")
    } else {
      // Paid plan redirect to secure Razorpay checkout page
      router.push(
        `/checkout?plan=${selectedPlan}&guests=${guestBoost}&shots=${shotBoost}`
      )
    }
  }

  const getAccentColor = () => {
    if (selectedPlan === "premium") return {
      text: "text-mauve-strong",
      bg: "bg-mauve-strong/10",
      border: "border-mauve-strong/30",
      badge: "bg-mauve-strong",
      hover: "hover:border-mauve-strong/50",
      buttonActive: "bg-mauve-strong/10 border-mauve-strong text-mauve-strong shadow-[0_0_10px_rgba(164,104,160,0.15)]",
      icon: "text-mauve-strong"
    }
    // free, starter, and standard all share the primary mauve accent
    return {
      text: "text-mauve",
      bg: "bg-mauve/10",
      border: "border-mauve/30",
      badge: "bg-mauve",
      hover: "hover:border-mauve/50",
      buttonActive: "bg-mauve/10 border-mauve text-mauve shadow-[0_0_10px_rgba(178,141,174,0.15)]",
      icon: "text-mauve"
    }
  }

  const getContinueButtonClass = () => {
    const base = "w-full sm:w-auto font-bold px-8 py-6 rounded-2xl flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98] border-none text-[#141110] "
    if (selectedPlan === "premium") {
      return base + "bg-mauve-strong hover:scale-[1.01] shadow-lg shadow-mauve-strong/20"
    }
    return base + "bg-mauve hover:bg-mauve-strong hover:scale-[1.01] shadow-lg shadow-mauve/10"
  }

  const getInputFocusClass = () => {
    return "focus:border-mauve focus:ring-mauve"
  }

  const baseGuestLimitStr = activePlanDetails.features.find(f => f.toLowerCase().includes("guest")) || "10 guests limit"
  const baseShotLimitStr = activePlanDetails.features.find(f => f.toLowerCase().includes("shot")) || "10 shots per guest"
  const accent = getAccentColor()

  if (step === 1) {
    return (
      <div className={`min-h-screen bg-surface-dark text-white py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-between selection:bg-mauve/30 ${inter.className}`}>
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center justify-center mb-4">
              <Logo />
            </Link>
            <h1 className={`text-4xl font-light tracking-tight sm:text-5xl text-white font-playfair ${playfair.className}`}>
              Choose Your Perfect Plan
            </h1>
            <p className="mt-4 text-md text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
              Select a tier that matches your event size. Instantly collect photos, boost limits, and enable premium features.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 items-stretch">
            {plansList.map((plan) => (
              <SignupPricingCard
                key={plan.id}
                plan={plan}
                isSelected={selectedPlan === plan.id}
                onClick={() => {
                  setSelectedPlan(plan.id)
                  // Reset boosts if Free plan is selected
                  if (plan.id === "free") {
                    setGuestBoost(0)
                    setShotBoost(0)
                  }
                }}
              />
            ))}
          </div>

          {/* Add-ons Panel */}
          {selectedPlan !== "free" && (
            <div className="glass-panel border border-hairline-dark rounded-3xl p-8 mb-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-hairline-dark pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <Sparkles className={`h-5 w-5 ${accent.icon} animate-pulse`} />
                  <h3 className="text-lg font-bold text-white">
                    Customize Limits with Add-Ons
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddOns(!showAddOns)}
                  className={`text-sm font-semibold ${accent.text} hover:opacity-80`}
                >
                  {showAddOns ? "Hide add-ons" : "Show add-ons"}
                </button>
              </div>

              {showAddOns && (
                <div className="space-y-8">
                  {/* Guest Limit Boost */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-white/70 flex items-center gap-2">
                      <span>🚀 Boost Guest Limit</span>
                      <span className="text-xs text-white/40 font-normal">(Base: {baseGuestLimitStr})</span>
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
                              : "bg-white/5 border-hairline-dark text-white/50 hover:border-mauve/30 hover:bg-white/10"
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
                    <Label className="text-sm font-semibold text-white/70 flex items-center gap-2">
                      <span>📸 Boost Shots Per Guest</span>
                      <span className="text-xs text-white/40 font-normal">(Base: {baseShotLimitStr})</span>
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
                              : "bg-white/5 border-hairline-dark text-white/50 hover:border-mauve/30 hover:bg-white/10"
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
                </div>
              )}
            </div>
          )}

          {/* Pricing Overview & Next button */}
          <div className="flex flex-col sm:flex-row items-center justify-between glass-panel border border-hairline-dark rounded-3xl p-8 max-w-4xl mx-auto gap-6">
            <div className="text-center sm:text-left">
              <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Total Price</span>
              <div className="flex items-baseline gap-1.5 justify-center sm:justify-start mt-1">
                <span className="text-3xl font-extrabold text-white">₹{totalPrice}</span>
                <span className="text-sm text-white/50 font-light">
                  {selectedPlan === "free" ? "forever" : "per event"}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-1.5 font-light">
                {selectedPlan !== "free" && (
                  <>
                    Base ₹{basePrice}
                    {guestBoost > 0 && ` + Guest Boost ₹${guestAddOnPrice}`}
                    {shotBoost > 0 && ` + Shots Boost ₹${shotAddOnPrice}`}
                  </>
                )}
              </p>
            </div>
            <Button
              onClick={handleContinue}
              className={getContinueButtonClass()}
            >
              <span>
                {user
                  ? selectedPlan === "free"
                    ? "Go to Dashboard"
                    : "Proceed to Payment"
                  : "Continue to Registration"}
              </span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <footer className="text-center text-xs text-white/40 py-6 mt-12">
          © {new Date().getFullYear()} Snapsy Inc. All rights reserved.
        </footer>
      </div>
    )
  }

  // Step 2: Sign Up Details Form
  return (
    <div className={`min-h-screen bg-surface-dark text-white flex items-center justify-center px-4 py-12 selection:bg-mauve/30 ${inter.className}`}>
      <Card className="glass-panel w-full max-w-md border-hairline-dark shadow-xl rounded-3xl overflow-hidden p-2">
        <CardHeader className="text-center space-y-1 pt-6 px-6">
          <Link href="/signup" onClick={() => setStep(1)} className={`inline-flex items-center gap-1.5 mb-3 ${accent.text} hover:opacity-80 text-xs font-semibold mr-auto`}>
            <span>← Change Plan</span>
          </Link>
          <CardTitle className="text-2xl font-playfair text-white font-light">Create your account</CardTitle>
          <CardDescription className="text-white/50 text-sm font-light">
            Sign up for the <strong className={`font-semibold ${accent.text}`}>{activePlanDetails.name}</strong> plan (₹{totalPrice})
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 px-6">
            {error && (
              <div role="alert" className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white/70 text-xs font-semibold">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
                className={`bg-white/5 border-hairline-dark text-white placeholder:text-white/40 rounded-xl py-5 focus-visible:ring-0 ${getInputFocusClass()}`}
              />
            </div>


            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70 text-xs font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className={`bg-white/5 border-hairline-dark text-white placeholder:text-white/40 rounded-xl py-5 focus-visible:ring-0 ${getInputFocusClass()}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70 text-xs font-semibold">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className={`pr-10 bg-white/5 border-hairline-dark text-white placeholder:text-white/40 rounded-xl py-5 focus-visible:ring-0 ${getInputFocusClass()}`}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-white/40 font-light">
                Must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pb-6 px-6">
            <Button
              type="submit"
              className={`w-full font-bold py-6 rounded-2xl transition-all active:scale-[0.98] border-none text-[#141110] hover:scale-[1.01] active:scale-[0.99] ${
                selectedPlan === "premium"
                  ? "bg-mauve-strong shadow-lg shadow-mauve-strong/20"
                  : "bg-mauve hover:bg-mauve-strong shadow-lg shadow-mauve/10"
              }`}
              disabled={isLoading}
            >
              {isLoading
                ? "Creating account..."
                : selectedPlan === "free"
                ? "Create Free Account"
                : `Create Account & Pay ₹${totalPrice}`}
            </Button>

            <div className="relative w-full my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
                <span className="bg-surface-card px-3 text-white/40">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-white/15 text-white hover:bg-white/5 rounded-2xl py-6"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign up with Google
            </Button>

            <p className="text-xs text-white/40 text-center font-light pt-2">
              Already have an account?{" "}
              <Link href="/login" className={`hover:underline font-semibold ${accent.text}`}>
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}