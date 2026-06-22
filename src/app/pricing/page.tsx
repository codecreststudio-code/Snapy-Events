"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Playfair_Display, Inter } from "next/font/google"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { Check, Sparkles, Crown } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { motion } from "framer-motion"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

interface PricingPlan {
  id: string
  name: string
  price: number
  period: string
  description: string
  cta: string
  features: string[]
  popular?: boolean
  bestValue?: boolean
}

const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying out Snapsy",
    cta: "Start free",
    features: ["5 guests limit", "5 shots per guest", "Standard photo reveal", "Basic web gallery"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 99,
    period: "per event",
    description: "For small events and personal use",
    cta: "Choose Starter",
    features: [
      "10 guests limit",
      "10 shots per guest",
      "Custom reveal time",
      "All image filters enabled",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 499,
    period: "per event",
    description: "For growing photographers",
    cta: "Choose Standard",
    features: [
      "50 guests limit",
      "15 shots per guest",
      "AI Face Search matching",
      "Download all photos",
      "Priority customer support",
    ],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 1499,
    period: "per event",
    description: "For professional photographers and large events",
    cta: "Choose Premium",
    features: [
      "100 guests limit",
      "25 shots per guest",
      "Live Photo Wall stream",
      "Print-ready download gallery",
      "WhatsApp notification alerts",
      "24/7 Priority support",
    ],
    bestValue: true,
  },
]

function PricingCard({ plan }: { plan: PricingPlan }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative rounded-3xl border bg-white p-8 flex flex-col justify-between transition-all duration-300 ${
        plan.popular
          ? "border-violet-500 shadow-[0_20px_50px_rgba(139,92,246,0.15)] ring-1 ring-violet-500 md:scale-[1.04] z-10"
          : "border-slate-200 hover:border-slate-350 hover:shadow-xl"
      }`}
    >
      {/* Background Spotlight Glow Wrapper */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        {isHovered && (
          <div
            className="absolute -inset-px transition duration-300 opacity-100"
            style={{
              background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, ${
                plan.popular ? "rgba(139, 92, 246, 0.12)" : "rgba(139, 92, 246, 0.06)"
              }, transparent 80%)`,
            }}
          />
        )}
      </div>

      {/* Badges Container */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-1.5 text-[10px] font-bold text-white tracking-widest uppercase shadow-md flex items-center gap-1.5 z-20">
          <Sparkles className="h-3 w-3" />
          POPULAR
        </div>
      )}

      {plan.bestValue && (
        <div className="absolute -top-4 right-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-[10px] font-bold text-white tracking-widest uppercase shadow-md flex items-center gap-1.5 z-20">
          <Crown className="h-3.5 w-3.5" />
          BEST VALUE
        </div>
      )}

      {/* Plan Header */}
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            <p className="mt-2 text-xs text-slate-450 leading-relaxed font-light min-h-[32px]">
              {plan.description}
            </p>
          </div>
          {plan.popular && (
            <span className="h-8 w-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
              <Sparkles className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-slate-900">₹{plan.price}</span>
          <span className="text-slate-400 text-xs font-light">/ {plan.period}</span>
        </div>

        <ul className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-xs text-slate-600 font-light">
              <Check className={`h-4 w-4 flex-shrink-0 ${plan.popular ? "text-violet-600" : "text-slate-400"}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 pt-4">
        <Link href={`/signup?plan=${plan.id}`}>
          <Button
            className={`w-full font-bold py-5 rounded-full transition-transform active:scale-[0.98] ${
              plan.popular
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 border-none"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 border-none"
            }`}
          >
            {plan.cta}
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

export default function PricingPage() {
  const [plansList, setPlansList] = useState<PricingPlan[]>(plans)

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
              cta: p.id === "free" ? "Start free" : `Choose ${p.name}`,
              features: Array.isArray(p.features) ? p.features : [],
              popular: p.id === "standard",
              bestValue: p.id === "premium",
            }))
            // Add free tier if not returned in API to preserve basic signup
            if (!mapped.find((m: any) => m.id === "free")) {
              mapped.unshift(plans[0])
            }
            setPlansList(mapped)
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic plans:", e)
      }
    }
    fetchPlans()
  }, [])

  return (
    <div className={`flex min-h-screen flex-col bg-white text-slate-900 selection:bg-violet-100 ${inter.className}`}>
      <PublicNavbar />
      
      <main className="flex-1 bg-slate-50/30 overflow-hidden relative py-12 md:py-20">
        {/* Subtle mesh light glow */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-25 blur-3xl">
          <div className="h-[400px] w-[500px] rounded-full bg-gradient-to-tr from-violet-100 via-fuchsia-50 to-pink-50" />
        </div>

        <section className="mx-auto max-w-6xl px-6 py-12 md:py-20 text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-violet-600 bg-violet-50/80 border border-violet-100/50"
          >
            <span>PRICING PLANS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className={`text-4xl font-normal tracking-tight md:text-6xl text-slate-900 leading-tight ${playfair.className}`}
          >
            Simple, transparent <span className="italic font-normal bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">pricing</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-md text-slate-500 max-w-xl mx-auto font-light leading-relaxed"
          >
            Choose the plan that matches your event volume. Upgrade or adjust bounds at any time.
          </motion.p>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {plansList.map((p) => (
              <PricingCard key={p.id} plan={p} />
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
