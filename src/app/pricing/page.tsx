import Link from "next/link"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { Card } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Check } from "lucide-react"

interface PricingPlan {
  id: string
  name: string
  price: number
  period: string
  description: string
  cta: string
  features: string[]
  popular?: boolean
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
  },
]

export const metadata = { title: "Pricing - Snapsy" }

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      <PublicNavbar />
      
      <main className="flex-1 bg-slate-50">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl text-slate-900">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            Choose the plan that matches your event volume. Upgrade or add limits as needed.
          </p>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-24 md:grid-cols-4 items-stretch">
          {plans.map((p) => (
            <Card
              key={p.id}
              className={`relative flex flex-col justify-between p-8 bg-white border rounded-2xl transition-all duration-300 ${
                p.popular
                  ? "ring-2 ring-orange-500 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)] md:scale-[1.03]"
                  : "border-slate-200 hover:border-slate-350 hover:shadow-md"
              }`}
            >
              <div>
                {p.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-xs font-bold text-white tracking-wide uppercase">
                    Most Popular
                  </span>
                )}

                <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">₹{p.price}</span>
                  <span className="text-slate-500 text-sm">/ {p.period}</span>
                </div>
                <p className="mt-4 text-xs text-slate-500 leading-relaxed min-h-[32px]">
                  {p.description}
                </p>

                <ul className="mt-6 space-y-3.5 border-t border-slate-100 pt-6 text-xs text-slate-650 text-muted-foreground">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Button
                  asChild
                  className={`w-full font-bold py-5 rounded-xl border-none ${
                    p.popular
                      ? "bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_12px_rgba(249,115,22,0.2)]"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  <Link href={`/signup?plan=${p.id}`}>{p.cta}</Link>
                </Button>
              </div>
            </Card>
          ))}
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
