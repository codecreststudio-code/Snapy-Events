import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

export const metadata = { title: "Privacy Policy" }

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dark text-white">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="font-playfair font-light text-4xl text-white mb-6">Privacy Policy</h1>
        <p className="text-white/70 leading-relaxed mb-4">We collect the minimum data needed to operate Snapsy. We never sell your data.</p>
        <h2 className="text-xl font-bold text-white mt-10 mb-3">What we collect</h2>
        <ul className="list-disc pl-5 space-y-1 text-white/70 leading-relaxed mb-4">
          <li>Account email and name</li>
          <li>Photos and metadata you upload</li>
          <li>Usage analytics (anonymized)</li>
        </ul>
        <h2 className="text-xl font-bold text-white mt-10 mb-3">How we use it</h2>
        <p className="text-white/70 leading-relaxed mb-4">To provide the service, send service emails, and improve product quality. We do not train third-party models on your data.</p>
        <h2 className="text-xl font-bold text-white mt-10 mb-3">Your rights</h2>
        <p className="text-white/70 leading-relaxed mb-4">You can export, correct, or delete your data at any time from your dashboard settings.</p>
        <h2 className="text-xl font-bold text-white mt-10 mb-3">Contact</h2>
        <p className="text-white/70 leading-relaxed mb-4">Privacy questions: <a href="mailto:privacy@snapsy.app" className="text-mauve hover:underline">privacy@snapsy.app</a></p>
      </main>
      <PublicFooter />
    </div>
  )
}
