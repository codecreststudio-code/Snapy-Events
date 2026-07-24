"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Plus, Edit2, Trash2, Loader2, Save, X, Ticket } from "lucide-react"
import { cn, toDatetimeLocalValue } from "@/lib/utils"
import { Coupon } from "@/lib/types"

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form state
  const [formCode, setFormCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState<"percentage" | "fixed">("percentage")
  const [formValue, setFormValue] = useState(0)
  const [formMinMonths, setFormMinMonths] = useState(1)
  const [formMaxUses, setFormMaxUses] = useState("")
  const [formActive, setFormActive] = useState(true)
  const [formValidFrom, setFormValidFrom] = useState("")
  const [formValidUntil, setFormValidUntil] = useState("")
  const [formMaxDiscount, setFormMaxDiscount] = useState("")
  const [formMinOrder, setFormMinOrder] = useState("")
  const [formStackable, setFormStackable] = useState(false)
  const [formFirstOnly, setFormFirstOnly] = useState(false)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/subscriptions/coupons")
      if (!res.ok) throw new Error("Failed to load coupons")
      const data = await res.json()
      setCoupons(data.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  const startAdd = () => {
    setIsAdding(true)
    setEditingCoupon(null)
    setFormCode("")
    setFormName("")
    setFormType("percentage")
    setFormValue(0)
    setFormMinMonths(1)
    setFormMaxUses("")
    setFormActive(true)
    setFormValidFrom(toDatetimeLocalValue(new Date()))
    setFormValidUntil("")
    setFormMaxDiscount("")
    setFormMinOrder("")
    setFormStackable(false)
    setFormFirstOnly(false)
  }

  const startEdit = (c: Coupon) => {
    setIsAdding(false)
    setEditingCoupon(c)
    setFormCode(c.code)
    setFormName(c.name || "")
    setFormType(c.discount_type)
    setFormValue(c.discount_value)
    setFormMinMonths(c.min_subscription_months)
    setFormMaxUses(c.max_uses ? String(c.max_uses) : "")
    setFormActive(c.is_active)
    setFormValidFrom(c.valid_from ? toDatetimeLocalValue(c.valid_from) : "")
    setFormValidUntil(c.valid_until ? toDatetimeLocalValue(c.valid_until) : "")
    setFormMaxDiscount(c.max_discount_amount ? String(c.max_discount_amount) : "")
    setFormMinOrder(c.min_order_value ? String(c.min_order_value) : "")
    setFormStackable(c.stackable || false)
    setFormFirstOnly(c.first_purchase_only || false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setActioning(true)

    const payload = {
      code: formCode.toUpperCase(), name: formName, discount_type: formType,
      discount_value: formValue, min_subscription_months: formMinMonths,
      max_uses: formMaxUses ? Number(formMaxUses) : null,
      is_active: formActive,
      valid_from: formValidFrom ? new Date(formValidFrom).toISOString() : new Date().toISOString(),
      valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : null,
      max_discount_amount: formMaxDiscount ? Number(formMaxDiscount) : null,
      min_order_value: formMinOrder ? Number(formMinOrder) : null,
      stackable: formStackable, first_purchase_only: formFirstOnly
    }

    try {
      if (isAdding) {
        const res = await fetch("/api/admin/subscriptions/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Failed to create coupon")
      } else {
        const res = await fetch(`/api/admin/subscriptions/coupons/${editingCoupon!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Failed to update coupon")
      }
      toast({ title: "Success", description: "Coupon saved successfully." })
      setEditingCoupon(null)
      setIsAdding(false)
      fetchCoupons()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  const handleDelete = async (c: Coupon) => {
    if (!confirm(`Are you sure you want to delete the coupon ${c.code}? This action cannot be undone.`)) return
    setActioning(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/coupons/${c.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete coupon")
      toast({ title: "Success", description: "Coupon deleted." })
      fetchCoupons()
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
          <h2 className="text-lg font-bold text-ink">Coupon Manager</h2>
          <Button onClick={startAdd} className="h-8 bg-mauve hover:bg-mauve-strong text-[#1a1410] text-xs font-bold gap-1">
            <Plus className="h-3.5 w-3.5" /> New Coupon
          </Button>
        </div>
        
        {loading ? (
          <div className="p-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-mauve" /></div>
        ) : coupons.length === 0 ? (
          <div className="p-16 border border-dashed border-hairline-dark bg-surface-card text-ink-tertiary text-center rounded-2xl text-xs font-semibold">
            <Ticket className="h-8 w-8 mx-auto mb-2 text-ink-tertiary" />
            No coupons configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupons.map(c => (
              <Card key={c.id} className="bg-surface-card border-hairline-dark shadow-sm hover:border-hairline-dark">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-ink flex items-center gap-2">
                        <span className="font-mono text-mauve border border-mauve/20 bg-mauve/10 px-2 rounded-md truncate">{c.code}</span>
                      </h3>
                      <div className="text-xs text-ink-secondary font-medium mt-1 truncate">{c.name}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(c)} className="h-7 w-7 p-0 text-ink-secondary hover:bg-mauve/5 rounded-lg"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-2xl font-black text-ink">
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}
                    </span>
                    <span className="text-xs text-ink-tertiary font-bold mb-1">OFF</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-hairline-dark text-[10px] font-semibold text-ink-secondary flex flex-wrap gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full border", c.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-ink/5 text-ink-secondary border-hairline-dark")}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="bg-ink/5 px-2 py-0.5 rounded-full">{c.used_count} uses</span>
                    {c.max_uses && <span className="bg-ink/5 px-2 py-0.5 rounded-full">Max {c.max_uses}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        {(editingCoupon || isAdding) ? (
          <Card className="bg-surface-card border-hairline-dark sticky top-6 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base text-ink font-bold">{isAdding ? "Create Coupon" : "Edit Coupon"}</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingCoupon(null) }} className="h-7 w-7 p-0 rounded-lg"><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Coupon Code</Label>
                  <Input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} required placeholder="SUMMER25" className="h-8 text-xs font-mono font-bold uppercase" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Internal Name</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Summer Sale 2026" className="h-8 text-xs font-medium" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Discount Type</Label>
                    <select value={formType} onChange={e => setFormType(e.target.value as any)} className="w-full h-8 px-2 rounded-md border border-hairline-dark text-xs font-medium">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Value</Label>
                    <Input type="number" value={formValue} onChange={e => setFormValue(Number(e.target.value))} required className="h-8 text-xs font-medium" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Max Discount (₹)</Label>
                    <Input type="number" value={formMaxDiscount} onChange={e => setFormMaxDiscount(e.target.value)} placeholder="No limit" className="h-8 text-xs font-medium" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Min Order Value (₹)</Label>
                    <Input type="number" value={formMinOrder} onChange={e => setFormMinOrder(e.target.value)} placeholder="0" className="h-8 text-xs font-medium" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Valid From</Label>
                    <Input type="datetime-local" value={formValidFrom} onChange={e => setFormValidFrom(e.target.value)} className="h-8 text-xs font-medium" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Valid Until</Label>
                    <Input type="datetime-local" value={formValidUntil} onChange={e => setFormValidUntil(e.target.value)} className="h-8 text-xs font-medium" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Max Uses (Total)</Label>
                  <Input type="number" value={formMaxUses} onChange={e => setFormMaxUses(e.target.value)} placeholder="Unlimited" className="h-8 text-xs font-medium" />
                </div>
                <div className="flex flex-col gap-2 py-2 border-t border-b border-hairline-dark">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="rounded text-mauve h-3.5 w-3.5" />
                    <span className="text-xs font-bold text-ink-secondary">Coupon Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formFirstOnly} onChange={e => setFormFirstOnly(e.target.checked)} className="rounded text-mauve h-3.5 w-3.5" />
                    <span className="text-xs font-bold text-ink-secondary">First Purchase Only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formStackable} onChange={e => setFormStackable(e.target.checked)} className="rounded text-mauve h-3.5 w-3.5" />
                    <span className="text-xs font-bold text-ink-secondary">Stackable with others</span>
                  </label>
                </div>
                <Button type="submit" disabled={actioning} className="w-full h-8 bg-mauve hover:bg-mauve-strong font-bold text-xs">
                  {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Coupon
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="p-8 border border-dashed border-hairline-dark bg-ink/5 text-ink-tertiary text-center rounded-xl text-xs font-semibold">
            Select a coupon to edit or create a new one.
          </div>
        )}
      </div>
    </div>
  )
}
