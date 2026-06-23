import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

export const metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="prose prose-neutral dark:prose-invert mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1>Privacy Policy</h1>
        <p>We collect the minimum data needed to operate Snapsy. We never sell your data.</p>
        <h2>What we collect</h2>
        <ul><li>Account email and name</li><li>Photos and metadata you upload</li><li>Usage analytics (anonymized)</li></ul>
        <h2>How we use it</h2>
        <p>To provide the service, send service emails, and improve product quality. We do not train third-party models on your data.</p>
        <h2>Your rights</h2>
        <p>You can export, correct, or delete your data at any time from your dashboard settings.</p>
        <h2>Contact</h2>
        <p>Privacy questions: privacy@snapsy.app</p>
      </main>
      <PublicFooter />
    </div>
  )
}
