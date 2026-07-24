"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Playfair_Display, Inter } from "next/font/google"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { Check, Sparkles, Crown } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { motion } from "framer-motion"

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

interface PricingPlan {
  id: string
  name: string
  price: number
  priceUsd: number
  period: string
  description: string
  cta: string
  features: string[]
  popular?: boolean
  bestValue?: boolean
}

// Emergency fallback only — rendered solely if the live /api/payments/plans
// fetch itself fails (network error, 500, etc.), never as the initial/
// default display. Previously this array was used to seed plansList's
// initial state AND shown immediately on every page load until the fetch
// resolved, which is exactly the same stale-data risk fixed on the wizard's
// Step 6 (new-event-form.tsx): if Admin renames/reprices/removes a plan,
// this public marketing page would keep advertising the old numbers to
// every visitor until the fetch happened to finish, and would silently show
// them again on any fetch failure. Now the page starts in a loading state
// and only ever shows real fetched plans, falling back to this hardcoded
// list (clearly marked as such) only if the live fetch genuinely errors.
const FALLBACK_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Basic",
    price: 0,
    priceUsd: 0,
    period: "per event",
    description: "Perfect for trying out Snapsy",
    cta: "Start free",
    features: [
      "Up to 5 guests limit",
      "30 shots per guest",
      "Custom reveal countdown",
      "Guestbook & photo reactions",
    ],
  },
  {
    id: "starter",
    name: "Standard",
    price: 499,
    priceUsd: 6,
    period: "per event",
    description: "For small events and personal use",
    cta: "Choose Standard",
    features: [
      "Up to 20 guests limit",
      "36 shots per guest",
      "AI Face Search matching",
      "Custom reveal countdown",
      "All camera filters enabled",
      "Voice notes & audio greetings",
      "Guestbook & photo reactions",
    ],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 2999,
    priceUsd: 36,
    period: "per event",
    description: "For professional photographers and large events",
    cta: "Choose Premium",
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
    bestValue: true,
  },
]

function PricingCard({ plan }: { plan: PricingPlan }) {
  const { symbol, getPrice } = useCurrency()
  const displayPrice = getPrice(plan.price, plan.priceUsd)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative rounded-3xl border bg-surface-card p-8 cursor-pointer flex flex-col justify-between transition-shadow duration-300 ${
        plan.popular
          ? "border-mauve ring-2 ring-mauve/20 shadow-[0_20px_50px_rgba(184,146,90,0.15)] md:scale-105 z-10"
          : "border-hairline-dark hover:border-mauve/40 hover:shadow-xl"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-surface-dark border border-mauve/25 px-4 py-1 text-[10px] font-bold text-mauve-strong tracking-widest uppercase shadow-md flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-mauve" />
          POPULAR
        </div>
      )}
      {plan.bestValue && (
        <div className="absolute -top-3 right-4 rounded-full bg-ink px-3 py-1 text-[10px] font-bold text-surface-dark tracking-widest uppercase shadow-md flex items-center gap-1">
          <Crown className="h-3 w-3" />
          BEST VALUE
        </div>
      )}

      <div>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
            <p className="mt-2 text-xs text-ink-secondary leading-relaxed font-light min-h-[32px]">
              {plan.description}
            </p>
          </div>
          {plan.popular && (
            <span className="h-8 w-8 rounded-full bg-mauve/10 flex items-center justify-center text-mauve shrink-0">
              <Sparkles className="h-4 w-4" />
            </span>
          )}
          {plan.bestValue && (
            <span className="h-8 w-8 rounded-full bg-ink/10 flex items-center justify-center text-ink shrink-0">
              <Crown className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-ink">{symbol}{displayPrice}</span>
          <span className="text-ink-secondary text-xs font-light">/ {plan.period}</span>
        </div>

        <ul className="mt-6 space-y-4 border-t border-hairline-dark pt-6">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-xs text-ink-secondary font-light">
              <Check className={`h-4 w-4 flex-shrink-0 ${plan.popular ? "text-mauve" : "text-ink-tertiary"}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 pt-4">
        <Link href={`/signup?plan=${plan.id}`}>
          <Button
            className={`w-full font-bold py-5 rounded-full transition-all active:scale-[0.99] ${
              plan.popular || plan.bestValue
                ? "bg-mauve hover:bg-mauve-strong text-[#1a1410] shadow-lg shadow-mauve/10 border-none hover:scale-[1.01]"
                : "border border-hairline-dark text-ink hover:bg-mauve/5"
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
  const [plansList, setPlansList] = useState<PricingPlan[]>(FALLBACK_PLANS)
  const [plansLoading, setPlansLoading] = useState(false)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/payments/plans")
        if (res.ok) {
          const result = await res.json()
          if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            const mapped = result.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.price_inr,
              priceUsd: p.price_usd || Math.round(p.price_inr / 80) || 1,
              period: p.billing_interval === "monthly" ? "month" : "per event",
              description: p.description || "",
              cta: p.id === "free" ? "Start free" : `Choose ${p.name}`,
              features: Array.isArray(p.features) ? p.features : [],
              popular: p.is_popular || false,
              bestValue: p.best_value || false,
            }))
            mapped.sort((a: any, b: any) => (a.price ?? 0) - (b.price ?? 0))
            setPlansList(mapped)
            return
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic plans, using fallback:", e)
      }
    }
    fetchPlans()
  }, [])

  return (
    <div className={`flex min-h-screen flex-col bg-surface-dark text-ink selection:bg-mauve/30 ${inter.className}`}>
      <PublicNavbar />

      <main className="flex-1 bg-surface-dark overflow-hidden relative py-12 md:py-20">
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-15 blur-3xl">
          <div className="h-[400px] w-[500px] rounded-full bg-gradient-to-tr from-mauve via-mauve-strong to-mauve" />
        </div>

        <section className="mx-auto max-w-6xl px-6 py-12 md:py-20 text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-mauve bg-mauve/10 border border-mauve/20"
          >
            <span>PRICING PLANS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className={`text-4xl font-light tracking-tight md:text-6xl text-ink leading-tight ${playfair.className}`}
          >
            Simple, transparent <span className="italic font-light bg-gradient-to-r from-mauve to-mauve-strong bg-clip-text text-transparent">pricing</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-md text-ink-secondary max-w-xl mx-auto font-light leading-relaxed"
          >
            Choose the plan that matches your event volume. Upgrade or adjust bounds at any time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="pt-2"
          >
            <CurrencyToggle />
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          {plansLoading ? (
            <div className="p-16 text-center text-ink-tertiary text-sm font-semibold">Loading plans…</div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto items-stretch">
              {plansList.map((p) => (
                <PricingCard key={p.id} plan={p} />
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
