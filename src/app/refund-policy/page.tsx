import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

export const metadata = { title: "Refund Policy" }

export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dark text-ink">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="font-playfair font-light text-4xl text-ink mb-6">Refund Policy</h1>
        <p className="text-ink-secondary leading-relaxed mb-4">We want you to be happy. If you're not, email <a href="mailto:hello@snapsy.app" className="text-mauve hover:underline">hello@snapsy.app</a> within 7 days of your purchase and we'll refund you in full — no questions asked.</p>
        <h2 className="text-xl font-bold text-ink mt-10 mb-3">Eligibility</h2>
        <p className="text-ink-secondary leading-relaxed mb-4">Refunds apply to new purchases. Subscription renewals can be cancelled at any time to stop future charges, but prior charges are non-refundable beyond the 7-day window.</p>
        <h2 className="text-xl font-bold text-ink mt-10 mb-3">Processing</h2>
        <p className="text-ink-secondary leading-relaxed mb-4">Refunds are issued to the original payment method within 5–10 business days.</p>
      </main>
      <PublicFooter />
    </div>
  )
}
