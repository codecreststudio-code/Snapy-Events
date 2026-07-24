"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Globe,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  X,
  GripVertical,
  Tag,
  Heart,
  Link2,
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { updatePlatformSettings } from "@/app/actions/admin-settings"

// ─── Social platform definitions ────────────────────────────────────────────
const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage", icon: FacebookIcon },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle", icon: InstagramIcon },
  { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/yourhandle", icon: TwitterIcon },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourcompany", icon: LinkedInIcon },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel", icon: YouTubeIcon },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourhandle", icon: TikTokIcon },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/919876543210", icon: WhatsAppIcon },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/yourgroup", icon: TelegramIcon },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/yourprofile", icon: PinterestIcon },
  { key: "snapchat", label: "Snapchat", placeholder: "https://snapchat.com/add/yourhandle", icon: SnapchatIcon },
] as const

type SocialLinks = Record<string, string>
type FooterCredits = { built_by: string; built_by_url: string; powered_by: string }
type CustomTag = { label: string; url: string }

const DEFAULT_SOCIAL: SocialLinks = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.key, ""]))
const DEFAULT_CREDITS: FooterCredits = { built_by: "CodeCrest_Studio", built_by_url: "https://codecreststudio.vercel.app/", powered_by: "Snapsy Events" }

