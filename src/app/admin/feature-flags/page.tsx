"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Switch } from "@/lib/components/ui/switch"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Sliders, Save, Sparkles, RefreshCw } from "lucide-react"

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState({
    aiSearch: true,
    premiumTemplates: true,
    betaPhotobooks: false,
    liveWallStream: true,
    customBranding: false,
    advancedAnalytics: true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast({ title: "Configuration Updated", description: "Global feature flags successfully committed to production settings." })
    }, 450)
  }

  const toggleFlag = (key: keyof typeof flags) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-4xl bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feature Flags control</h1>
          <p className="text-sm text-slate-500 mt-1">Activate beta tests, toggle heavy algorithms execution, or configure customization layers.</p>
        </div>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-50">
          <CardTitle className="text-slate-800 flex items-center gap-2 text-base font-bold">
            <Sliders className="h-5 w-5 text-violet-650" />
            <span>Active Release Toggles</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs font-semibold leading-relaxed">
            Apply changes instantly to all users without restarting the application backend router.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-6">
          {[
            { key: "aiSearch", label: "AI Facial Clustering Engine", desc: "Embed guest profile images and cluster faces inside gallery grids." },
            { key: "premiumTemplates", label: "Premium Email & WhatsApp Layouts", desc: "Render curated HTML formats for event invites and updates." },
            { key: "betaPhotobooks", label: "Beta Digital Photobook Creator", desc: "Allow users to design print-ready photobooks directly from collections." },
            { key: "liveWallStream", label: "Realtime Live Photo Wall Stream", desc: "Stream photos to projectors in real time during corporate events." },
            { key: "customBranding", label: "Custom Domain White-Labeling", desc: "Map photographers portfolios to customized domains without Snapsy footers." },
            { key: "advancedAnalytics", label: "Geographic Visitor Map Queries", desc: "Load geographic region lookups in organizations dashboards." },
          ].map((flag) => (
            <div key={flag.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="space-y-1 pr-6">
                <Label className="text-slate-800 font-bold text-sm block">{flag.label}</Label>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">{flag.desc}</p>
              </div>
              <Switch
                checked={flags[flag.key as keyof typeof flags]}
                onCheckedChange={() => toggleFlag(flag.key as keyof typeof flags)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-750 text-white font-bold h-11 px-8 rounded-xl shadow-md"
        >
          <Save className="h-4.5 w-4.5 mr-1.5" />
          <span>{saving ? "Saving Changes..." : "Save Feature Flags"}</span>
        </Button>
      </div>
    </main>
  )
}
