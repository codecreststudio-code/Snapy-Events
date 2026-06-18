import Link from "next/link"
import { PublicNav } from "@/lib/components/layout/public-nav"
import { PublicFooter } from "@/lib/components/layout/public-footer"
import { Card } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Check } from "lucide-react"

const plans = [
  { id: "free", name: "Free", price: 0, period: "forever", cta: "Start free", features: ["1 event", "200 photos", "Basic QR", "Public gallery", "Community support"] },
  { id: "starter", name: "Starter", price: 499, period: "per event", cta: "Choose Starter", features: ["1 event", "2,000 photos", "Custom QR", "Passwords & expiry", "Email support"] },
  { id: "standard", name: "Standard", price: 1499, period: "per event", cta: "Choose Standard", features: ["3 events", "10,000 photos", "AI face search", "Live photo wall", "Watermarking", "Priority support"] },
  { id: "premium", name: "Premium", price: 4999, period: "per event", cta: "Choose Premium", features: ["Unlimited events", "100,000 photos", "White-label", "Custom domain", "Dedicated success manager"] },
] as const

export const metadata = { title: "Pricing" }

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Pricing for every event</h1>
          <p className="mt-3 text-muted-foreground">Start free, upgrade when you're ready. No hidden fees.</p>
        </section>
        <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-4">
          {plans.map((p) => (
            <Card key={p.id} className="flex flex-col p-6">
              <h3 className="text-lg font-medium">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold">₹{p.price.toLocaleString("en-IN")}</span>
                <span className="text-sm text-muted-foreground">/ {p.period}</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> {f}</li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={p.id === "standard" ? "default" : "outline"}>
                <Link href={`/signup?plan=${p.id}`}>{p.cta}</Link>
              </Button>
            </Card>
          ))}
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
