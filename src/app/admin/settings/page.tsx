"use client"

import { useState } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Switch } from "@/lib/components/ui/switch"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Settings, Save, Shield, Key, Eye, HelpCircle, Mail, Bell, Sparkles } from "lucide-react"

export default function AdminSettingsPage() {
  // Feature Flags state
  const [paymentsEnabled, setPaymentsEnabled] = useState(true)
  const [aiSearchEnabled, setAiSearchEnabled] = useState(true)
  const [liveWallEnabled, setLiveWallEnabled] = useState(true)
  const [watermarkEnabled, setWatermarkEnabled] = useState(false)
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false)

  // API Configs
  const [razorpayKey, setRazorpayKey] = useState("rzp_test_key_abc123")
  const [resendKey, setResendKey] = useState("re_email_key_xyz890")
  const [showKeys, setShowKeys] = useState(false)

  // Mail template preview
  const [welcomeSubject, setWelcomeSubject] = useState("Welcome to Snapsy!")
  const [notifySubject, setNotifySubject] = useState("New guest photo uploads available!")

  const [saving, setSaving] = useState(false)

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast({ title: "Settings Saved", description: "Global platform controls and configuration keys have been updated." })
    }, 600)
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-5xl">
      <PageHeader title="Platform Controls & Settings" description="Configure global variables, toggle feature flags, manage API integrations, and edit templates." />

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Feature Flags */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-orange-500" />
              <span>Global Feature Flags</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Toggle specific features instantly across all user organizations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payments flag */}
            <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
              <div className="space-y-0.5">
                <Label className="text-slate-200">Enable Billing & Paid Plans</Label>
                <p className="text-xs text-slate-500">Require paid checkout redirects for non-free tiers.</p>
              </div>
              <Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} />
            </div>

            {/* AI flag */}
            <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
              <div className="space-y-0.5">
                <Label className="text-slate-200">AI Face Search Engine</Label>
                <p className="text-xs text-slate-500">Run facial vectorization embeddings models on new photo uploads.</p>
              </div>
              <Switch checked={aiSearchEnabled} onCheckedChange={setAiSearchEnabled} />
            </div>

            {/* Live Wall flag */}
            <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
              <div className="space-y-0.5">
                <Label className="text-slate-200">Live Photo Wall Stream</Label>
                <p className="text-xs text-slate-500">Allows Premium organizers to stream a real-time event photo wall.</p>
              </div>
              <Switch checked={liveWallEnabled} onCheckedChange={setLiveWallEnabled} />
            </div>

            {/* Watermark flag */}
            <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
              <div className="space-y-0.5">
                <Label className="text-slate-200">Automated Image Watermarking</Label>
                <p className="text-xs text-slate-500">Apply a default Snapsy branding overlay on guest-downloaded files.</p>
              </div>
              <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
            </div>

            {/* White label flag */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-slate-200">White Label Branding Options</Label>
                <p className="text-xs text-slate-500">Allows Enterprise/Premium accounts to hide Snapsy footer branding.</p>
              </div>
              <Switch checked={whiteLabelEnabled} onCheckedChange={setWhiteLabelEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* API Credentials */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
                  <Key className="h-5 w-5 text-orange-500" />
                  <span>Integration Keys</span>
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Credentials for Resend email and Razorpay payment gateway APIs.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowKeys(!showKeys)}
                className="text-slate-400 hover:text-slate-200"
              >
                <Eye className="h-4 w-4 mr-1.5" />
                <span>{showKeys ? "Hide Keys" : "Reveal Keys"}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-350 text-xs">Razorpay Key ID</Label>
              <Input
                type={showKeys ? "text" : "password"}
                value={razorpayKey}
                onChange={(e) => setRazorpayKey(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-355 text-xs">Resend API Key</Label>
              <Input
                type={showKeys ? "text" : "password"}
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-orange-500" />
              <span>Email Templates Config</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Customize subject lines and layouts for outbound transaction notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-350 text-xs">Welcome Email Subject</Label>
              <Input
                value={welcomeSubject}
                onChange={(e) => setWelcomeSubject(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-355 text-xs">Photo Activity Notification Subject</Label>
              <Input
                value={notifySubject}
                onChange={(e) => setNotifySubject(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold px-8 py-5 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.25)]"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Changes..." : "Save Configuration"}</span>
          </Button>
        </div>
      </form>
    </main>
  )
}
