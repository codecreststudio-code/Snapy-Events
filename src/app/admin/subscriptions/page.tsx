"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Sparkles, Plus, Edit2, Trash2, Check, RefreshCw, Loader2, Save } from "lucide-react"

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
  current_period_end: string
  organization: {
    name: string
  }
}

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<PlanItem[]>([])
  const [subs, setSubs] = useState<SubscriptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)

  // Edit states
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Form states
  const [formId, setFormId] = useState("")
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formPriceInr, setFormPriceInr] = useState(0)
  const [formPriceUsd, setFormPriceUsd] = useState(0)
  const [formFeatures, setFormFeatures] = useState<string>("")
  const [formLimits, setFormLimits] = useState<string>("{}")

  const fetchData = async () => {
    setLoading(true)
    try {
      const [plansRes, subsRes] = await Promise.all([
        fetch("/api/admin/plans"),
        fetch("/api/admin/users"), // We can fetch users list containing organization sub details or query subscriptions
      ])
      
      if (!plansRes.ok) throw new Error("Failed to load plans")
      const plansData = await plansRes.json()
      setPlans(plansData.data || [])

      // Note: we can mock subscriptions or query a mocked/empty subscriptions list for now
      setSubs([
        {
          id: "sub_1",
          organization_id: "org_premium_1",
          plan_id: "premium",
          status: "active",
          current_period_end: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
          organization: { name: "Studio Pro Shots" }
        },
        {
          id: "sub_2",
          organization_id: "org_starter_1",
          plan_id: "starter",
          status: "active",
          current_period_end: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
          organization: { name: "Delhi Wedding Stories" }
        }
      ])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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
    setFormLimits(JSON.stringify({
      events_limit: 5,
      storage_limit_gb: 10,
      photo_limit: 100,
      guests_limit: 10,
      shots_limit: 10,
    }, null, 2))
  }

  const handleSave = async (e: React.FormEvent) => {
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
      id: formId,
      name: formName,
      description: formDesc,
      price_inr: formPriceInr,
      price_usd: formPriceUsd,
      features: formFeatures.split("\n").map(f => f.trim()).filter(Boolean),
      limits: parsedLimits,
      is_active: true,
    }

    try {
      const method = isAdding ? "POST" : "PATCH"
      const res = await fetch("/api/admin/plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Failed to save plan configuration")
      toast({ title: "Success", description: `Plan '${formName}' saved successfully.` })
      
      setEditingPlan(null)
      setIsAdding(false)
      fetchData()
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
      const res = await fetch(`/api/admin/plans?planId=${planId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete plan")
      toast({ title: "Success", description: "Plan has been removed." })
      fetchData()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Pricing & Subscriptions" description="Define pricing tiers, configure usage limits, and monitor active premium users." />
        <Button onClick={startAdd} className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold">
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Create Plan</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plans list */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <span>Active Tiers & Pricing</span>
          </h3>

          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 border border-dashed border-slate-800 text-slate-500 text-center rounded-2xl">
              No plans registered. Click 'Create Plan' to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((p) => (
                <Card key={p.id} className="bg-slate-900 border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-lg text-slate-100">{p.name}</h4>
                      <div className="space-x-1">
                        <Button onClick={() => startEdit(p)} variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDeletePlan(p.id)} variant="ghost" size="sm" className="text-rose-500 hover:text-rose-400">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.description}</p>
                    <div className="mt-3 text-2xl font-bold text-white">₹{p.price_inr}</div>
                    
                    <div className="mt-4 border-t border-slate-800 pt-4 space-y-2">
                      <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Limits Configuration:</span>
                      <ul className="text-xs text-slate-300 space-y-1.5">
                        <li>• Events allowed: {p.limits.events_limit === -1 ? "Unlimited" : p.limits.events_limit}</li>
                        <li>• Storage size: {p.limits.storage_limit_gb} GB</li>
                        <li>• Allowed guests/event: {p.limits.guests_limit}</li>
                        <li>• Shots limit/guest: {p.limits.shots_limit}</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Subscriptions list */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Recent Subscriptions</h3>
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-medium">
                      <th className="p-4">Subscriber</th>
                      <th className="p-4">Plan Tier</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Valid Until</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {subs.map((s) => (
                      <tr key={s.id}>
                        <td className="p-4 font-semibold text-slate-200">{s.organization.name}</td>
                        <td className="p-4 uppercase text-orange-500/80 font-bold text-xs">{s.plan_id}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {s.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">{new Date(s.current_period_end).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Editor Form */}
        <div>
          {(editingPlan || isAdding) ? (
            <Card className="bg-slate-900 border-slate-800 p-6 sticky top-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-lg text-slate-100">
                  {isAdding ? "Create new plan" : `Edit plan: ${formName}`}
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Provide price, feature descriptions, and quotas JSON.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="planId" className="text-slate-300 text-xs">Plan ID (Unique Slug)</Label>
                  <Input
                    id="planId"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    disabled={!isAdding || actioning}
                    required
                    placeholder="e.g. starter"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="planName" className="text-slate-300 text-xs">Plan Name</Label>
                  <Input
                    id="planName"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={actioning}
                    required
                    placeholder="e.g. Starter"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="planDesc" className="text-slate-300 text-xs">Description</Label>
                  <Input
                    id="planDesc"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    disabled={actioning}
                    placeholder="e.g. Best for small events"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="priceInr" className="text-slate-300 text-xs">Price (INR)</Label>
                    <Input
                      id="priceInr"
                      type="number"
                      value={formPriceInr}
                      onChange={(e) => setFormPriceInr(parseInt(e.target.value) || 0)}
                      disabled={actioning}
                      required
                      className="bg-slate-950 border-slate-800 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="priceUsd" className="text-slate-300 text-xs">Price (USD)</Label>
                    <Input
                      id="priceUsd"
                      type="number"
                      value={formPriceUsd}
                      onChange={(e) => setFormPriceUsd(parseInt(e.target.value) || 0)}
                      disabled={actioning}
                      required
                      className="bg-slate-950 border-slate-800 text-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="planFeatures" className="text-slate-300 text-xs">Features (One per line)</Label>
                  <textarea
                    id="planFeatures"
                    rows={4}
                    value={formFeatures}
                    onChange={(e) => setFormFeatures(e.target.value)}
                    disabled={actioning}
                    placeholder="10 guests limit&#10;10 shots per guest&#10;Custom reveal time"
                    className="flex min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="planLimits" className="text-slate-300 text-xs">Limits (JSON Object)</Label>
                  <textarea
                    id="planLimits"
                    rows={6}
                    value={formLimits}
                    onChange={(e) => setFormLimits(e.target.value)}
                    disabled={actioning}
                    required
                    className="flex min-h-[120px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={actioning}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    <span>{actioning ? "Saving..." : "Save Plan"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingPlan(null)
                      setIsAdding(false)
                    }}
                    className="border-slate-800 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="p-6 bg-slate-900/30 border border-slate-800 border-dashed text-slate-500 text-center rounded-2xl h-64 flex flex-col justify-center items-center">
              <span>Select a plan to edit its limits or pricing configurations.</span>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
