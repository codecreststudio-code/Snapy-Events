"use client"

import { useState } from "react"
import { ShieldAlert, CheckCircle, ArrowRight } from "lucide-react"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { Button } from "@/lib/components/ui/button"

export default function DeleteDataPage() {
  const [email, setEmail] = useState("")
  const [eventId, setEventId] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Data Deletion Request",
          email,
          subject: `GDPR/CCPA Data Deletion Request - Event ID: ${eventId || "General Account"}`,
          message: `User requested complete deletion of photos and account data.\nReason: ${reason || "Not specified"}`,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
      }
    } catch (_) {}
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-dark text-ink font-sans selection:bg-mauve/30">
      <PublicNavbar />

      <main className="flex-1 py-20 px-6">
        <div className="mx-auto max-w-3xl space-y-10">
          
          <div className="text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-mauve/10 text-mauve flex items-center justify-center">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-playfair font-light text-ink">
              Data Deletion Request
            </h1>
            <p className="text-sm text-ink-secondary font-light max-w-lg mx-auto leading-relaxed">
              At Snapsy Events, we take your privacy and data ownership seriously. Submit your request below to remove your photos, facial embeddings, or account data permanently.
            </p>
          </div>

          <div className="bg-surface-card p-8 rounded-3xl border border-hairline-dark shadow-xl">
            {submitted ? (
              <div className="text-center space-y-4 py-8">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-bold text-ink">Request Submitted Successfully</h3>
                <p className="text-xs text-ink-secondary font-light leading-relaxed max-w-md mx-auto">
                  Our privacy compliance team has received your deletion request. All associated photo vectors and account data for <span className="font-semibold text-ink">{email}</span> will be purged within 48 hours in compliance with GDPR and CCPA rules.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink">Your Registered Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-2xl border border-hairline-dark bg-surface-dark px-4 py-3 text-sm text-ink placeholder:text-ink-tertiary focus:border-mauve focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink">Event Code / Subdomain (Optional)</label>
                  <input
                    type="text"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    placeholder="e.g. sarah-wedding or K7XQ9M"
                    className="w-full rounded-2xl border border-hairline-dark bg-surface-dark px-4 py-3 text-sm text-ink placeholder:text-ink-tertiary focus:border-mauve focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink">Reason for Request (Optional)</label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please specify if you want specific photos, AI face embeddings, or your entire account deleted..."
                    className="w-full rounded-2xl border border-hairline-dark bg-surface-dark px-4 py-3 text-sm text-ink placeholder:text-ink-tertiary focus:border-mauve focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold py-6 text-sm shadow-lg disabled:opacity-50"
                  >
                    {loading ? "Submitting Request..." : "Submit Permanent Deletion Request"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="text-center text-xs text-ink-secondary font-light space-y-1">
            <p>For urgent privacy inquiries, you can also contact our Data Protection Officer at privacy@snapsy.events.</p>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