export default function SiteBrandingPage() {
  const [activeTab, setActiveTab] = useState<"social" | "credits" | "tags">("social")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  // Data
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(DEFAULT_SOCIAL)
  const [credits, setCredits] = useState<FooterCredits>(DEFAULT_CREDITS)
  const [customTags, setCustomTags] = useState<CustomTag[]>([])

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/site-branding")
      if (res.ok) {
        const json = await res.json()
        setSocialLinks({ ...DEFAULT_SOCIAL, ...(json.social_links ?? {}) })
        setCredits({ ...DEFAULT_CREDITS, ...(json.footer_credits ?? {}) })
        setCustomTags(json.custom_tags ?? [])
      }
    } catch (_) { }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save all 3 keys
      const [r1, r2, r3] = await Promise.all([
        updatePlatformSettings("social_links", socialLinks),
        updatePlatformSettings("footer_credits", credits),
        updatePlatformSettings("custom_tags", customTags),
      ])
      if (r1.success && r2.success && r3.success) {
        showToast("success", "Site branding saved successfully!")
      } else {
        showToast("error", r1.error || r2.error || r3.error || "Save failed")
      }
    } catch (e) {
      showToast("error", "Failed to save settings")
    }
    setSaving(false)
  }

  // Custom tags helpers
  const addTag = () => setCustomTags((prev) => [...prev, { label: "", url: "" }])
  const removeTag = (i: number) => setCustomTags((prev) => prev.filter((_, idx) => idx !== i))
  const updateTag = (i: number, field: "label" | "url", value: string) => {
    setCustomTags((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))
  }
  const moveTag = (from: number, to: number) => {
    if (to < 0 || to >= customTags.length) return
    setCustomTags((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy
    })
  }

  const filledCount = SOCIAL_PLATFORMS.filter((p) => socialLinks[p.key]?.trim()).length

  const tabs = [
    { id: "social" as const, label: "Social Links", count: filledCount },
    { id: "credits" as const, label: "Footer Credits", count: null },
    { id: "tags" as const, label: "Custom Tags", count: customTags.length },
  ]

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-6 left-1/2 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
              }`}
          >
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-playfair font-light text-ink">Site Branding</h1>
            <p className="text-sm text-ink-secondary mt-1">
              Manage social links, footer credits, and custom tags displayed on your public site.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl border border-hairline-dark bg-surface-card text-ink-secondary hover:text-mauve hover:border-mauve/30 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-xl bg-mauve text-[#1a1410] hover:bg-mauve-strong gap-2 font-semibold"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save All"}
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-hairline-dark mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id
                ? "border-mauve text-mauve font-bold"
                : "border-transparent text-ink-secondary hover:text-ink"
                }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 text-[10px] bg-mauve/10 text-mauve rounded-full px-2 py-0.5 font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-surface-card animate-pulse border border-hairline-dark" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Tab 1: Social Links ─────────────────────────────── */}
            {activeTab === "social" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-hairline-dark flex items-center justify-between">
                    <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                      <Globe className="h-4 w-4 text-mauve" />
                      Social Media Profiles
                    </h2>
                    <span className="text-xs text-ink-tertiary">{filledCount} of {SOCIAL_PLATFORMS.length} configured</span>
                  </div>
                  <div className="divide-y divide-hairline-dark">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const Icon = platform.icon
                      const value = socialLinks[platform.key] || ""
                      const isFilled = value.trim().length > 0
                      return (
                        <div key={platform.key} className="flex items-center gap-4 px-6 py-4 hover:bg-mauve/5 transition-colors">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isFilled ? "bg-mauve/10" : "bg-ink/5"}`}>
                            <Icon className={`h-5 w-5 ${isFilled ? "text-mauve" : "text-ink-tertiary"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <label className="text-xs font-bold text-ink block mb-1">{platform.label}</label>
                            <input
                              type="url"
                              value={value}
                              onChange={(e) => setSocialLinks((prev) => ({ ...prev, [platform.key]: e.target.value }))}
                              placeholder={platform.placeholder}
                              className="w-full rounded-lg border border-hairline-dark bg-surface-dark px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-mauve/30 focus:border-transparent transition-all"
                            />
                          </div>
                          {isFilled && (
                            <div className="flex items-center gap-1 shrink-0">
                              <a href={value} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-mauve/10 text-ink-tertiary hover:text-mauve transition-colors">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => setSocialLinks((prev) => ({ ...prev, [platform.key]: "" }))}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-ink-tertiary hover:text-red-400 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Tab 2: Footer Credits ───────────────────────────── */}
            {activeTab === "credits" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm p-6">
                  <h2 className="text-sm font-bold text-ink flex items-center gap-2 mb-6">
                    <Heart className="h-4 w-4 text-mauve" />
                    Footer Attribution
                  </h2>
                  <div className="space-y-5">
                    {/* Built By */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ink block">Built With - 💖</label>
                      <input
                        type="text"
                        value={credits.built_by}
                        onChange={(e) => setCredits((prev) => ({ ...prev, built_by: e.target.value }))}
                        placeholder="e.g. CodeCrest_Studio"
                        className="w-full rounded-xl border border-hairline-dark bg-surface-dark px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-mauve/30 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ink block">Built By — URL</label>
                      <input
                        type="url"
                        value={credits.built_by_url}
                        onChange={(e) => setCredits((prev) => ({ ...prev, built_by_url: e.target.value }))}
                        placeholder="https://codecreststudio.vercel.app/"
                        className="w-full rounded-xl border border-hairline-dark bg-surface-dark px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-mauve/30 transition-all"
                      />
                    </div>
                    {/* Powered By */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-ink block">Powered By</label>
                      <input
                        type="text"
                        value={credits.powered_by}
                        onChange={(e) => setCredits((prev) => ({ ...prev, powered_by: e.target.value }))}
                        placeholder="e.g. Snapsy Events"
                        className="w-full rounded-xl border border-hairline-dark bg-surface-dark px-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-mauve/30 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm p-6">
                  <h3 className="text-xs font-bold text-ink-secondary uppercase tracking-widest mb-4">Live Preview</h3>
                  <div className="bg-[#000000] rounded-xl p-6 text-center">
                    <p className="text-xs text-ink-secondary font-light">
                      &copy; {new Date().getFullYear()} {credits.powered_by || "Snapsy Events"}. All rights reserved.
                    </p>
                    {credits.built_by && (
                      <p className="text-[10px] text-ink-tertiary mt-2">
                        Built with <span className="text-red-400">♥</span> by{" "}
                        {credits.built_by_url ? (
                          <a href={credits.built_by_url} target="_blank" rel="noopener noreferrer" className="text-mauve hover:text-mauve-strong transition-colors underline underline-offset-2">
                            {credits.built_by}
                          </a>
                        ) : (
                          <span className="text-mauve">{credits.built_by}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Tab 3: Custom Tags ──────────────────────────────── */}
            {activeTab === "tags" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-hairline-dark flex items-center justify-between">
                    <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                      <Tag className="h-4 w-4 text-mauve" />
                      Custom Footer Tags
                    </h2>
                    <Button
                      onClick={addTag}
                      variant="outline"
                      className="rounded-xl border-hairline-dark text-ink-secondary hover:text-mauve hover:border-mauve/30 gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Tag
                    </Button>
                  </div>

                  {customTags.length === 0 ? (
                    <div className="py-16 text-center">
                      <Tag className="h-10 w-10 text-ink-tertiary mx-auto mb-3" />
                      <p className="text-ink-tertiary text-sm">No custom tags yet</p>
                      <button onClick={addTag} className="mt-3 inline-flex items-center gap-1 text-xs text-mauve font-semibold hover:text-mauve-strong">
                        Add your first tag <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-hairline-dark">
                      {customTags.map((tag, i) => (
                        <div key={i} className="flex items-center gap-3 px-6 py-4 hover:bg-mauve/5 transition-colors group">
                          {/* Drag handle */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              onClick={() => moveTag(i, i - 1)}
                              disabled={i === 0}
                              className="p-0.5 text-ink-tertiary hover:text-ink disabled:opacity-20 transition-colors"
                              title="Move up"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 12 12"><path d="M6 3L2 7h8L6 3z" fill="currentColor" /></svg>
                            </button>
                            <button
                              onClick={() => moveTag(i, i + 1)}
                              disabled={i === customTags.length - 1}
                              className="p-0.5 text-ink-tertiary hover:text-ink disabled:opacity-20 transition-colors"
                              title="Move down"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 12 12"><path d="M6 9l4-4H2l4 4z" fill="currentColor" /></svg>
                            </button>
                          </div>

                          {/* Tag label */}
                          <div className="flex-1 min-w-0">
                            <label className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block mb-1">Label</label>
                            <input
                              type="text"
                              value={tag.label}
                              onChange={(e) => updateTag(i, "label", e.target.value)}
                              placeholder="e.g. Made in India 🇮🇳"
                              className="w-full rounded-lg border border-hairline-dark bg-surface-dark px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-mauve/30 transition-all"
                            />
                          </div>

                          {/* Tag URL */}
                          <div className="flex-1 min-w-0">
                            <label className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block mb-1">
                              URL <span className="font-normal">(optional)</span>
                            </label>
                            <div className="relative">
                              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-tertiary" />
                              <input
                                type="url"
                                value={tag.url}
                                onChange={(e) => updateTag(i, "url", e.target.value)}
                                placeholder="https://..."
                                className="w-full rounded-lg border border-hairline-dark bg-surface-dark pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-mauve/30 transition-all"
                              />
                            </div>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => removeTag(i)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-ink-tertiary hover:text-red-400 transition-colors shrink-0 mt-4"
                            title="Remove tag"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview */}
                {customTags.filter((t) => t.label.trim()).length > 0 && (
                  <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm p-6">
                    <h3 className="text-xs font-bold text-ink-secondary uppercase tracking-widest mb-4">Preview</h3>
                    <div className="bg-[#000000] rounded-xl p-6">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {customTags.filter((t) => t.label.trim()).map((tag, i) =>
                          tag.url ? (
                            <a
                              key={i}
                              href={tag.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-hairline-dark bg-mauve/5 px-3 py-1 text-[10px] font-semibold text-ink-secondary hover:text-mauve hover:border-mauve/30 transition-all"
                            >
                              {tag.label}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-full border border-hairline-dark bg-mauve/5 px-3 py-1 text-[10px] font-semibold text-ink-secondary"
                            >
                              {tag.label}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Social SVG Icons ─────────────────────────────────────────────────────────
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  )
}

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function YouTubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  )
}

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  )
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  )
}

function TelegramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21.2 4.4L2.4 10.8c-.6.2-.6 1.1.1 1.3l4.7 1.5 1.8 5.6c.2.5.8.7 1.2.4l2.5-2 4.9 3.6c.5.4 1.2.1 1.3-.5L21.8 5.3c.2-.7-.5-1.2-1-.9z" />
      <path d="M8 13.5l9-6.5" />
    </svg>
  )
}

function PinterestIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="11" x2="10" y2="20" />
      <circle cx="12" cy="10" r="8" />
    </svg>
  )
}

function SnapchatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2C8.13 2 5 5.58 5 10c0 1.3.5 2.7 1 3.5-.5.5-1.5.5-2 1s0 1.5.5 1.5c.7 0 1.2 0 1.5.5s.5 1 .5 1.5c0 .3 0 .5-.5 1s-1 1-.5 1.5S7 21 8.5 21c1 0 2-.5 3.5-.5s2.5.5 3.5.5c1.5 0 1.5-.5 2-1s-.5-1-.5-1.5 0-1.2.5-1.5.5-1 .5-1.5 1.5-.5 1.5-.5.5-1.5-.5-1.5-1.5-.5-2-1c.5-.8 1-2.2 1-3.5 0-4.42-3.13-8-7-8z" />
    </svg>
  )
}
