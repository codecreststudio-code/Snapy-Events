"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Sparkles, Plus, Edit2, Trash2, Check, RefreshCw, Loader2, Save, X, Sliders } from "lucide-react"

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

  // Addons states
  const [guestBoosts, setGuestBoosts] = useState<any[]>([])
  const [shotBoosts, setShotBoosts] = useState<any[]>([])
  const [addonLoading, setAddonLoading] = useState(true)
  const [addonSaving, setAddonSaving] = useState(false)

  // Editing state for addons
  const [editingAddonType, setEditingAddonType] = useState<'guest' | 'shot' | null>(null)
  const [editingAddonIndex, setEditingAddonIndex] = useState<number | null>(null)
  const [addonFormLabel, setAddonFormLabel] = useState("")
  const [addonFormValue, setAddonFormValue] = useState(0)
  const [addonFormPrice, setAddonFormPrice] = useState(0)
  const [isAddingAddon, setIsAddingAddon] = useState(false)

  const fetchAddons = async () => {
    setAddonLoading(true)
    try {
      const res = await fetch("/api/payments/addons")
      if (res.ok) {
        const data = await res.json()
        setGuestBoosts(data.guest_boosts || [])
        setShotBoosts(data.shot_boosts || [])
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load addons configuration.", variant: "destructive" })
    } finally {
      setAddonLoading(false)
    }
  }

  const handleSaveAddons = async (type: 'guest' | 'shot') => {
    setAddonSaving(true)
    const key = type === 'guest' ? 'guest_boosts' : 'shot_boosts'
    const value = type === 'guest' ? guestBoosts : shotBoosts
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) throw new Error("Failed to save addon settings")
      toast({ title: "Success", description: `${type === 'guest' ? 'Guest' : 'Shots'} boost addons saved successfully.` })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setAddonSaving(false)
    }
  }

  const startAddAddon = (type: 'guest' | 'shot') => {
    setEditingAddonType(type)
    setEditingAddonIndex(null)
    setIsAddingAddon(true)
    setAddonFormLabel("")
    setAddonFormValue(0)
    setAddonFormPrice(0)
  }

  const startEditAddon = (type: 'guest' | 'shot', index: number, item: any) => {
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

    const targetList = editingAddonType === 'guest' ? guestBoosts : shotBoosts
    const setList = editingAddonType === 'guest' ? setGuestBoosts : setShotBoosts

    const newItem = {
      label: addonFormLabel,
      value: addonFormValue,
      price: addonFormPrice,
    }

    let updatedList = [...targetList]
    if (isAddingAddon) {
      updatedList.push(newItem)
    } else if (editingAddonIndex !== null) {
      updatedList[editingAddonIndex] = newItem
    }

    // Sort by value ascending
    updatedList.sort((a, b) => a.value - b.value)

    setList(updatedList)
    setEditingAddonType(null)
    setEditingAddonIndex(null)
    setIsAddingAddon(false)
  }

  const handleDeleteAddonItem = (type: 'guest' | 'shot', index: number) => {
    if (!confirm("Are you sure you want to remove this addon tier?")) return
    const targetList = type === 'guest' ? guestBoosts : shotBoosts
    const setList = type === 'guest' ? setGuestBoosts : setShotBoosts
    
    const updatedList = targetList.filter((_, idx) => idx !== index)
    setList(updatedList)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [plansRes, subsRes] = await Promise.all([
        fetch("/api/admin/plans"),
        fetch("/api/admin/users"), 
      ])
      
      if (!plansRes.ok) throw new Error("Failed to load plans")
      const plansData = await plansRes.json()
      setPlans(plansData.data || [])

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
    fetchAddons()
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
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pricing & Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">Define pricing tiers, configure usage limits, and monitor active premium users.</p>
        </div>
        <Button onClick={startAdd} className="h-9 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          <span>Create Plan</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Plans list */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <span>Active Tiers & Pricing</span>
          </h3>

          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : plans.length === 0 ? (
            <div className="p-16 border border-dashed border-slate-200 bg-white text-slate-400 text-center rounded-2xl text-xs font-semibold">
              No plans registered. Click 'Create Plan' to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((p) => (
                <Card key={p.id} className="bg-white border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-sm">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-slate-800 text-base">{p.name}</h4>
                      <div className="space-x-1">
                        <Button onClick={() => startEdit(p)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDeletePlan(p.id)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 min-h-[32px] font-semibold leading-relaxed">{p.description}</p>
                    <div className="mt-3 text-2xl font-bold text-slate-800">₹{p.price_inr.toLocaleString()}</div>
                    
                    <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Limits Configuration:</span>
                      <ul className="text-xs text-slate-600 space-y-1.5 font-semibold">
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
            <h3 className="text-base font-bold text-slate-850 mb-4">Recent Subscriptions</h3>
            <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
              <CardContent className="p-0">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="p-4">Subscriber</th>
                      <th className="p-4">Plan Tier</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Valid Until</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {subs.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{s.organization.name}</td>
                        <td className="p-4 uppercase text-violet-600 font-bold">{s.plan_id}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {s.status}
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-400 font-semibold">{new Date(s.current_period_end).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Add-ons Configuration */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="h-5 w-5 text-violet-650" />
                <span>Add-On Quota Boosts Configuration</span>
              </h3>
              {addonLoading && <Loader2 className="h-4 w-4 animate-spin text-violet-600" />}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Guest limit boosts card */}
              <Card className="bg-white border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Guest Limit Boosts</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Customize tiers for increasing event guest limits.</p>
                    </div>
                    <Button 
                      onClick={() => handleSaveAddons('guest')} 
                      disabled={addonSaving || addonLoading}
                      size="sm" 
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 px-3 rounded-lg"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Tiers</span>
                    </Button>
                  </div>

                  {addonLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-violet-600" /></div>
                  ) : guestBoosts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">No custom guest boosts configured.</div>
                  ) : (
                    <div className="space-y-2.5">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-450 font-bold uppercase tracking-wider border-b border-slate-100">
                            <th className="pb-2">Value</th>
                            <th className="pb-2">Display Label</th>
                            <th className="pb-2">Price (INR)</th>
                            <th className="pb-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-55 text-slate-600 font-semibold">
                          {guestBoosts.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 font-bold text-slate-850">+{item.value}</td>
                              <td className="py-2.5 font-medium">{item.label}</td>
                              <td className="py-2.5 text-slate-900">₹{item.price}</td>
                              <td className="py-2.5 text-right space-x-1">
                                <Button onClick={() => startEditAddon('guest', idx, item)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100 rounded-md">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button onClick={() => handleDeleteAddonItem('guest', idx)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-md">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add/Edit inline form */}
                  {editingAddonType === 'guest' ? (
                    <form onSubmit={handleSaveAddonItem} className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {isAddingAddon ? "Add Guest Boost" : "Edit Guest Boost"}
                        </h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingAddonType(null)} className="h-6 w-6 p-0 hover:bg-slate-100 rounded-md">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label htmlFor="guestLabel" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Display Label</Label>
                          <Input
                            id="guestLabel"
                            value={addonFormLabel}
                            onChange={(e) => setAddonFormLabel(e.target.value)}
                            required
                            placeholder="e.g. +10 guests"
                            className="bg-white border-slate-250 text-slate-800 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="guestValue" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Limit Value</Label>
                          <Input
                            id="guestValue"
                            type="number"
                            value={addonFormValue}
                            onChange={(e) => setAddonFormValue(parseInt(e.target.value) || 0)}
                            required
                            placeholder="e.g. 10"
                            className="bg-white border-slate-250 text-slate-800 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="guestPrice" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Price (INR)</Label>
                          <Input
                            id="guestPrice"
                            type="number"
                            value={addonFormPrice}
                            onChange={(e) => setAddonFormPrice(parseInt(e.target.value) || 0)}
                            required
                            placeholder="e.g. 199"
                            className="bg-white border-slate-250 text-slate-800 text-xs h-9"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditingAddonType(null)} className="h-8 text-xs font-bold">Cancel</Button>
                        <Button type="submit" size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold">Apply</Button>
                      </div>
                    </form>
                  ) : (
                    <Button onClick={() => startAddAddon('guest')} variant="outline" size="sm" className="w-full text-xs font-semibold mt-4 gap-1 border-slate-200 hover:bg-slate-50">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Guest Boost Option</span>
                    </Button>
                  )}
                </div>
              </Card>

              {/* Shots limit boosts card */}
              <Card className="bg-white border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Shots Limit Boosts</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Customize tiers for increasing shots limits per guest.</p>
                    </div>
                    <Button 
                      onClick={() => handleSaveAddons('shot')} 
                      disabled={addonSaving || addonLoading}
                      size="sm" 
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 px-3 rounded-lg"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Tiers</span>
                    </Button>
                  </div>

                  {addonLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-violet-600" /></div>
                  ) : shotBoosts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">No custom shots boosts configured.</div>
                  ) : (
                    <div className="space-y-2.5">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-450 font-bold uppercase tracking-wider border-b border-slate-100">
                            <th className="pb-2">Value</th>
                            <th className="pb-2">Display Label</th>
                            <th className="pb-2">Price (INR)</th>
                            <th className="pb-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-55 text-slate-600 font-semibold">
                          {shotBoosts.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 font-bold text-slate-850">+{item.value}</td>
                              <td className="py-2.5 font-medium">{item.label}</td>
                              <td className="py-2.5 text-slate-900">₹{item.price}</td>
                              <td className="py-2.5 text-right space-x-1">
                                <Button onClick={() => startEditAddon('shot', idx, item)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100 rounded-md">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button onClick={() => handleDeleteAddonItem('shot', idx)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 rounded-md">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add/Edit inline form */}
                  {editingAddonType === 'shot' ? (
                    <form onSubmit={handleSaveAddonItem} className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {isAddingAddon ? "Add Shots Boost" : "Edit Shots Boost"}
                        </h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingAddonType(null)} className="h-6 w-6 p-0 hover:bg-slate-100 rounded-md">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label htmlFor="shotLabel" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Display Label</Label>
                          <Input
                            id="shotLabel"
                            value={addonFormLabel}
                            onChange={(e) => setAddonFormLabel(e.target.value)}
                            required
                            placeholder="e.g. +5 shots/guest"
                            className="bg-white border-slate-250 text-slate-800 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="shotValue" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Limit Value</Label>
                          <Input
                            id="shotValue"
                            type="number"
                            value={addonFormValue}
                            onChange={(e) => setAddonFormValue(parseInt(e.target.value) || 0)}
                            required
                            placeholder="e.g. 5"
                            className="bg-white border-slate-250 text-slate-800 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="shotPrice" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Price (INR)</Label>
                          <Input
                            id="shotPrice"
                            type="number"
                            value={addonFormPrice}
                            onChange={(e) => setAddonFormPrice(parseInt(e.target.value) || 0)}
                            required
                            placeholder="e.g. 99"
                            className="bg-white border-slate-250 text-slate-800 text-xs h-9"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditingAddonType(null)} className="h-8 text-xs font-bold">Cancel</Button>
                        <Button type="submit" size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold">Apply</Button>
                      </div>
                    </form>
                  ) : (
                    <Button onClick={() => startAddAddon('shot')} variant="outline" size="sm" className="w-full text-xs font-semibold mt-4 gap-1 border-slate-200 hover:bg-slate-50">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Shots Boost Option</span>
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Editor Form */}
        <div>
          {(editingPlan || isAdding) ? (
            <Card className="bg-white border-slate-200 p-6 sticky top-6 shadow-sm">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-base text-slate-800 font-bold">
                  {isAdding ? "Create new plan" : `Edit plan: ${formName}`}
                </CardTitle>
                <CardDescription className="text-slate-400 text-[10px] font-semibold leading-relaxed">
                  Provide price, feature descriptions, and quotas JSON.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="planId" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Plan ID (Unique Slug)</Label>
                  <Input
                    id="planId"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    disabled={!isAdding || actioning}
                    required
                    placeholder="e.g. starter"
                    className="bg-white border-slate-250 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="planName" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Plan Name</Label>
                  <Input
                    id="planName"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={actioning}
                    required
                    placeholder="e.g. Starter"
                    className="bg-white border-slate-250 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="planDesc" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Description</Label>
                  <Input
                    id="planDesc"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    disabled={actioning}
                    placeholder="e.g. Best for small events"
                    className="bg-white border-slate-250 text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="priceInr" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Price (INR)</Label>
                    <Input
                      id="priceInr"
                      type="number"
                      value={formPriceInr}
                      onChange={(e) => setFormPriceInr(parseInt(e.target.value) || 0)}
                      disabled={actioning}
                      required
                      className="bg-white border-slate-250 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="priceUsd" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Price (USD)</Label>
                    <Input
                      id="priceUsd"
                      type="number"
                      value={formPriceUsd}
                      onChange={(e) => setFormPriceUsd(parseInt(e.target.value) || 0)}
                      disabled={actioning}
                      required
                      className="bg-white border-slate-250 text-slate-800"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="planFeatures" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Features (One per line)</Label>
                  <textarea
                    id="planFeatures"
                    rows={4}
                    value={formFeatures}
                    onChange={(e) => setFormFeatures(e.target.value)}
                    disabled={actioning}
                    placeholder="10 guests limit&#10;10 shots per guest&#10;Custom reveal time"
                    className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="planLimits" className="text-slate-500 text-xs font-bold uppercase tracking-wider">Limits (JSON Object)</Label>
                  <textarea
                    id="planLimits"
                    rows={6}
                    value={formLimits}
                    onChange={(e) => setFormLimits(e.target.value)}
                    disabled={actioning}
                    required
                    className="flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-850 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 shadow-sm"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={actioning}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold"
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
                    className="border-slate-200 hover:bg-slate-50 font-bold"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="p-6 bg-slate-50 border border-slate-200 border-dashed text-slate-400 text-center rounded-2xl h-64 flex flex-col justify-center items-center text-xs font-semibold leading-relaxed">
              <span>Select a plan to edit its limits or pricing configurations.</span>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

