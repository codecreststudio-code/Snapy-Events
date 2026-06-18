import { PublicNav } from "@/lib/components/layout/public-nav"
import { PublicFooter } from "@/lib/components/layout/public-footer"

export const metadata = { title: "Terms of Service" }

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="prose prose-neutral dark:prose-invert mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1>Terms of Service</h1>
        <p>By using Snapsy you agree to the following terms. Snapsy provides event photo collection, storage, and sharing services.</p>
        <h2>1. Your account</h2>
        <p>You're responsible for your credentials, the content you upload, and the actions taken by users you invite.</p>
        <h2>2. Acceptable use</h2>
        <p>Don't upload illegal content, infringe IP, or attempt to disrupt the service. We may suspend accounts that violate these rules.</p>
        <h2>3. Payments & refunds</h2>
        <p>Paid plans renew automatically until cancelled. We offer a 7-day refund window — see our refund policy.</p>
        <h2>4. Termination</h2>
        <p>You can delete your account at any time. We may terminate accounts that breach these terms.</p>
        <h2>5. Disclaimers</h2>
        <p>Service is provided "as is" without warranties of any kind. Our liability is limited to fees paid in the prior 12 months.</p>
      </main>
      <PublicFooter />
    </div>
  )
}
