"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import {
  Sparkles, Plus, Edit2, Trash2, RefreshCw, Loader2, Save, X,
  Sliders, CreditCard, Building2, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, AlertCircle, Filter, RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
type PlanItem = {
  id: string
  name: string
  description: string | null
  price_inr: number
  price_usd: number
  features: string[]
  limits: {
    events_limit?: number
    storage_limit_gb?: number
    photo_limit?: number
    guests_limit?: number
    shots_limit?: number
    qr_codes_per_event?: number
    galleries_per_event?: number
    ai_searches?: number
    custom_branding?: boolean
    priority_support?: boolean
  }
  is_active: boolean
}

type SubscriptionItem = {
  id: string
  organization_id: string
  plan_id: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancelled_at: string | null
  razorpay_subscription_id: string | null
  created_at: string
  organization: { id: string; name: string; plan?: string } | null
  plan: { id: string; name: string; price_inr: number; price_usd?: number } | null
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ElementType; cls: string }> = {
    active:   { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    past_due: { icon: AlertCircle,  cls: "bg-amber-50 text-amber-700 border-amber-100" },
    canceled: { icon: XCircle,      cls: "bg-rose-50 text-rose-700 border-rose-100" },
    paused:   { icon: Clock,        cls: "bg-slate-100 text-slate-600 border-slate-200" },
  }
  const { icon: Icon, cls } = cfg[status] ?? cfg.paused
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", cls)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<"plans" | "subscriptions" | "addons">("plans")

  // Plans
  const [plans, setPlans] = useState<PlanItem[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formId, setFormId] = useState("")
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formPriceInr, setFormPriceInr] = useState(0)
  const [formPriceUsd, setFormPriceUsd] = useState(0)
  const [formFeatures, setFormFeatures] = useState("")
  const [formLimits, setFormLimits] = useState("{}")

  // Subscriptions
  const [subs, setSubs] = useState<SubscriptionItem[]>([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [subsTotal, setSubsTotal] = useState(0)
  const [subsPage, setSubsPage] = useState(1)
  const [subsTotalPages, setSubsTotalPages] = useState(1)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterPlan, setFilterPlan] = useState("")
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null)
  const [subNewStatus, setSubNewStatus] = useState("")
  const [subNewPlan, setSubNewPlan] = useState("")
  const [subCancelAtEnd, setSubCancelAtEnd] = useState(false)
  const [subActioning, setSubActioning] = useState(false)

  // Addons
  const [guestBoosts, setGuestBoosts] = useState<any[]>([])
  const [shotBoosts, setShotBoosts] = useState<any[]>([])
  const [addonLoading, setAddonLoading] = useState(true)
  const [addonSaving, setAddonSaving] = useState(false)
  const [editingAddonType, setEditingAddonType] = useState<"guest" | "shot" | null>(null)
  const [editingAddonIndex, setEditingAddonIndex] = useState<number | null>(null)
  const [addonFormLabel, setAddonFormLabel] = useState("")
  const [addonFormValue, setAddonFormValue] = useState(0)
  const [addonFormPrice, setAddonFormPrice] = useState(0)
  const [isAddingAddon, setIsAddingAddon] = useState(false)

  // ── Data fetchers ──────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setPlansLoading(true)
    try {
      const res = await fetch("/api/admin/plans")
      if (!res.ok) throw new Error("Failed to load plans")
      const data = await res.json()
      setPlans(data.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setPlansLoading(false)
    }
  }, [])

  const fetchSubs = useCallback(async (page = 1, status = "", planId = "") => {
    setSubsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" })
      if (status) params.set("status", status)
      if (planId) params.set("planId", planId)
      const res = await fetch(`/api/admin/subscriptions?${params}`)
      if (!res.ok) throw new Error("Failed to load subscriptions")
      const data = await res.json()
      const payload = data.data || {}
      setSubs(payload.subscriptions || [])
      setSubsTotal(payload.total || 0)
      setSubsTotalPages(payload.totalPages || 1)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSubsLoading(false)
    }
  }, [])

  const fetchAddons = useCallback(async () => {
    setAddonLoading(true)
    try {
      const res = await fetch("/api/payments/addons")
      if (res.ok) {
        const data = await res.json()
        setGuestBoosts(data.guest_boosts || [])
        setShotBoosts(data.shot_boosts || [])
      }
    } catch {
      toast({ title: "Error", description: "Failed to load addons configuration.", variant: "destructive" })
    } finally {
      setAddonLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
    fetchAddons()
  }, [fetchPlans, fetchAddons])

  useEffect(() => {
    if (activeTab === "subscriptions") fetchSubs(subsPage, filterStatus, filterPlan)
  }, [activeTab, subsPage, filterStatus, filterPlan, fetchSubs])

  // ── Plans form helpers ─────────────────────────────────────────────────────
  const startEdit = (plan: PlanItem) => {
    setEditingPlan(plan)
    setIsAdding(false)
    setFormId(plan.id)
    setFormName(plan.name)
    setFormDesc(plan.description || "")
    setFormPriceInr(plan.price_inr)
    setFormPriceUsd(plan.price_usd)
    setFormFeatures(plan.features.join("\n"))
    setFormLimits(JSON.stringify(plan.limits, null, 2))
  }

  const startAdd = () => {
    setIsAdding(true)
    setEditingPlan(null)
    setFormId("")
    setFormName("")
    setFormDesc("")
    setFormPriceInr(0)
    setFormPriceUsd(0)
    setFormFeatures("")
    setFormLimits(JSON.stringify({ events_limit: 5, storage_limit_gb: 10, photo_limit: 100, guests_limit: 10, shots_limit: 10 }, null, 2))
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setActioning(true)
    let parsedLimits = {}
    try {
      parsedLimits = JSON.parse(formLimits)
    } catch {
      toast({ title: "Invalid JSON", description: "Limits must be a valid JSON object.", variant: "destructive" })
      setActioning(false)
      return
    }
    const payload = {
      id: formId, name: formName, description: formDesc, price_inr: formPriceInr,
      price_usd: formPriceUsd, features: formFeatures.split("\n").map(f => f.trim()).filter(Boolean),
      limits: parsedLimits, is_active: true,
    }
    try {
      const method = isAdding ? "POST" : "PATCH"
      const res = await fetch("/api/admin/plans", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("Failed to save plan configuration")
      toast({ title: "Success", description: `Plan '${formName}' saved successfully.` })
      setEditingPlan(null)
      setIsAdding(false)
      fetchPlans()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this pricing plan?")) return
    setActioning(true)
    try {
      const res = await fetch(`/api/admin/plans?planId=${planId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete plan")
      toast({ title: "Success", description: "Plan has been removed." })
      fetchPlans()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  // ── Subscriptions edit helpers ─────────────────────────────────────────────
  const startEditSub = (sub: SubscriptionItem) => {
    setEditingSub(sub)
    setSubNewStatus(sub.status)
    setSubNewPlan(sub.plan_id)
    setSubCancelAtEnd(sub.cancel_at_period_end)
  }

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSub) return
    setSubActioning(true)
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingSub.id, status: subNewStatus, plan_id: subNewPlan, cancel_at_period_end: subCancelAtEnd }),
      })
      if (!res.ok) throw new Error("Failed to update subscription")
      toast({ title: "Success", description: "Subscription updated successfully." })
      setEditingSub(null)
      fetchSubs(subsPage, filterStatus, filterPlan)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setSubActioning(false)
    }
  }

  // ── Addon helpers ──────────────────────────────────────────────────────────
  const handleSaveAddons = async (type: "guest" | "shot") => {
    setAddonSaving(true)
    const key = type === "guest" ? "guest_boosts" : "shot_boosts"
    const value = type === "guest" ? guestBoosts : shotBoosts
    try {
      const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) })
      if (!res.ok) throw new Error("Failed to save addon settings")
      toast({ title: "Success", description: `${type === "guest" ? "Guest" : "Shots"} boost addons saved successfully.` })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setAddonSaving(false)
    }
  }

  const startAddAddon = (type: "guest" | "shot") => {
    setEditingAddonType(type)
    setEditingAddonIndex(null)
    setIsAddingAddon(true)
    setAddonFormLabel("")
    setAddonFormValue(0)
    setAddonFormPrice(0)
  }

  const startEditAddon = (type: "guest" | "shot", index: number, item: any) => {
    setEditingAddonType(type)
    setEditingAddonIndex(index)
    setIsAddingAddon(false)
    setAddonFormLabel(item.label)
    setAddonFormValue(item.value)
    setAddonFormPrice(item.price)
  }

  const handleSaveAddonItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAddonType) return
    const targetList = editingAddonType === "guest" ? guestBoosts : shotBoosts
    const setList = editingAddonType === "guest" ? setGuestBoosts : setShotBoosts
    const newItem = { label: addonFormLabel, value: addonFormValue, price: addonFormPrice }
    let updatedList = [...targetList]
    if (isAddingAddon) updatedList.push(newItem)
    else if (editingAddonIndex !== null) updatedList[editingAddonIndex] = newItem
    updatedList.sort((a, b) => a.value - b.value)
    setList(updatedList)
    setEditingAddonType(null)
    setEditingAddonIndex(null)
    setIsAddingAddon(false)
  }

  const handleDeleteAddonItem = (type: "guest" | "shot", index: number) => {
    if (!confirm("Remove this addon tier?")) return
    const targetList = type === "guest" ? guestBoosts : shotBoosts
    const setList = type === "guest" ? setGuestBoosts : setShotBoosts
    setList(targetList.filter((_, idx) => idx !== index))
  }

  // ── Tab meta ───────────────────────────────────────────────────────────────
  const tabs = [
    { id: "plans" as const,         label: "Pricing Plans",    icon: Sparkles    },
    { id: "subscriptions" as const,  label: "Subscriptions",   icon: CreditCard  },
    { id: "addons" as const,         label: "Add-On Boosts",   icon: Sliders     },
  ]

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pricing & Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">Manage pricing tiers, live subscriptions, and add-on quota boosts.</p>
        </div>
        {activeTab === "plans" && (
          <Button onClick={startAdd} className="h-9 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            <span>Create Plan</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200",
              activeTab === tab.id
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {tab.id === "subscriptions" && subsTotal > 0 && (
              <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold",
                activeTab === "subscriptions" ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"
              )}>
                {subsTotal}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── PLANS TAB ────────────────────────────────────────────────────────── */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {plansLoading ? (
              <div className="p-16 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
            ) : plans.length === 0 ? (
              <div className="p-16 border border-dashed border-slate-200 bg-white text-slate-400 text-center rounded-2xl text-xs font-semibold">
                No plans registered. Click &apos;Create Plan&apos; to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map((p) => (
                  <Card key={p.id} className="bg-white border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-sm">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-base">{p.name}</h4>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block",
                            p.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-400"
                          )}>
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="space-x-1">
                          <Button onClick={() => startEdit(p)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-lg">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => handleDeletePlan(p.id)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 min-h-[32px] font-semibold leading-relaxed">{p.description}</p>
                      <div className="mt-3 text-2xl font-bold text-slate-800">₹{p.price_inr.toLocaleString()}<span className="text-sm text-slate-400 font-semibold"> /mo</span></div>

                      <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Limits:</span>
                        <ul className="text-xs text-slate-600 space-y-1.5 font-semibold">
                          <li>• Events: {p.limits.events_limit === -1 ? "Unlimited" : p.limits.events_limit ?? "—"}</li>
                          <li>• Storage: {p.limits.storage_limit_gb ?? "—"} GB</li>
                          <li>• Guests/event: {p.limits.guests_limit ?? "—"}</li>
                          <li>• Shots/guest: {p.limits.shots_limit ?? "—"}</li>
                          {p.limits.ai_searches && <li>• AI searches: {p.limits.ai_searches}</li>}
                        </ul>
                      </div>

                      {p.features.length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-1.5">Features:</span>
                          <ul className="text-xs text-slate-600 space-y-1 font-medium">
                            {p.features.slice(0, 4).map((f, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                                {f}
                              </li>
                            ))}
                            {p.features.length > 4 && (
                              <li className="text-slate-400">+{p.features.length - 4} more…</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Editor Form */}
          <div>
            {(editingPlan || isAdding) ? (
              <Card className="bg-white border-slate-200 p-6 sticky top-6 shadow-sm">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-base text-slate-800 font-bold">
                    {isAdding ? "Create new plan" : `Edit: ${formName}`}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-[10px] font-semibold leading-relaxed">
                    Set pricing, quotas, and features for this tier.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSavePlan} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="planId" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Plan ID (Slug)</Label>
                    <Input id="planId" value={formId} onChange={e => setFormId(e.target.value)} disabled={!isAdding || actioning} required placeholder="e.g. starter" className="bg-white border-slate-200 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="planName" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Plan Name</Label>
                    <Input id="planName" value={formName} onChange={e => setFormName(e.target.value)} disabled={actioning} required placeholder="e.g. Starter" className="bg-white border-slate-200 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="planDesc" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Description</Label>
                    <Input id="planDesc" value={formDesc} onChange={e => setFormDesc(e.target.value)} disabled={actioning} placeholder="e.g. Best for small events" className="bg-white border-slate-200 text-slate-800" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="priceInr" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Price (INR)</Label>
                      <Input id="priceInr" type="number" value={formPriceInr} onChange={e => setFormPriceInr(parseInt(e.target.value) || 0)} disabled={actioning} required className="bg-white border-slate-200 text-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="priceUsd" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Price (USD)</Label>
                      <Input id="priceUsd" type="number" value={formPriceUsd} onChange={e => setFormPriceUsd(parseInt(e.target.value) || 0)} disabled={actioning} required className="bg-white border-slate-200 text-slate-800" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="planFeatures" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Features (one per line)</Label>
                    <textarea
                      id="planFeatures"
                      rows={4}
                      value={formFeatures}
                      onChange={e => setFormFeatures(e.target.value)}
                      disabled={actioning}
                      placeholder={"10 guests limit\n10 shots per guest\nCustom reveal time"}
                      className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 shadow-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="planLimits" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Limits (JSON)</Label>
                    <textarea
                      id="planLimits"
                      rows={7}
                      value={formLimits}
                      onChange={e => setFormLimits(e.target.value)}
                      disabled={actioning}
                      required
                      className="flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 shadow-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={actioning} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold">
                      <Save className="h-4 w-4 mr-1.5" />
                      {actioning ? "Saving…" : "Save Plan"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setEditingPlan(null); setIsAdding(false) }} className="border-slate-200 hover:bg-slate-50 font-bold">
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 border-dashed text-slate-400 text-center rounded-2xl h-64 flex flex-col justify-center items-center text-xs font-semibold leading-relaxed">
                <Sparkles className="h-8 w-8 mb-3 text-slate-300" />
                <span>Select a plan to edit its pricing and limits.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SUBSCRIPTIONS TAB ────────────────────────────────────────────────── */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={filterStatus}
              onChange={e => { setSubsPage(1); setFilterStatus(e.target.value) }}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
              <option value="paused">Paused</option>
            </select>
            <select
              value={filterPlan}
              onChange={e => { setSubsPage(1); setFilterPlan(e.target.value) }}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">All Plans</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterStatus(""); setFilterPlan(""); setSubsPage(1) }}
              className="h-8 gap-1 text-slate-500 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <div className="ml-auto text-xs text-slate-400 font-semibold">
              {subsTotal} subscription{subsTotal !== 1 ? "s" : ""} found
            </div>
            <Button onClick={() => fetchSubs(subsPage, filterStatus, filterPlan)} variant="outline" size="sm" disabled={subsLoading} className="h-8 gap-1 text-xs font-semibold border-slate-200">
              <RefreshCw className={cn("h-3.5 w-3.5", subsLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
              <CardContent className="p-0">
                {subsLoading ? (
                  <div className="p-16 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                  </div>
                ) : subs.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 text-xs font-semibold">No subscriptions found for selected filters.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                        <th className="p-4">Organization</th>
                        <th className="p-4">Plan</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Renews</th>
                        <th className="p-4 text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {subs.map(sub => (
                        <tr
                          key={sub.id}
                          onClick={() => startEditSub(sub)}
                          className={cn(
                            "hover:bg-slate-50/60 transition-colors cursor-pointer",
                            editingSub?.id === sub.id && "bg-violet-50/40"
                          )}
                        >
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{sub.organization?.name ?? "—"}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">{sub.organization_id.slice(0, 8)}…</div>
                          </td>
                          <td className="p-4 font-bold text-violet-600 uppercase">{sub.plan?.name ?? sub.plan_id}</td>
                          <td className="p-4">
                            <StatusBadge status={sub.status} />
                            {sub.cancel_at_period_end && (
                              <span className="ml-1 text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">Cancels at end</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400">
                            {sub.current_period_end
                              ? new Date(sub.current_period_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"
                            }
                          </td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>

              {/* Pagination */}
              {subsTotalPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">Page {subsPage} of {subsTotalPages}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={subsPage <= 1} onClick={() => setSubsPage(p => p - 1)} className="h-7 w-7 p-0 border-slate-200">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={subsPage >= subsTotalPages} onClick={() => setSubsPage(p => p + 1)} className="h-7 w-7 p-0 border-slate-200">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Edit Panel */}
            {editingSub ? (
              <Card className="bg-white border-slate-200 p-6 sticky top-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Edit Subscription</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{editingSub.organization?.name}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingSub(null)} className="h-7 w-7 p-0 hover:bg-slate-100 rounded-lg">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleSaveSub} className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Plan Tier</Label>
                    <select
                      value={subNewPlan}
                      onChange={e => setSubNewPlan(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.price_inr}/mo)</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">Status</Label>
                    <select
                      value={subNewStatus}
                      onChange={e => setSubNewStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value="active">Active</option>
                      <option value="past_due">Past Due</option>
                      <option value="canceled">Canceled</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <input
                      type="checkbox"
                      id="cancelAtEnd"
                      checked={subCancelAtEnd}
                      onChange={e => setSubCancelAtEnd(e.target.checked)}
                      className="h-4 w-4 accent-amber-600"
                    />
                    <Label htmlFor="cancelAtEnd" className="text-xs font-semibold text-amber-700 cursor-pointer">
                      Cancel at period end
                    </Label>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1 text-xs font-semibold">
                    <div className="flex justify-between text-slate-400">
                      <span>Subscription ID</span>
                      <span className="font-mono text-slate-600">{editingSub.id.slice(0, 8)}…</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Created</span>
                      <span>{new Date(editingSub.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                    {editingSub.razorpay_subscription_id && (
                      <div className="flex justify-between text-slate-400">
                        <span>Razorpay ID</span>
                        <span className="font-mono text-[10px] text-slate-500">{editingSub.razorpay_subscription_id}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button type="submit" disabled={subActioning} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs h-9">
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {subActioning ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditingSub(null)} className="border-slate-200 font-bold text-xs h-9">
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 border-dashed text-slate-400 text-center rounded-2xl h-64 flex flex-col justify-center items-center text-xs font-semibold">
                <Building2 className="h-8 w-8 mb-3 text-slate-300" />
                <span>Click a subscription row to edit its plan or status.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ADD-ONS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === "addons" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-4 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700 font-semibold">
            <Sliders className="h-4 w-4 shrink-0" />
            <span>Configure the quota boost add-on tiers that customers can purchase during checkout. Changes here update the live checkout page immediately after saving.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guest Boosts */}
            <AddonCard
              title="Guest Limit Boosts"
              description="Additional guest capacity tiers customers can add to any event."
              type="guest"
              items={guestBoosts}
              loading={addonLoading}
              saving={addonSaving}
              editingAddonType={editingAddonType}
              editingAddonIndex={editingAddonIndex}
              isAddingAddon={isAddingAddon}
              addonFormLabel={addonFormLabel}
              addonFormValue={addonFormValue}
              addonFormPrice={addonFormPrice}
              setAddonFormLabel={setAddonFormLabel}
              setAddonFormValue={setAddonFormValue}
              setAddonFormPrice={setAddonFormPrice}
              onStartAdd={() => startAddAddon("guest")}
              onStartEdit={(idx, item) => startEditAddon("guest", idx, item)}
              onDelete={(idx) => handleDeleteAddonItem("guest", idx)}
              onSaveItem={handleSaveAddonItem}
              onCancelEdit={() => { setEditingAddonType(null); setEditingAddonIndex(null) }}
              onSaveTiers={() => handleSaveAddons("guest")}
              unit="guests"
            />

            {/* Shot Boosts */}
            <AddonCard
              title="Shots Limit Boosts"
              description="Additional shots-per-guest tiers customers can add to any event."
              type="shot"
              items={shotBoosts}
              loading={addonLoading}
              saving={addonSaving}
              editingAddonType={editingAddonType}
              editingAddonIndex={editingAddonIndex}
              isAddingAddon={isAddingAddon}
              addonFormLabel={addonFormLabel}
              addonFormValue={addonFormValue}
              addonFormPrice={addonFormPrice}
              setAddonFormLabel={setAddonFormLabel}
              setAddonFormValue={setAddonFormValue}
              setAddonFormPrice={setAddonFormPrice}
              onStartAdd={() => startAddAddon("shot")}
              onStartEdit={(idx, item) => startEditAddon("shot", idx, item)}
              onDelete={(idx) => handleDeleteAddonItem("shot", idx)}
              onSaveItem={handleSaveAddonItem}
              onCancelEdit={() => { setEditingAddonType(null); setEditingAddonIndex(null) }}
              onSaveTiers={() => handleSaveAddons("shot")}
              unit="shots/guest"
            />
          </div>
        </div>
      )}
    </main>
  )
}

// ─── AddonCard Component ───────────────────────────────────────────────────────
type AddonCardProps = {
  title: string
  description: string
  type: "guest" | "shot"
  items: any[]
  loading: boolean
  saving: boolean
  editingAddonType: "guest" | "shot" | null
  editingAddonIndex: number | null
  isAddingAddon: boolean
  addonFormLabel: string
  addonFormValue: number
  addonFormPrice: number
  setAddonFormLabel: (v: string) => void
  setAddonFormValue: (v: number) => void
  setAddonFormPrice: (v: number) => void
  onStartAdd: () => void
  onStartEdit: (idx: number, item: any) => void
  onDelete: (idx: number) => void
  onSaveItem: (e: React.FormEvent) => void
  onCancelEdit: () => void
  onSaveTiers: () => void
  unit: string
}

function AddonCard({
  title, description, type, items, loading, saving,
  editingAddonType, editingAddonIndex, isAddingAddon,
  addonFormLabel, addonFormValue, addonFormPrice,
  setAddonFormLabel, setAddonFormValue, setAddonFormPrice,
  onStartAdd, onStartEdit, onDelete, onSaveItem, onCancelEdit, onSaveTiers,
  unit
}: AddonCardProps) {
  const isEditingThis = editingAddonType === type

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-100">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">{title}</h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed">{description}</p>
          </div>
          <Button
            onClick={onSaveTiers}
            disabled={saving || loading}
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 px-3 rounded-lg shrink-0"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Tiers</span>
          </Button>
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-violet-600" /></div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">No {type === "guest" ? "guest" : "shots"} boost tiers configured yet.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="pb-2">Value</th>
                <th className="pb-2">Label</th>
                <th className="pb-2">Price (INR)</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-600 font-semibold">
              {items.map((item, idx) => (
                <tr key={idx} className={cn(
                  "hover:bg-slate-50/50 transition-colors",
                  isEditingThis && editingAddonIndex === idx && "bg-violet-50/40"
                )}>
                  <td className="py-2.5 font-bold text-slate-800">+{item.value} <span className="text-[9px] text-slate-400 font-normal">{unit}</span></td>
                  <td className="py-2.5">{item.label}</td>
                  <td className="py-2.5 font-bold text-slate-900">₹{item.price.toLocaleString()}</td>
                  <td className="py-2.5 text-right space-x-1">
                    <Button onClick={() => onStartEdit(idx, item)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={() => onDelete(idx)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Inline form */}
        {isEditingThis ? (
          <form onSubmit={onSaveItem} className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isAddingAddon ? `Add ${type === "guest" ? "Guest" : "Shots"} Boost` : "Edit Boost Tier"}
              </h5>
              <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit} className="h-6 w-6 p-0 hover:bg-slate-100 rounded-md">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Label</Label>
                <Input
                  value={addonFormLabel}
                  onChange={e => setAddonFormLabel(e.target.value)}
                  required
                  placeholder={type === "guest" ? "+10 guests" : "+5 shots"}
                  className="bg-white border-slate-200 text-slate-800 text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Value</Label>
                <Input
                  type="number"
                  value={addonFormValue}
                  onChange={e => setAddonFormValue(parseInt(e.target.value) || 0)}
                  required
                  placeholder="10"
                  className="bg-white border-slate-200 text-slate-800 text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price (₹)</Label>
                <Input
                  type="number"
                  value={addonFormPrice}
                  onChange={e => setAddonFormPrice(parseInt(e.target.value) || 0)}
                  required
                  placeholder="199"
                  className="bg-white border-slate-200 text-slate-800 text-xs h-9"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onCancelEdit} className="h-8 text-xs font-bold border-slate-200">Cancel</Button>
              <Button type="submit" size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold">Apply Tier</Button>
            </div>
          </form>
        ) : (
          <Button onClick={onStartAdd} variant="outline" size="sm" className="w-full text-xs font-semibold gap-1 border-slate-200 hover:bg-slate-50 hover:border-violet-200 hover:text-violet-700 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add {type === "guest" ? "Guest" : "Shots"} Boost Tier
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
