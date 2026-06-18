import { PublicNav } from "@/lib/components/layout/public-nav"
import { PublicFooter } from "@/lib/components/layout/public-footer"
import { Card } from "@/lib/components/ui/card"
import { ContactForm } from "./contact-form"

export const metadata = { title: "Contact" }

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <h1 className="text-3xl font-semibold tracking-tight">Get in touch</h1>
        <p className="mt-2 text-muted-foreground">We'll get back within 24 hours on business days.</p>
        <Card className="mt-8 p-6">
          <ContactForm />
        </Card>
      </main>
      <PublicFooter />
    </div>
  )
}
