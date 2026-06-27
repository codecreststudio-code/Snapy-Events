"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Plus, Edit2, Trash2, Loader2, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Plan } from "@/lib/types"

export function PlanBuilder() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form state
  const [formId, setFormId] = useState("")
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formPriceInr, setFormPriceInr] = useState(0)
  const [formPriceUsd, setFormPriceUsd] = useState(0)
  const [formInterval, setFormInterval] = useState<"monthly" | "yearly">("monthly")
  const [formTrial, setFormTrial] = useState(0)
  const [formTheme, setFormTheme] = useState("")
  const [formBestValue, setFormBestValue] = useState(false)
  const [formActive, setFormActive] = useState(true)
  const [formFeatures, setFormFeatures] = useState("")
  const [formLimits, setFormLimits] = useState("{}")

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
    setFormInterval("monthly")
    setFormTrial(0)
    setFormTheme("")
    setFormBestValue(false)
    setFormActive(true)
    setFormFeatures("")
    setFormLimits(JSON.stringify({ events_limit: 5, storage_limit_gb: 10, photo_limit: 100 }, null, 2))
  }

  const startEdit = (p: Plan) => {
    setIsAdding(false)
    setEditingPlan(p)
    setFormId(p.id)
    setFormName(p.name)
    setFormDesc(p.description || "")
    setFormPriceInr(p.price_inr)
    setFormPriceUsd(p.price_usd)
    setFormInterval(p.billing_interval)
    setFormTrial(p.trial_days || 0)
    setFormTheme(p.theme_color || "")
    setFormBestValue(p.best_value || false)
    setFormActive(p.is_active)
    setFormFeatures(p.features.join("\n"))
    setFormLimits(JSON.stringify(p.limits, null, 2))
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
      id: formId, name: formName, description: formDesc, price_inr: formPriceInr,
      price_usd: formPriceUsd, billing_interval: formInterval, trial_days: formTrial,
      theme_color: formTheme, best_value: formBestValue, is_active: formActive,
      features: formFeatures.split("\n").map(f => f.trim()).filter(Boolean),
      limits: parsedLimits,
    }

    try {
      if (isAdding) {
        const res = await fetch("/api/admin/subscriptions/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Failed to create plan")
      } else {
        const res = await fetch(`/api/admin/subscriptions/plans/${formId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Plan Builder</h2>
          <Button onClick={startAdd} className="h-8 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold gap-1">
            <Plus className="h-3.5 w-3.5" /> New Plan
          </Button>
        </div>
        
        {loading ? (
          <div className="p-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>
        ) : plans.length === 0 ? (
          <div className="p-16 border border-dashed border-slate-200 bg-white text-slate-400 text-center rounded-2xl text-xs font-semibold">
            No plans found. Create one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map(p => (
              <Card key={p.id} className="bg-white border-slate-200 shadow-sm hover:border-slate-300">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-extrabold text-slate-800">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", p.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200")}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                        {p.best_value && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-100">Best Value</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(p)} className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100 rounded-lg"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 min-h-[32px]">{p.description}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-2xl font-black text-slate-900">₹{p.price_inr}</span>
                    <span className="text-xs text-slate-400 font-bold mb-1">/{p.billing_interval}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        {(editingPlan || isAdding) ? (
          <Card className="bg-white border-slate-200 sticky top-6 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base text-slate-800 font-bold">{isAdding ? "Create Plan" : "Edit Plan"}</CardTitle>
                  <CardDescription className="text-xs">Configure the subscription tier</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingPlan(null) }} className="h-7 w-7 p-0 rounded-lg">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-500">Plan ID / Slug</Label>
                  <Input value={formId} onChange={e => setFormId(e.target.value)} disabled={!isAdding} required className="h-8 text-xs font-medium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-500">Name</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} required className="h-8 text-xs font-medium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-500">Description</Label>
                  <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} className="h-8 text-xs font-medium" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">Price (INR)</Label>
                    <Input type="number" value={formPriceInr} onChange={e => setFormPriceInr(Number(e.target.value))} required className="h-8 text-xs font-medium" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">Price (USD)</Label>
                    <Input type="number" value={formPriceUsd} onChange={e => setFormPriceUsd(Number(e.target.value))} required className="h-8 text-xs font-medium" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">Interval</Label>
                    <select value={formInterval} onChange={e => setFormInterval(e.target.value as any)} className="w-full h-8 px-2 rounded-md border border-slate-200 text-xs font-medium">
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500">Trial Days</Label>
                    <Input type="number" value={formTrial} onChange={e => setFormTrial(Number(e.target.value))} className="h-8 text-xs font-medium" />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 py-2 border-t border-b border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-600 h-3.5 w-3.5" />
                    <span className="text-xs font-bold text-slate-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formBestValue} onChange={e => setFormBestValue(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-600 h-3.5 w-3.5" />
                    <span className="text-xs font-bold text-slate-700">Best Value</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-500">Features (one per line)</Label>
                  <textarea value={formFeatures} onChange={e => setFormFeatures(e.target.value)} rows={3} className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-medium resize-none focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-500">Limits (JSON)</Label>
                  <textarea value={formLimits} onChange={e => setFormLimits(e.target.value)} rows={5} className="w-full font-mono rounded-md border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
                <Button type="submit" disabled={actioning} className="w-full h-8 bg-violet-600 hover:bg-violet-700 font-bold text-xs">
                  {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Plan
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="p-8 border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-center rounded-xl text-xs font-semibold">
            Select a plan to edit or create a new one.
          </div>
        )}
      </div>
    </div>
  )
}
