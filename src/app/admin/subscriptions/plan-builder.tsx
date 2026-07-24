"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Plus, Edit2, Trash2, Loader2, Save, X, Sparkles, SlidersHorizontal, Code, Check, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { Plan } from "@/lib/types"

const FEATURE_CATALOG = [
  { key: "ai_face_search", label: "AI Face Search Matching", icon: "🤖", desc: "Allows guests to find personal photos via selfie vector search" },
  { key: "live_photo_wall", label: "Live Photo Wall Stream", icon: "📺", desc: "Real-time slideshow & projector presentation mode for event TVs" },
  { key: "custom_reveal", label: "Custom Reveal Countdown", icon: "⏳", desc: "Lock media capsules until a designated event unlock time" },
  { key: "all_filters", label: "All Image Filters Enabled", icon: "🎨", desc: "Unlock 8+ camera filters (Golden Hour, Vintage, B&W, Cyberpunk)" },
  { key: "video_uploads", label: "Video Uploads", icon: "🎥", desc: "Allow guests to upload short video clips" },
  { key: "voice_notes", label: "Voice Notes & Audio", icon: "🎙️", desc: "Record audio greetings and voice wishes" },
  { key: "guest_reactions", label: "Guest Reactions & Guestbook", icon: "❤️", desc: "Enable comments, likes, and live guestbook posts" },
  { key: "print_ready_downloads", label: "Print-Ready Downloads", icon: "📥", desc: "High-res gallery zip downloads for printing" },
  { key: "whatsapp_alerts", label: "WhatsApp Notification Alerts", icon: "💬", desc: "Send automated guest upload reminders via WhatsApp" },
  { key: "priority_support", label: "24/7 Priority Support", icon: "⚡", desc: "Dedicated fast-track customer support" },
]

