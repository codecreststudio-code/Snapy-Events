import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

export const metadata = {
  title: "Privacy Policy | Snapsy Events",
  description: "Privacy Policy for Snapsy Events. Learn how we handle guest photos, facial embeddings, and data security.",
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dark text-ink font-sans selection:bg-mauve/30">
      <PublicNavbar />
      
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-20">
        <div className="space-y-4 border-b border-hairline-dark pb-8 mb-10 text-left">
          <span className="text-xs font-bold text-mauve uppercase tracking-widest">PRIVACY & PROTECTION</span>
          <h1 className="font-playfair font-light text-4xl sm:text-5xl text-ink">Privacy Policy</h1>
          <p className="text-xs text-ink-secondary font-light">Last updated: July 2026</p>
        </div>

        <div className="space-y-8 text-left text-sm text-ink-secondary font-light leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">1. Overview & Data Ownership</h2>
            <p>
              Snapsy Events ("Snapsy", "we", "our") respects your privacy and data ownership. We provide an app-free photo sharing platform where event hosts collect photos and memories from guests via QR codes and instant AI face matching. We do not sell your personal data or uploaded photos to any third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-ink">Account & Event Metadata:</strong> Email address, host name, event titles, event dates, and custom venue branding.</li>
              <li><strong className="text-ink">Uploaded Media Content:</strong> Photos, short video clips, and voice audio notes uploaded by hosts or event guests.</li>
              <li><strong className="text-ink">AI Facial Embeddings:</strong> When AI face search is enabled for an event, mathematical vector embeddings are extracted solely to allow guests to retrieve photos they appear in.</li>
              <li><strong className="text-ink">Technical & Analytics Data:</strong> IP addresses, browser types, and device telemetry used strictly for security monitoring and rate limiting.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">3. How We Use Your Data</h2>
            <p>
              Your data is processed exclusively to deliver your live event galleries, power live venue slideshows, index guest photos using AI face matching, and enable high-resolution event archive downloads. We never train public AI models on your private photos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">4. Facial Recognition Data Processing</h2>
            <p>
              Facial embeddings are generated purely in memory during event photo indexing. They are stored with strict Row-Level Security (RLS) policies scoped strictly to your private event capsule. Guests can delete their face index data or request deletion at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">5. Self-Service Data Deletion (GDPR & CCPA)</h2>
            <p>
              Under GDPR, CCPA, and global privacy standards, hosts and guests have full control to purge their uploaded media and facial vector indexes. You can submit a deletion request anytime via our <a href="/delete-data" className="text-mauve underline font-medium">Data Deletion Request Page</a>. All associated media and vector data will be permanently wiped within 48 hours.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">6. Data Security & Storage</h2>
            <p>
              Media files are encrypted both in transit (TLS 1.3) and at rest (AES-256) using Supabase PostgreSQL databases and enterprise cloud infrastructure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">7. Contact Our Privacy Team</h2>
            <p>
              If you have privacy questions or regulatory inquiries, contact our Data Protection Officer at <a href="mailto:privacy@snapsy.events" className="text-mauve hover:underline font-medium">privacy@snapsy.events</a>.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
