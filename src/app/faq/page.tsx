import { PublicNav } from "@/lib/components/layout/public-nav"
import { PublicFooter } from "@/lib/components/layout/public-footer"
import { Card } from "@/lib/components/ui/card"

export const metadata = { title: "Frequently asked questions" }

const faqs = [
  { q: "Do my guests need to sign up?", a: "No. Guests scan your QR code and upload instantly — no accounts, no friction." },
  { q: "How does AI face search work?", a: "We detect faces on upload, build embeddings, and let guests find every photo they're in by uploading a selfie." },
  { q: "Can I password-protect a gallery?", a: "Yes. Each event supports a per-gallery access code and an expiry date." },
  { q: "What if I want my own domain?", a: "On Premium you can connect a custom domain (e.g. photos.yourbrand.com) with a verified SSL cert." },
  { q: "How do refunds work?", a: "We offer a 7-day no-questions-asked refund on every paid plan. See our refund policy." },
  { q: "Where is data stored?", a: "On Supabase Postgres in the region you select. All transfers are TLS 1.3; storage is encrypted at rest." },
]

export default function FAQPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <h1 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h1>
        <div className="mt-8 space-y-4">
          {faqs.map((f) => (
            <Card key={f.q} className="p-5">
              <h2 className="text-base font-medium">{f.q}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </Card>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
