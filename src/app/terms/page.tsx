import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

export const metadata = {
  title: "Terms of Service | Snapsy Events",
  description: "Terms of Service and legal agreement for Snapsy Events photo sharing and AI face indexing platform.",
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dark text-ink font-sans selection:bg-mauve/30">
      <PublicNavbar />
      
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-20">
        <div className="space-y-4 border-b border-hairline-dark pb-8 mb-10 text-left">
          <span className="text-xs font-bold text-mauve uppercase tracking-widest">LEGAL & COMPLIANCE</span>
          <h1 className="font-playfair font-light text-4xl sm:text-5xl text-ink">Terms of Service</h1>
          <p className="text-xs text-ink-secondary font-light">Last updated: July 2026</p>
        </div>

        <div className="space-y-8 text-left text-sm text-ink-secondary font-light leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">1. Agreement to Terms</h2>
            <p>
              By accessing or using the Snapsy Events platform, web application, QR code services, or AI face search tools, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use Snapsy Events.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">2. Event Hosting & Account Responsibilities</h2>
            <p>
              When creating an event capsule or host account on Snapsy Events, you are responsible for maintaining the security of your credentials and controlling event access settings (such as guest passcodes or moderation queues). You retain ownership of all photo content uploaded to your event galleries.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">3. Strict No-Refund Policy</h2>
            <div className="p-4 rounded-2xl bg-mauve/10 border border-mauve/20 text-ink space-y-2">
              <p className="font-semibold text-mauve">Important Notice Regarding Payments:</p>
              <p className="text-xs text-ink-secondary">
                All purchases, event plan upgrades, guest capacity boosts, and feature add-ons on Snapsy Events are final and strictly non-refundable once activated. Because Snapsy Events immediately provisions digital server infrastructure, storage allocations, and real-time AI processing capabilities upon payment, we do not offer refunds, credits, or proration for any reason.
              </p>
            </div>
            <p>
              We encourage all hosts to test our platform using our free tier before upgrading to paid event packages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">4. Acceptable Content & Guest Upload Rules</h2>
            <p>
              Guests and hosts may only upload media that they have rights to share. Uploading illegal, defamatory, abusive, sexually explicit, or copyright-infringing content is strictly prohibited. Snapsy Events reserves the right to immediately remove non-compliant content and suspend accounts violating these guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">5. AI Face Recognition & Privacy Controls</h2>
            <p>
              Snapsy Events provides optional AI face indexing to help guests find photos they appear in. Facial vector embeddings are generated solely for indexing your specific event photos and are never sold, shared with third-party advertisers, or used to train external models.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">6. Data Retention & Permanent Deletion</h2>
            <p>
              Event archives remain accessible according to your selected plan duration. You or your guests may request permanent self-service data deletion at any time via our <a href="/delete-data" className="text-mauve underline">Data Deletion Portal</a>. Upon request, all associated photos and facial embeddings are permanently purged within 48 hours.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink font-playfair">7. Limitation of Liability</h2>
            <p>
              Snapsy Events is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, Snapsy Events shall not be liable for any indirect, incidental, or consequential damages resulting from platform downtime or loss of media uploads.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
