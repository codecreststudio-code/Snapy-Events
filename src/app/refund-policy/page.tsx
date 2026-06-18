import { PublicNav } from "@/lib/components/layout/public-nav"
import { PublicFooter } from "@/lib/components/layout/public-footer"

export const metadata = { title: "Refund Policy" }

export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="prose prose-neutral dark:prose-invert mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1>Refund Policy</h1>
        <p>We want you to be happy. If you're not, email <a href="mailto:hello@snapsy.app">hello@snapsy.app</a> within 7 days of your purchase and we'll refund you in full — no questions asked.</p>
        <h2>Eligibility</h2>
        <p>Refunds apply to new purchases. Subscription renewals can be cancelled at any time to stop future charges, but prior charges are non-refundable beyond the 7-day window.</p>
        <h2>Processing</h2>
        <p>Refunds are issued to the original payment method within 5–10 business days.</p>
      </main>
      <PublicFooter />
    </div>
  )
}
