"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Switch } from "@/lib/components/ui/switch"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import {
  Save,
  Shield,
  Key,
  Mail,
  Activity,
  Settings,
  CheckCircle2,
  XCircle,
  Sparkles
} from "lucide-react"
import { updatePlatformSettings } from "@/app/actions/admin-settings"

export function SettingsClient({
  initialSettings,
  integrationStatus,
}: {
  initialSettings: any
  integrationStatus: { razorpay_configured: boolean; resend_configured: boolean }
}) {
  // Feature Flags state
  const flags = initialSettings?.feature_flags || {}
  const [paymentsEnabled, setPaymentsEnabled] = useState(flags.payments_enabled ?? true)
  const [aiSearchEnabled, setAiSearchEnabled] = useState(flags.ai_search_enabled ?? true)
  const [liveWallEnabled, setLiveWallEnabled] = useState(flags.live_wall_enabled ?? true)
  const [watermarkEnabled, setWatermarkEnabled] = useState(flags.watermark_enabled ?? false)
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(flags.white_label_enabled ?? false)

  // Mail template preview
  const templates = initialSettings?.email_templates || {}
  const [welcomeSubject, setWelcomeSubject] = useState(templates.welcome_subject || "Welcome to Snapsy!")
  const [notifySubject, setNotifySubject] = useState(templates.notify_subject || "New guest photo uploads available!")

  const [saving, setSaving] = useState(false)

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    // Save feature flags
    await updatePlatformSettings("feature_flags", {
      payments_enabled: paymentsEnabled,
      ai_search_enabled: aiSearchEnabled,
      live_wall_enabled: liveWallEnabled,
      watermark_enabled: watermarkEnabled,
      white_label_enabled: whiteLabelEnabled
    })

    // Save email templates
    await updatePlatformSettings("email_templates", {
      welcome_subject: welcomeSubject,
      notify_subject: notifySubject
    })

    setSaving(false)
    toast({ title: "Settings Saved", description: "Feature flags and email templates have been synced to the database." })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-5xl bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-ink">Platform Controls & Settings</h1>
          <p className="text-sm text-ink-secondary mt-1">Configure global variables, toggle feature flags, manage API integrations, and edit templates.</p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Feature Flags */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2 text-base font-bold">
              <Shield className="h-5 w-5 text-mauve" />
              <span>Global Feature Flags</span>
            </CardTitle>
            <CardDescription className="text-ink-tertiary text-xs font-semibold leading-relaxed">
              Toggle specific features instantly across all user organizations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-hairline-dark">
              <div className="space-y-0.5">
                <Label className="text-ink text-sm font-bold block">Enable Billing & Paid Plans</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">Require paid checkout redirects for non-free tiers.</p>
              </div>
              <Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-hairline-dark">
              <div className="space-y-0.5">
                <Label className="text-ink text-sm font-bold block">AI Face Search Engine</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">Run facial vectorization embeddings models on new photo uploads.</p>
              </div>
              <Switch checked={aiSearchEnabled} onCheckedChange={setAiSearchEnabled} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-hairline-dark">
              <div className="space-y-0.5">
                <Label className="text-ink text-sm font-bold block">Live Photo Wall Stream</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">Allows Premium organizers to stream a real-time event photo wall.</p>
              </div>
              <Switch checked={liveWallEnabled} onCheckedChange={setLiveWallEnabled} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-hairline-dark">
              <div className="space-y-0.5">
                <Label className="text-ink text-sm font-bold block">Automated Image Watermarking</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">Apply a default Snapsy branding overlay on guest-downloaded files.</p>
              </div>
              <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5">
                <Label className="text-ink text-sm font-bold block">White Label Branding Options</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">Allows Enterprise/Premium accounts to hide Snapsy footer branding.</p>
              </div>
              <Switch checked={whiteLabelEnabled} onCheckedChange={setWhiteLabelEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* Sample Event Demo Controls */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2 text-base font-bold">
              <Sparkles className="h-5 w-5 text-mauve" />
              <span>Sample Event Experience Controls</span>
            </CardTitle>
            <CardDescription className="text-ink-tertiary text-xs font-semibold leading-relaxed">
              Manage the interactive demo event featured on host dashboards for onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-hairline-dark">
              <div className="space-y-0.5">
                <Label className="text-ink text-sm font-bold block">Enable Onboarding Sample Event</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">Displays the interactive sample event card on user dashboards.</p>
              </div>
              <Switch checked={true} onCheckedChange={() => toast({ title: "Sample Event Enabled", description: "Sample event is active for all new users." })} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5">
                <Label className="text-ink text-sm font-bold block">Default Featured Template</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">Select the default theme for new users.</p>
              </div>
              <select className="rounded-full border border-[#e5dfd0] bg-white px-4 py-1.5 text-xs font-bold text-[#1a1410]">
                <option value="wedding">Snapsy & Events Wedding 💍</option>
                <option value="birthday">Snapsy's Birthday Party 🎂</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* API Credentials */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2 text-base font-bold">
              <Key className="h-5 w-5 text-mauve" />
              <span>Integration Keys</span>
            </CardTitle>
            <CardDescription className="text-ink-tertiary text-xs font-semibold leading-relaxed">
              Credentials for Resend email and Razorpay payment gateway APIs are read from server
              environment variables, not stored here. This panel only shows whether each is configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-hairline-dark">
              <div className="space-y-0.5">
                <Label className="text-ink text-sm font-bold block">Razorpay</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET</p>
              </div>
              {integrationStatus.razorpay_configured ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Configured
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                  <XCircle className="h-4 w-4" /> Not configured
                </span>
              )}
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5">
                <Label className="text-ink text-sm font-bold block">Resend</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">RESEND_API_KEY</p>
              </div>
              {integrationStatus.resend_configured ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4" /> Configured
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                  <XCircle className="h-4 w-4" /> Not configured
                </span>
              )}
            </div>
            <p className="text-xs text-ink-tertiary font-semibold leading-relaxed pt-1">
              To change these, update the environment variables in your hosting provider (e.g. Vercel project settings) and redeploy.
            </p>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2 text-base font-bold">
              <Mail className="h-5 w-5 text-mauve" />
              <span>Email Templates Config</span>
            </CardTitle>
            <CardDescription className="text-ink-tertiary text-xs font-semibold leading-relaxed">
              Customize subject lines and layouts for outbound transaction notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-ink-secondary text-xs font-bold uppercase tracking-wider">Welcome Email Subject</Label>
              <Input
                value={welcomeSubject}
                onChange={(e) => setWelcomeSubject(e.target.value)}
                className="bg-surface-card border-hairline-dark text-ink shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-ink-secondary text-xs font-bold uppercase tracking-wider">Photo Activity Notification Subject</Label>
              <Input
                value={notifySubject}
                onChange={(e) => setNotifySubject(e.target.value)}
                className="bg-surface-card border-hairline-dark text-ink shadow-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-mauve hover:bg-mauve-strong text-[#1a1410] font-bold px-8 py-5 rounded-xl flex items-center gap-1.5 shadow-md transition-shadow"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Changes..." : "Save Configuration"}</span>
          </Button>
        </div>
      </form>
    </main>
  )
}
