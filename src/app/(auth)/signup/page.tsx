"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, Eye, EyeOff, Check, ArrowRight, ShieldCheck, Sparkles, HelpCircle } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { useAuth } from "@/lib/hooks"

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

export default function SignupPage() {
  const [step, setStep] = useState(1) // 1: Choose Plan, 2: Account Details
  const [selectedPlan, setSelectedPlan] = useState("free")
  const [guestBoost, setGuestBoost] = useState(0)
  const [shotBoost, setShotBoost] = useState(0)
  const [showAddOns, setShowAddOns] = useState(true)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { signUp, signInWithGoogle } = useAuth()

  const activePlanDetails = PLANS_DATA.find((p) => p.id === selectedPlan) || PLANS_DATA[0]
  
  // Calculate pricing
  const basePrice = activePlanDetails.price
  const guestAddOnPrice = GUEST_BOOSTS.find((b) => b.value === guestBoost)?.price || 0
  const shotAddOnPrice = SHOT_BOOSTS.find((b) => b.value === shotBoost)?.price || 0
  const totalPrice = basePrice + guestAddOnPrice + shotAddOnPrice

  const handleNextStep = () => {
    setStep(2)
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

    // 1. Register Auth + Create Organization
    const { error: signUpError } = await signUp(email, password, fullName, orgName)

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

  if (step === 1) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Snapsy
              </span>
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Choose Your Perfect Plan
            </h1>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              Select a tier that matches your event size. Instantly collect photos, boost limits, and enable premium features.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {PLANS_DATA.map((plan) => {
              const isSelected = selectedPlan === plan.id
              return (
                <div
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlan(plan.id)
                    // Reset boosts if Free plan is selected
                    if (plan.id === "free") {
                      setGuestBoost(0)
                      setShotBoost(0)
                    }
                  }}
                  className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? "bg-white border-2 border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.1)]"
                      : "bg-white border border-slate-200 hover:border-slate-355 hover:shadow-md hover:scale-[1.01]"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 right-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {plan.badge}
                    </span>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="mt-2 text-xs text-slate-500 min-h-[32px]">{plan.description}</p>
                    <div className="mt-4 flex items-baseline text-slate-900">
                      <span className="text-4xl font-extrabold tracking-tight">₹{plan.price}</span>
                      <span className="ml-1 text-sm font-semibold text-slate-500">/{plan.period}</span>
                    </div>

                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-slate-650 text-muted-foreground">
                          <Check className="h-4 w-4 text-orange-500 shrink-0 mr-2 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                        isSelected
                          ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)] border-none"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-none"
                      }`}
                    >
                      {isSelected ? "Selected" : `Choose ${plan.name}`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add-ons Panel */}
          {selectedPlan !== "free" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 max-w-4xl mx-auto shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-orange-500 animate-pulse" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Customize Limits with Add-Ons
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddOns(!showAddOns)}
                  className="text-sm text-orange-500 hover:underline"
                >
                  {showAddOns ? "Hide add-ons" : "Show add-ons"}
                </button>
              </div>

              {showAddOns && (
                <div className="space-y-6">
                  {/* Guest Limit Boost */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <span>🚀 Boost Guest Limit</span>
                      <span className="text-xs text-slate-400 font-normal">(Base: {activePlanDetails.features[0]})</span>
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {GUEST_BOOSTS.map((boost) => (
                        <button
                          key={boost.value}
                          type="button"
                          onClick={() => setGuestBoost(boost.value)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                            guestBoost === boost.value
                              ? "bg-orange-500/10 border-orange-500 text-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.05)]"
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
                      <span className="text-xs text-slate-400 font-normal">(Base: {activePlanDetails.features[1]})</span>
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {SHOT_BOOSTS.map((boost) => (
                        <button
                          key={boost.value}
                          type="button"
                          onClick={() => setShotBoost(boost.value)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                            shotBoost === boost.value
                              ? "bg-orange-500/10 border-orange-500 text-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.05)]"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-355 hover:bg-slate-50"
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
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 max-w-4xl mx-auto gap-4 shadow-sm">
            <div className="text-center sm:text-left">
              <span className="text-xs text-slate-500 uppercase tracking-widest">Total Price</span>
              <div className="flex items-baseline gap-1.5 justify-center sm:justify-start">
                <span className="text-3xl font-extrabold text-slate-900">₹{totalPrice}</span>
                <span className="text-sm text-slate-500">
                  {selectedPlan === "free" ? "forever" : "per event"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
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
              onClick={handleNextStep}
              className="w-full sm:w-auto bg-orange-500 text-white hover:bg-orange-600 font-bold px-8 py-6 rounded-xl flex items-center justify-center gap-2 text-base shadow-[0_0_12px_rgba(249,115,22,0.2)] border-none"
            >
              <span>Continue to Registration</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-400 py-6 mt-8">
          © {new Date().getFullYear()} Snapsy Inc. All rights reserved.
        </footer>
      </div>
    )
  }

  // Step 2: Sign Up Details Form
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md bg-white border-slate-200 shadow-lg">
        <CardHeader className="text-center space-y-1">
          <Link href="/signup" onClick={() => setStep(1)} className="inline-flex items-center gap-2 mb-2 text-slate-500 hover:text-slate-700 text-xs mr-auto">
            <span>← Change Plan</span>
          </Link>
          <CardTitle className="text-2xl font-bold text-slate-900">Create your account</CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Sign up for the <strong className="text-orange-500">{activePlanDetails.name}</strong> plan (₹{totalPrice})
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-700">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white border-slate-200 text-slate-900 focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgName" className="text-slate-700">Studio / Organization Name</Label>
              <Input
                id="orgName"
                type="text"
                placeholder="My Photography Studio"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white border-slate-200 text-slate-900 focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-white border-slate-200 text-slate-900 focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10 bg-white border-slate-200 text-slate-900 focus:border-orange-500"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold py-5 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.2)] border-none"
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
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-200 text-slate-750 hover:bg-slate-50 bg-white hover:text-slate-900"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign up with Google
            </Button>

            <p className="text-sm text-slate-500 text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-orange-500 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}