export function PlanBuilder() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // Basic Form State
  const [formId, setFormId] = useState("")
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formPriceInr, setFormPriceInr] = useState(0)
  const [formPriceUsd, setFormPriceUsd] = useState(0)
  const [formInterval, setFormInterval] = useState<"event" | "monthly" | "yearly">("event")
  const [formTrial, setFormTrial] = useState(0)
  const [formTheme, setFormTheme] = useState("")
  const [formBestValue, setFormBestValue] = useState(false)
  const [formIsPopular, setFormIsPopular] = useState(false)
  const [formActive, setFormActive] = useState(true)
  
  // Advanced Editor Mode
  const [editorMode, setEditorMode] = useState<"visual" | "json">("visual")
  
  // Structured Quota Limits State
  const [limitGuests, setLimitGuests] = useState<number>(25)
  const [limitShots, setLimitShots] = useState<number>(15)
  const [limitStorageGb, setLimitStorageGb] = useState<number>(10)
  const [limitEvents, setLimitEvents] = useState<number>(1)
  const [limitAiSearches, setLimitAiSearches] = useState<number>(100)
  
  // Structured Feature Toggles State
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    ai_face_search: true,
    live_photo_wall: false,
    custom_reveal: true,
    all_filters: true,
    video_uploads: false,
    voice_notes: false,
    guest_reactions: true,
    print_ready_downloads: false,
    whatsapp_alerts: false,
    priority_support: false,
  })
  
  // Raw JSON & Textarea Backups
  const [formFeatures, setFormFeatures] = useState("")
  const [formLimitsJson, setFormLimitsJson] = useState("{}")

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/subscriptions/plans")
      if (!res.ok) throw new Error("Failed to load plans")
      const data = await res.json()
      setPlans(data.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const startAdd = () => {
    setIsAdding(true)
    setEditingPlan(null)
    setFormId("")
    setFormName("")
    setFormDesc("")
    setFormPriceInr(0)
    setFormPriceUsd(0)
    setFormInterval("event")
    setFormTrial(0)
    setFormTheme("")
    setFormBestValue(false)
    setFormIsPopular(false)
    setFormActive(true)

    // Limits
    setLimitGuests(10)
    setLimitShots(10)
    setLimitStorageGb(5)
    setLimitEvents(1)
    setLimitAiSearches(0)
    
    // Toggles
    setToggles({
      ai_face_search: false,
      live_photo_wall: false,
      custom_reveal: true,
      all_filters: true,
      video_uploads: false,
      voice_notes: false,
      guest_reactions: true,
      print_ready_downloads: false,
      whatsapp_alerts: false,
      priority_support: false,
    })
    
    setFormFeatures("10 guests limit\n10 shots per guest\nCustom reveal time\nAll image filters enabled")
    setFormLimitsJson(JSON.stringify({ guests_limit: 10, shots_limit: 10, storage_limit_gb: 5, events_limit: 1, ai_searches: 0 }, null, 2))
    setEditorMode("visual")
  }

  const startEdit = (p: Plan) => {
    setIsAdding(false)
    setEditingPlan(p)
    setFormId(p.id)
    setFormName(p.name)
    setFormDesc(p.description || "")
    setFormPriceInr(p.price_inr)
    setFormPriceUsd(p.price_usd)
    setFormInterval(p.billing_interval || "event")
    setFormTrial(p.trial_days || 0)
    setFormTheme(p.theme_color || "")
    setFormBestValue(p.best_value || false)
    setFormIsPopular(p.is_popular || false)
    setFormActive(p.is_active)
    
    const lim = p.limits || {}
    setLimitGuests(lim.guests_limit ?? lim.guests ?? 25)
    setLimitShots(lim.shots_limit ?? lim.shots_per_guest ?? lim.shots ?? 15)
    setLimitStorageGb(lim.storage_limit_gb ?? lim.storage ?? 10)
    setLimitEvents(lim.events_limit ?? lim.events ?? 1)
    setLimitAiSearches(lim.ai_searches ?? 100)
    
    const tog: Record<string, boolean> = {}
    FEATURE_CATALOG.forEach(f => {
      tog[f.key] = Boolean(lim[f.key] ?? p.features.some(feat => feat.toLowerCase().includes(f.label.toLowerCase())))
    })
    setToggles(tog)
    
    setFormFeatures(p.features.join("\n"))
    setFormLimitsJson(JSON.stringify(p.limits, null, 2))
    setEditorMode("visual")
  }

  // Auto-generate features bullet points based on visual toggles & limits
  const handleAutoGenerateFeatures = () => {
    const lines: string[] = []
    lines.push(limitGuests === -1 ? "Unlimited guests capacity" : `Up to ${limitGuests} guests limit`)
    lines.push(limitShots === -1 ? "Unlimited shots per guest" : `${limitShots} shots per guest`)
    
    if (toggles.ai_face_search) lines.push("AI Face Search matching")
    if (toggles.live_photo_wall) lines.push("Live Photo Wall stream")
    if (toggles.custom_reveal) lines.push("Custom reveal countdown")
    if (toggles.all_filters) lines.push("All camera filters enabled")
    if (toggles.video_uploads) lines.push("Video uploads support")
    if (toggles.voice_notes) lines.push("Voice notes & audio greetings")
    if (toggles.guest_reactions) lines.push("Guestbook & photo reactions")
    if (toggles.print_ready_downloads) lines.push("Print-ready download gallery")
    if (toggles.whatsapp_alerts) lines.push("WhatsApp notification alerts")
    if (toggles.priority_support) lines.push("24/7 Priority support")
    
    setFormFeatures(lines.join("\n"))
    toast({ title: "Features Generated", description: "Bullet points updated based on toggles & limits." })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setActioning(true)

    let finalLimits: Record<string, any> = {}

    if (editorMode === "visual") {
      finalLimits = {
        guests_limit: limitGuests,
        shots_limit: limitShots,
        storage_limit_gb: limitStorageGb,
        events_limit: limitEvents,
        ai_searches: limitAiSearches,
        ...toggles,
      }
    } else {
      try {
        finalLimits = JSON.parse(formLimitsJson)
      } catch {
        toast({ title: "Invalid JSON", description: "Limits must be a valid JSON object.", variant: "destructive" })
        setActioning(false)
        return
      }
    }

    const payload = {
      id: formId,
      name: formName,
      description: formDesc,
      price_inr: formPriceInr,
      price_usd: formPriceUsd,
      billing_interval: formInterval,
      trial_days: formTrial,
      theme_color: formTheme,
      best_value: formBestValue,
      is_popular: formIsPopular,
      is_active: formActive,
      features: formFeatures.split("\n").map(f => f.trim()).filter(Boolean),
      limits: finalLimits,
    }

    try {
      if (isAdding) {
        const res = await fetch("/api/admin/subscriptions/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to create plan")
      } else {
        const res = await fetch(`/api/admin/subscriptions/plans/${formId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to update plan")
      }
      toast({ title: "Success", description: "Plan saved successfully." })
      setEditingPlan(null)
      setIsAdding(false)
      fetchPlans()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return
    setActioning(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/plans/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete plan")
      toast({ title: "Success", description: "Plan deleted." })
      fetchPlans()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Plan Cards List */}
      <div className="lg:col-span-5 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-ink">Plan Builder</h2>
            <p className="text-xs text-ink-secondary">Configured event plans & subscription tiers</p>
          </div>
          <Button onClick={startAdd} className="h-8 bg-mauve hover:bg-mauve-strong text-[#1a1410] text-xs font-bold gap-1">
            <Plus className="h-3.5 w-3.5" /> New Plan
          </Button>
        </div>
        
        {loading ? (
          <div className="p-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-mauve" /></div>
        ) : plans.length === 0 ? (
          <div className="p-16 border border-dashed border-hairline-dark bg-surface-card text-ink-tertiary text-center rounded-2xl text-xs font-semibold">
            No plans found. Create one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {plans.map(p => (
              <Card key={p.id} className={cn("bg-surface-card border-hairline-dark shadow-sm transition-all hover:border-mauve/30", editingPlan?.id === p.id && "ring-2 ring-mauve/50 border-mauve")}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-ink text-base flex items-center gap-2 flex-wrap">
                        <span className="truncate">{p.name}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-ink/5 text-ink-secondary border border-hairline-dark shrink-0">
                          {p.id}
                        </span>
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", p.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-ink/5 text-ink-secondary border-hairline-dark")}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                        {p.best_value && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-ink text-surface-dark border-ink">Best Value</span>}
                        {p.is_popular && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-surface-dark text-mauve-strong border-mauve/25">Popular</span>}
                        <span className="text-[10px] font-semibold text-ink-secondary">
                          {p.billing_interval === "event" ? "Per Event" : p.billing_interval}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(p)} className="h-7 w-7 p-0 text-ink-secondary hover:bg-mauve/5 rounded-lg"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-ink-secondary font-medium line-clamp-2 min-h-[32px]">{p.description}</p>
                  <div className="mt-4 flex items-end justify-between border-t border-hairline-dark pt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-ink">₹{p.price_inr}</span>
                      <span className="text-xs text-ink-tertiary font-bold mb-1">
                        / {p.billing_interval === "event" ? "event" : p.billing_interval}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-ink-secondary bg-ink/5 px-2.5 py-1 rounded-md border border-hairline-dark">
                      {p.features.length} Features
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Interactive Visual Plan Editor */}
      <div className="lg:col-span-7">
        {(editingPlan || isAdding) ? (
          <Card className="bg-surface-card border-hairline-dark sticky top-6 shadow-sm">
            <CardHeader className="pb-4 border-b border-hairline-dark">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base text-ink font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-mauve" />
                    {isAdding ? "Create New Plan" : `Edit Plan: ${formName}`}
                  </CardTitle>
                  <CardDescription className="text-xs">Configure plan pricing, quota limits, and feature toggles</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingPlan(null) }} className="h-7 w-7 p-0 rounded-lg">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Editor Mode Selector: Visual Toggles vs Raw JSON */}
              <div className="flex items-center gap-2 mt-4 bg-ink/5 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEditorMode("visual")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all",
                    editorMode === "visual" ? "bg-surface-card text-mauve shadow-sm" : "text-ink-secondary hover:text-ink-secondary"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Visual Feature Toggles
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode("json")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all",
                    editorMode === "json" ? "bg-surface-card text-mauve shadow-sm" : "text-ink-secondary hover:text-ink-secondary"
                  )}
                >
                  <Code className="h-3.5 w-3.5" />
                  Advanced Raw JSON
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                {/* Section 1: Core Metadata */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">1. Basic Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-ink-secondary">Plan Slug ID</Label>
                      <Input value={formId} onChange={e => setFormId(e.target.value.toLowerCase().replace(/\s+/g, "_"))} disabled={!isAdding} required placeholder="e.g. starter" className="h-8 text-xs font-medium" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-ink-secondary">Plan Name</Label>
                      <Input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="e.g. Starter Plan" className="h-8 text-xs font-medium" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Description</Label>
                    <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Short marketing description" className="h-8 text-xs font-medium" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-ink-secondary">Price (INR ₹)</Label>
                      <Input type="number" value={formPriceInr} onChange={e => setFormPriceInr(Number(e.target.value))} required className="h-8 text-xs font-medium" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-ink-secondary">Price (USD $)</Label>
                      <Input type="number" value={formPriceUsd} onChange={e => setFormPriceUsd(Number(e.target.value))} required className="h-8 text-xs font-medium" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-ink-secondary">Pricing Unit / Interval</Label>
                      <select value={formInterval} onChange={e => setFormInterval(e.target.value as any)} className="w-full h-8 px-2 rounded-md border border-hairline-dark text-xs font-bold bg-surface-card text-ink">
                        <option value="event">Per Event (One-Time)</option>
                        <option value="monthly">Monthly Subscription</option>
                        <option value="yearly">Yearly Subscription</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 flex-wrap py-2 px-3 bg-ink/5 rounded-lg border border-hairline-dark">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="rounded text-mauve focus:ring-mauve h-4 w-4" />
                      <span className="text-xs font-bold text-ink-secondary">Active Tier</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formBestValue} onChange={e => setFormBestValue(e.target.checked)} className="rounded text-mauve focus:ring-mauve h-4 w-4" />
                      <span className="text-xs font-bold text-ink-secondary">Highlight as "Best Value"</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formIsPopular} onChange={e => setFormIsPopular(e.target.checked)} className="rounded text-mauve focus:ring-mauve h-4 w-4" />
                      <span className="text-xs font-bold text-ink-secondary">Highlight as "Popular"</span>
                    </label>
                  </div>
                </div>

                {/* Section 2: Visual Feature Toggles & Limits vs Raw JSON */}
                {editorMode === "visual" ? (
                  <div className="space-y-6 border-t border-hairline-dark pt-5">
                    {/* Quota & Capacity Controls */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">2. Event Quotas & Capacity Limits</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-ink/5 border border-hairline-dark rounded-xl space-y-1">
                          <Label className="text-xs font-bold text-ink-secondary">👥 Guests Limit per Event</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" value={limitGuests} onChange={e => setLimitGuests(Number(e.target.value))} className="h-8 text-xs font-bold bg-surface-card" />
                            <button type="button" onClick={() => setLimitGuests(-1)} className={cn("px-2 py-1 text-[10px] font-bold rounded border", limitGuests === -1 ? "bg-mauve text-[#1a1410] border-mauve" : "bg-surface-card text-ink-secondary")}>
                              ∞ Unlimited
                            </button>
                          </div>
                        </div>

                        <div className="p-3 bg-ink/5 border border-hairline-dark rounded-xl space-y-1">
                          <Label className="text-xs font-bold text-ink-secondary">📸 Shots Limit per Guest</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" value={limitShots} onChange={e => setLimitShots(Number(e.target.value))} className="h-8 text-xs font-bold bg-surface-card" />
                            <button type="button" onClick={() => setLimitShots(-1)} className={cn("px-2 py-1 text-[10px] font-bold rounded border", limitShots === -1 ? "bg-mauve text-[#1a1410] border-mauve" : "bg-surface-card text-ink-secondary")}>
                              ∞ Unlimited
                            </button>
                          </div>
                        </div>

                        <div className="p-3 bg-ink/5 border border-hairline-dark rounded-xl space-y-1">
                          <Label className="text-xs font-bold text-ink-secondary">💾 Storage Quota (GB)</Label>
                          <Input type="number" value={limitStorageGb} onChange={e => setLimitStorageGb(Number(e.target.value))} className="h-8 text-xs font-bold bg-surface-card" />
                        </div>

                        <div className="p-3 bg-ink/5 border border-hairline-dark rounded-xl space-y-1">
                          <Label className="text-xs font-bold text-ink-secondary">🤖 AI Face Searches Limit</Label>
                          <Input type="number" value={limitAiSearches} onChange={e => setLimitAiSearches(Number(e.target.value))} className="h-8 text-xs font-bold bg-surface-card" />
                        </div>
                      </div>
                    </div>

                    {/* Feature Toggle Switch Matrix */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">3. Feature Access Toggles</h4>
                        <button type="button" onClick={handleAutoGenerateFeatures} className="text-xs font-bold text-mauve hover:underline flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Auto-Generate Bullet Points
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {FEATURE_CATALOG.map((f) => {
                          const enabled = Boolean(toggles[f.key])
                          return (
                            <div
                              key={f.key}
                              onClick={() => setToggles(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                              className={cn(
                                "p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2",
                                enabled ? "bg-mauve/15 border-mauve/20 text-ink" : "bg-surface-card border-hairline-dark text-ink-tertiary opacity-70 hover:opacity-100"
                              )}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-sm">{f.icon}</span>
                                <div className="truncate">
                                  <p className="text-xs font-bold truncate">{f.label}</p>
                                  <p className="text-[10px] text-ink-secondary font-normal truncate">{f.desc}</p>
                                </div>
                              </div>
                              <div className={cn("w-8 h-4 rounded-full transition-all p-0.5 flex items-center", enabled ? "bg-mauve justify-end" : "bg-ink/15 justify-start")}>
                                <div className="w-3 h-3 rounded-full bg-surface-card shadow-sm" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-hairline-dark pt-5">
                    <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">2. Advanced Raw JSON Object</h4>
                    <textarea
                      value={formLimitsJson}
                      onChange={e => setFormLimitsJson(e.target.value)}
                      rows={8}
                      className="w-full font-mono rounded-md border border-hairline-dark px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-mauve/50 bg-surface-dark text-emerald-400"
                    />
                  </div>
                )}

                {/* Section 3: Human-Readable Features Bullet List */}
                <div className="space-y-2 border-t border-hairline-dark pt-5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-ink-secondary">Public Pricing Features (one bullet per line)</Label>
                    <button type="button" onClick={handleAutoGenerateFeatures} className="text-[11px] font-semibold text-mauve hover:underline">
                      Sync from Toggles
                    </button>
                  </div>
                  <textarea
                    value={formFeatures}
                    onChange={e => setFormFeatures(e.target.value)}
                    rows={4}
                    placeholder="10 guests limit&#10;10 shots per guest&#10;AI Face Search matching"
                    className="w-full rounded-md border border-hairline-dark px-3 py-2 text-xs font-medium resize-none focus:outline-none focus:ring-1 focus:ring-mauve/50"
                  />
                </div>

                <Button type="submit" disabled={actioning} className="w-full h-9 bg-mauve hover:bg-mauve-strong font-bold text-xs text-[#1a1410] shadow-sm">
                  {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Plan Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="p-16 border border-dashed border-hairline-dark bg-ink/5 text-ink-tertiary text-center rounded-2xl text-xs font-semibold">
            Select a plan on the left to edit or click "New Plan" to create one.
          </div>
        )}
      </div>
    </div>
  )
}
