"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Plus, Edit2, Trash2, Loader2, Save, X, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { Addon, AddonCategory } from "@/lib/types"

const CATEGORY_LABELS: Record<AddonCategory, string> = {
  guest_boost: "Guest Boost",
  shot_boost: "Shot Boost",
  photo_limit_boost: "Photo Limit Boost",
  video_addon: "Video Add-on",
  voice_addon: "Voice Add-on",
}

export function AddonMarketplace() {
  const [addons, setAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form state
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formPriceInr, setFormPriceInr] = useState(0)
  const [formPriceUsd, setFormPriceUsd] = useState(0)
  const [formBilling, setFormBilling] = useState<"one_time" | "monthly" | "yearly" | "lifetime">("one_time")
  const [formActive, setFormActive] = useState(true)
  const [formCategory, setFormCategory] = useState<AddonCategory | "">("")
  // Photo Limit Boost uses -1 to mean "Unlimited" — tracked separately so the
  // number input can be disabled and the underlying value forced to -1.
  const [formUnlimited, setFormUnlimited] = useState(false)
  const [formValue, setFormValue] = useState<number | "">("")

  const fetchAddons = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/subscriptions/addons")
      if (!res.ok) throw new Error("Failed to load addons")
      const data = await res.json()
      setAddons(data.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAddons() }, [fetchAddons])

  const startAdd = () => {
    setIsAdding(true)
    setEditingAddon(null)
    setFormName("")
    setFormDesc("")
    setFormPriceInr(0)
    setFormPriceUsd(0)
    setFormBilling("one_time")
    setFormActive(true)
    setFormCategory("")
    setFormUnlimited(false)
    setFormValue("")
  }

  const startEdit = (a: Addon) => {
    setIsAdding(false)
    setEditingAddon(a)
    setFormName(a.name)
    setFormDesc(a.description || "")
    setFormPriceInr(a.price_inr)
    setFormPriceUsd(a.price_usd)
    setFormBilling(a.billing_type)
    setFormActive(a.is_active)
    setFormCategory(a.category || "")
    setFormUnlimited(a.value === -1)
    setFormValue(a.value !== null && a.value !== undefined && a.value !== -1 ? a.value : "")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setActioning(true)

    const resolvedValue = formCategory === "photo_limit_boost" && formUnlimited
      ? -1
      : formValue === "" ? null : Number(formValue)

    const payload = {
      name: formName, description: formDesc, price_inr: formPriceInr,
      price_usd: formPriceUsd, billing_type: formBilling, is_active: formActive,
      category: formCategory || null, value: resolvedValue,
    }

    try {
      if (isAdding) {
        const res = await fetch("/api/admin/subscriptions/addons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Failed to create addon")
      } else {
        const res = await fetch(`/api/admin/subscriptions/addons/${editingAddon!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Failed to update addon")
      }
      toast({ title: "Success", description: "Addon saved successfully." })
      setEditingAddon(null)
      setIsAdding(false)
      fetchAddons()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this addon?")) return
    setActioning(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/addons/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete addon")
      toast({ title: "Success", description: "Addon deleted." })
      fetchAddons()
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
          <h2 className="text-lg font-bold text-ink">Add-on Marketplace</h2>
          <Button onClick={startAdd} className="h-8 bg-mauve hover:bg-mauve-strong text-[#1a1410] text-xs font-bold gap-1">
            <Plus className="h-3.5 w-3.5" /> New Add-on
          </Button>
        </div>
        
        {loading ? (
          <div className="p-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-mauve" /></div>
        ) : addons.length === 0 ? (
          <div className="p-16 border border-dashed border-hairline-dark bg-surface-card text-ink-tertiary text-center rounded-2xl text-xs font-semibold">
            <Package className="h-8 w-8 mx-auto mb-2 text-ink-tertiary" />
            No add-ons configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addons.map(a => (
              <Card key={a.id} className="bg-surface-card border-hairline-dark shadow-sm hover:border-hairline-dark">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-ink truncate">{a.name}</h3>
                      <div className="text-xs text-ink-secondary font-medium line-clamp-2 mt-1">{a.description}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(a)} className="h-7 w-7 p-0 text-ink-secondary hover:bg-mauve/5 rounded-lg"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-2xl font-black text-ink">₹{a.price_inr}</span>
                    <span className="text-xs text-ink-tertiary font-bold mb-1 uppercase tracking-wider bg-ink/5 px-1.5 py-0.5 rounded-md">{a.billing_type.replace("_", " ")}</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-hairline-dark flex flex-wrap gap-1.5 items-center">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", a.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-ink/5 text-ink-secondary border-hairline-dark")}>
                      {a.is_active ? "Active" : "Inactive"}
                    </span>
                    {a.category && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-mauve/10 text-mauve border-mauve/20">
                        {CATEGORY_LABELS[a.category]}
                      </span>
                    )}
                    {a.category && a.value !== null && a.value !== undefined && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-ink/5 text-ink-secondary border-hairline-dark">
                        {a.value === -1 ? "Unlimited" : `value: ${a.value}`}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        {(editingAddon || isAdding) ? (
          <Card className="bg-surface-card border-hairline-dark sticky top-6 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base text-ink font-bold">{isAdding ? "Create Add-on" : "Edit Add-on"}</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingAddon(null) }} className="h-7 w-7 p-0 rounded-lg"><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Name</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="e.g. Extra 50 Guests" className="h-8 text-xs font-medium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Description</Label>
                  <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} className="h-8 text-xs font-medium" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Price (INR)</Label>
                    <Input type="number" value={formPriceInr} onChange={e => setFormPriceInr(Number(e.target.value))} required className="h-8 text-xs font-medium" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Price (USD)</Label>
                    <Input type="number" value={formPriceUsd} onChange={e => setFormPriceUsd(Number(e.target.value))} required className="h-8 text-xs font-medium" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Billing Type</Label>
                  <select value={formBilling} onChange={e => setFormBilling(e.target.value as any)} className="w-full h-8 px-2 rounded-md border border-hairline-dark text-xs font-medium">
                    <option value="one_time">One-time Purchase</option>
                    <option value="monthly">Recurring Monthly</option>
                    <option value="yearly">Recurring Yearly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div className="space-y-1 pt-2 border-t border-hairline-dark">
                  <Label className="text-xs font-bold text-ink-secondary">Category</Label>
                  <select
                    value={formCategory}
                    onChange={e => {
                      const next = e.target.value as AddonCategory | ""
                      setFormCategory(next)
                      if (next !== "photo_limit_boost") setFormUnlimited(false)
                    }}
                    className="w-full h-8 px-2 rounded-md border border-hairline-dark text-xs font-medium"
                  >
                    <option value="">None (legacy / uncategorized)</option>
                    <option value="guest_boost">Guest Boost</option>
                    <option value="shot_boost">Shot Boost</option>
                    <option value="photo_limit_boost">Photo Limit Boost</option>
                    <option value="video_addon">Video Add-on</option>
                    <option value="voice_addon">Voice Add-on</option>
                  </select>
                  <p className="text-[10px] text-ink-tertiary font-medium pt-0.5">
                    Drives where this add-on shows up in the event wizard and Billing page (guest limit, shot limit, photo limit tier, video unlock, voice unlock).
                  </p>
                </div>
                {formCategory && formCategory !== "video_addon" && formCategory !== "voice_addon" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">
                      {formCategory === "photo_limit_boost" ? "Photo Limit Tier" : "Tier Value"}
                    </Label>
                    {formCategory === "photo_limit_boost" && (
                      <div className="flex items-center gap-2 pb-1">
                        <input type="checkbox" checked={formUnlimited} onChange={e => setFormUnlimited(e.target.checked)} className="rounded text-mauve h-3.5 w-3.5" />
                        <span className="text-xs font-medium text-ink-secondary">Unlimited (value = -1)</span>
                      </div>
                    )}
                    <Input
                      type="number"
                      value={formValue}
                      disabled={formCategory === "photo_limit_boost" && formUnlimited}
                      onChange={e => setFormValue(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder={formCategory === "guest_boost" ? "e.g. 25 (guests)" : formCategory === "shot_boost" ? "e.g. 10 (shots/guest)" : "e.g. 50 (photos/guest)"}
                      className="h-8 text-xs font-medium"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 py-2 border-t border-b border-hairline-dark">
                  <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="rounded text-mauve h-3.5 w-3.5" />
                  <span className="text-xs font-bold text-ink-secondary">Add-on Active</span>
                </div>
                <Button type="submit" disabled={actioning} className="w-full h-8 bg-mauve hover:bg-mauve-strong font-bold text-xs">
                  {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Add-on
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="p-8 border border-dashed border-hairline-dark bg-ink/5 text-ink-tertiary text-center rounded-xl text-xs font-semibold">
            Select an add-on to edit or create a new one.
          </div>
        )}
      </div>
    </div>
  )
}
