"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Switch } from "@/lib/components/ui/switch"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Save, Shield, Key, Eye, Mail } from "lucide-react"
import { updatePlatformSettings } from "@/app/actions/admin-settings"

export function SettingsClient({ initialSettings }: { initialSettings: any }) {
  // Feature Flags state
  const flags = initialSettings?.feature_flags || {}
  const [paymentsEnabled, setPaymentsEnabled] = useState(flags.payments_enabled ?? true)
  const [aiSearchEnabled, setAiSearchEnabled] = useState(flags.ai_search_enabled ?? true)
  const [liveWallEnabled, setLiveWallEnabled] = useState(flags.live_wall_enabled ?? true)
  const [watermarkEnabled, setWatermarkEnabled] = useState(flags.watermark_enabled ?? false)
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(flags.white_label_enabled ?? false)

  // API Configs
  const keys = initialSettings?.integration_keys || {}
  const [razorpayKey, setRazorpayKey] = useState(keys.razorpay_key || "")
  const [resendKey, setResendKey] = useState(keys.resend_key || "")
  const [showKeys, setShowKeys] = useState(false)

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

    // Save integration keys
    await updatePlatformSettings("integration_keys", {
      razorpay_key: razorpayKey,
      resend_key: resendKey
    })

    // Save email templates
    await updatePlatformSettings("email_templates", {
      welcome_subject: welcomeSubject,
      notify_subject: notifySubject
    })

    setSaving(false)
    toast({ title: "Settings Saved", description: "Global platform controls and configuration keys have been synced to the database." })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-5xl bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Controls & Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure global variables, toggle feature flags, manage API integrations, and edit templates.</p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Feature Flags */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-bold">
              <Shield className="h-5 w-5 text-violet-650" />
              <span>Global Feature Flags</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs font-semibold leading-relaxed">
              Toggle specific features instantly across all user organizations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-slate-800 text-sm font-bold block">Enable Billing & Paid Plans</Label>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">Require paid checkout redirects for non-free tiers.</p>
              </div>
              <Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-slate-800 text-sm font-bold block">AI Face Search Engine</Label>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">Run facial vectorization embeddings models on new photo uploads.</p>
              </div>
              <Switch checked={aiSearchEnabled} onCheckedChange={setAiSearchEnabled} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-slate-800 text-sm font-bold block">Live Photo Wall Stream</Label>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">Allows Premium organizers to stream a real-time event photo wall.</p>
              </div>
              <Switch checked={liveWallEnabled} onCheckedChange={setLiveWallEnabled} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-slate-800 text-sm font-bold block">Automated Image Watermarking</Label>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">Apply a default Snapsy branding overlay on guest-downloaded files.</p>
              </div>
              <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="space-y-0.5">
                <Label className="text-slate-800 text-sm font-bold block">White Label Branding Options</Label>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">Allows Enterprise/Premium accounts to hide Snapsy footer branding.</p>
              </div>
              <Switch checked={whiteLabelEnabled} onCheckedChange={setWhiteLabelEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* API Credentials */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-bold">
                  <Key className="h-5 w-5 text-violet-650" />
                  <span>Integration Keys</span>
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs font-semibold leading-relaxed">
                  Credentials for Resend email and Razorpay payment gateway APIs.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowKeys(!showKeys)}
                className="text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold"
              >
                <Eye className="h-4 w-4 mr-1.5" />
                <span>{showKeys ? "Hide Keys" : "Reveal Keys"}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Razorpay Key ID</Label>
              <Input
                type={showKeys ? "text" : "password"}
                value={razorpayKey}
                onChange={(e) => setRazorpayKey(e.target.value)}
                placeholder="rzp_test_..."
                className="bg-white border-slate-200 text-slate-800 shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Resend API Key</Label>
              <Input
                type={showKeys ? "text" : "password"}
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                placeholder="re_..."
                className="bg-white border-slate-200 text-slate-800 shadow-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-bold">
              <Mail className="h-5 w-5 text-violet-650" />
              <span>Email Templates Config</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs font-semibold leading-relaxed">
              Customize subject lines and layouts for outbound transaction notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Welcome Email Subject</Label>
              <Input
                value={welcomeSubject}
                onChange={(e) => setWelcomeSubject(e.target.value)}
                className="bg-white border-slate-200 text-slate-800 shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Photo Activity Notification Subject</Label>
              <Input
                value={notifySubject}
                onChange={(e) => setNotifySubject(e.target.value)}
                className="bg-white border-slate-200 text-slate-800 shadow-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-750 text-white font-bold px-8 py-5 rounded-xl flex items-center gap-1.5 shadow-md transition-shadow"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Changes..." : "Save Configuration"}</span>
          </Button>
        </div>
      </form>
    </main>
  )
}
