import { PublicNav } from "@/lib/components/layout/public-nav"
import { PublicFooter } from "@/lib/components/layout/public-footer"
import { Card } from "@/lib/components/ui/card"

export const metadata = { title: "Features" }

const groups = [
  { title: "Collect", items: ["QR code uploads", "Camera capture (mobile)", "Bulk drag-and-drop", "Email-to-gallery"] },
  { title: "Organize", items: ["Multiple galleries per event", "AI face clustering", "Auto-tag moments", "Slideshow & live wall"] },
  { title: "Share", items: ["Public gallery link", "Password & expiry", "Watermarking", "Custom domain"] },
  { title: "Operate", items: ["Team roles (owner/admin/member/viewer)", "Audit logs", "Storage usage dashboard", "CSV export"] },
]

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Everything you need to run a modern photo event</h1>
          <p className="mt-3 text-muted-foreground">Built for weddings, conferences, school events, and corporate launches.</p>
        </section>
        <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.title} className="p-6">
              <h2 className="text-xl font-medium">{g.title}</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {g.items.map((i) => <li key={i}>· {i}</li>)}
              </ul>
            </Card>
          ))}
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
