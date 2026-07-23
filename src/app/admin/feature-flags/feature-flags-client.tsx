"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Switch } from "@/lib/components/ui/switch"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Sliders, Save } from "lucide-react"
import { updatePlatformSettings } from "@/app/actions/admin-settings"

type FeatureFlags = {
  payments_enabled: boolean
  ai_search_enabled: boolean
  live_wall_enabled: boolean
  watermark_enabled: boolean
  white_label_enabled: boolean
  premium_templates_enabled: boolean
  beta_photobooks_enabled: boolean
  advanced_analytics_enabled: boolean
}

export function FeatureFlagsClient({ initialFlags }: { initialFlags: Partial<FeatureFlags> }) {
  // These flags are persisted to the same `platform_settings.feature_flags`
  // row used by /admin/settings — three of the toggles below (ai_search_enabled,
  // live_wall_enabled, white_label_enabled) are shared with that page, so
  // whichever screen an admin uses last wins. We always merge on save so this
  // page never clobbers payments_enabled/watermark_enabled managed elsewhere.
  const [flags, setFlags] = useState<FeatureFlags>({
    payments_enabled: initialFlags.payments_enabled ?? true,
    ai_search_enabled: initialFlags.ai_search_enabled ?? true,
    live_wall_enabled: initialFlags.live_wall_enabled ?? true,
    watermark_enabled: initialFlags.watermark_enabled ?? false,
    white_label_enabled: initialFlags.white_label_enabled ?? false,
    premium_templates_enabled: initialFlags.premium_templates_enabled ?? true,
    beta_photobooks_enabled: initialFlags.beta_photobooks_enabled ?? false,
    advanced_analytics_enabled: initialFlags.advanced_analytics_enabled ?? true,
  })
  const [saving, setSaving] = useState(false)

  const toggleFlag = (key: keyof FeatureFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updatePlatformSettings("feature_flags", flags)
      if (!result.success) {
        toast({ title: "Save Failed", description: result.error || "Could not update feature flags.", variant: "destructive" })
        return
      }
      toast({ title: "Configuration Updated", description: "Global feature flags successfully committed to production settings." })
    } finally {
      setSaving(false)
    }
  }

  const items: { key: keyof FeatureFlags; label: string; desc: string }[] = [
    { key: "ai_search_enabled", label: "AI Facial Clustering Engine", desc: "Embed guest profile images and cluster faces inside gallery grids. Shared with Settings → AI Face Search Engine." },
    { key: "premium_templates_enabled", label: "Premium Email & WhatsApp Layouts", desc: "Render curated HTML formats for event invites and updates." },
    { key: "beta_photobooks_enabled", label: "Beta Digital Photobook Creator", desc: "Allow users to design print-ready photobooks directly from collections." },
    { key: "live_wall_enabled", label: "Realtime Live Photo Wall Stream", desc: "Stream photos to projectors in real time during corporate events. Shared with Settings → Live Photo Wall Stream." },
    { key: "white_label_enabled", label: "Custom Domain White-Labeling", desc: "Map photographers portfolios to customized domains without Snapsy footers. Shared with Settings → White Label Branding." },
    { key: "advanced_analytics_enabled", label: "Geographic Visitor Map Queries", desc: "Load geographic region lookups in organizations dashboards." },
  ]

  return (
    <main className="px-6 py-8 space-y-6 max-w-4xl bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-ink">Feature Flags control</h1>
          <p className="text-sm text-ink-secondary mt-1">Activate beta tests, toggle heavy algorithms execution, or configure customization layers.</p>
        </div>
      </div>

      <Card className="bg-surface-card border-hairline-dark shadow-sm">
        <CardHeader className="border-b border-hairline-dark">
          <CardTitle className="text-ink flex items-center gap-2 text-base font-bold">
            <Sliders className="h-5 w-5 text-mauve" />
            <span>Active Release Toggles</span>
          </CardTitle>
          <CardDescription className="text-ink-tertiary text-xs font-semibold leading-relaxed">
            Changes are persisted to the platform_settings table immediately on save.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-hairline-dark p-6">
          {items.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="space-y-1 pr-6">
                <Label className="text-ink font-bold text-sm block">{flag.label}</Label>
                <p className="text-xs text-ink-tertiary font-semibold leading-relaxed">{flag.desc}</p>
              </div>
              <Switch checked={flags[flag.key]} onCheckedChange={() => toggleFlag(flag.key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-bold h-11 px-8 rounded-xl shadow-md"
        >
          <Save className="h-4.5 w-4.5 mr-1.5" />
          <span>{saving ? "Saving Changes..." : "Save Feature Flags"}</span>
        </Button>
      </div>
    </main>
  )
}
