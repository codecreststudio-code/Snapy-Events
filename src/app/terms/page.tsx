import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

export const metadata = { title: "Terms of Service" }

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dark text-ink">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="font-playfair font-light text-4xl text-ink mb-6">Terms of Service</h1>
        <p className="text-ink-secondary leading-relaxed mb-4">By using Snapsy you agree to the following terms. Snapsy provides event photo collection, storage, and sharing services.</p>
        <h2 className="text-xl font-bold text-ink mt-10 mb-3">1. Your account</h2>
        <p className="text-ink-secondary leading-relaxed mb-4">You're responsible for your credentials, the content you upload, and the actions taken by users you invite.</p>
        <h2 className="text-xl font-bold text-ink mt-10 mb-3">2. Acceptable use</h2>
        <p className="text-ink-secondary leading-relaxed mb-4">Don't upload illegal content, infringe IP, or attempt to disrupt the service. We may suspend accounts that violate these rules.</p>
        <h2 className="text-xl font-bold text-ink mt-10 mb-3">3. Payments & refunds</h2>
        <p className="text-ink-secondary leading-relaxed mb-4">Paid plans renew automatically until cancelled. We offer a 7-day refund window — see our refund policy.</p>
        <h2 className="text-xl font-bold text-ink mt-10 mb-3">4. Termination</h2>
        <p className="text-ink-secondary leading-relaxed mb-4">You can delete your account at any time. We may terminate accounts that breach these terms.</p>
        <h2 className="text-xl font-bold text-ink mt-10 mb-3">5. Disclaimers</h2>
        <p className="text-ink-secondary leading-relaxed mb-4">Service is provided "as is" without warranties of any kind. Our liability is limited to fees paid in the prior 12 months.</p>
      </main>
      <PublicFooter />
    </div>
  )
}
