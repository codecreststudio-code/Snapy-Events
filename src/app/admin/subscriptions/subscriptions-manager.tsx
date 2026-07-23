"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Edit2, Loader2, Save, X, Building2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, AlertCircle, Filter, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Plan } from "@/lib/types"

type SubscriptionItem = {
  id: string
  user_id: string
  plan_id: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancelled_at: string | null
  razorpay_subscription_id: string | null
  created_at: string
  user: { id: string; full_name: string; email?: string } | null
  plan: { id: string; name: string; price_inr: number; price_usd?: number } | null
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ElementType; cls: string }> = {
    active:   { icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    past_due: { icon: AlertCircle,  cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    canceled: { icon: XCircle,      cls: "bg-red-500/10 text-red-400 border-red-500/20" },
    paused:   { icon: Clock,        cls: "bg-ink/5 text-ink-secondary border-hairline-dark" },
  }
  const { icon: Icon, cls } = cfg[status] ?? cfg.paused
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", cls)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

export function SubscriptionsManager() {
  const [subs, setSubs] = useState<SubscriptionItem[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  
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

  useEffect(() => {
    fetch("/api/admin/subscriptions/plans").then(r => r.json()).then(d => setPlans(d.data || []))
  }, [])

  const fetchSubs = useCallback(async (page = 1, status = "", planId = "") => {
    setLoading(true)
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
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubs(subsPage, filterStatus, filterPlan)
  }, [subsPage, filterStatus, filterPlan, fetchSubs])

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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-surface-card border border-hairline-dark rounded-xl p-4 shadow-sm">
        <Filter className="h-4 w-4 text-ink-tertiary shrink-0" />
        <select
          value={filterStatus}
          onChange={e => { setSubsPage(1); setFilterStatus(e.target.value) }}
          className="bg-surface-card border border-hairline-dark rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-secondary shadow-sm focus:outline-none focus:ring-1 focus:ring-mauve/50"
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
          className="bg-surface-card border border-hairline-dark rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-secondary shadow-sm focus:outline-none focus:ring-1 focus:ring-mauve/50"
        >
          <option value="">All Plans</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(""); setFilterPlan(""); setSubsPage(1) }} className="h-8 gap-1 text-ink-secondary text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
        <div className="ml-auto text-xs text-ink-tertiary font-semibold">
          {subsTotal} subscription{subsTotal !== 1 ? "s" : ""} found
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="bg-surface-card border-hairline-dark shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-mauve" /></div>
            ) : subs.length === 0 ? (
              <div className="p-16 text-center text-ink-tertiary text-xs font-semibold">No subscriptions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-hairline-dark text-ink-tertiary font-bold uppercase tracking-wider bg-ink/5">
                      <th className="p-4">User</th>
                      <th className="p-4">Plan</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Renews</th>
                      <th className="p-4 text-right">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline-dark font-medium text-ink-secondary">
                    {subs.map(sub => (
                      <tr key={sub.id} onClick={() => startEditSub(sub)} className={cn("hover:bg-mauve/5 transition-colors cursor-pointer", editingSub?.id === sub.id && "bg-mauve/10")}>
                        <td className="p-4 min-w-[160px]">
                          <div className="font-bold text-ink truncate">{sub.user?.full_name || sub.user?.email || "—"}</div>
                          <div className="text-[10px] text-ink-tertiary mt-0.5 font-semibold">{sub.user_id.slice(0, 8)}…</div>
                        </td>
                        <td className="p-4 font-bold text-mauve uppercase whitespace-nowrap">{sub.plan?.name ?? sub.plan_id}</td>
                        <td className="p-4 whitespace-nowrap">
                          <StatusBadge status={sub.status} />
                          {sub.cancel_at_period_end && <span className="ml-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">Cancels at end</span>}
                        </td>
                        <td className="p-4 text-ink-tertiary whitespace-nowrap">
                          {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Per Event"}
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-ink-tertiary hover:text-mauve hover:bg-mauve/10 rounded-lg"><Edit2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          {subsTotalPages > 1 && (
            <div className="p-4 border-t border-hairline-dark flex items-center justify-between">
              <span className="text-xs text-ink-tertiary font-semibold">Page {subsPage} of {subsTotalPages}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={subsPage <= 1} onClick={() => setSubsPage(p => p - 1)} className="h-7 w-7 p-0 border-hairline-dark"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={subsPage >= subsTotalPages} onClick={() => setSubsPage(p => p + 1)} className="h-7 w-7 p-0 border-hairline-dark"><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </Card>

        {/* Edit Panel */}
        {editingSub ? (
          <Card className="bg-surface-card border-hairline-dark p-6 sticky top-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-ink text-sm">Edit Subscription</h4>
                <p className="text-[10px] text-ink-tertiary font-semibold mt-0.5">{editingSub.user?.full_name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingSub(null)} className="h-7 w-7 p-0 hover:bg-mauve/5 rounded-lg"><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleSaveSub} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-ink-secondary text-xs font-bold uppercase tracking-wider">Plan Tier</Label>
                <select value={subNewPlan} onChange={e => setSubNewPlan(e.target.value)} className="w-full bg-surface-card border border-hairline-dark rounded-lg px-3 py-2 text-xs font-semibold text-ink-secondary">
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.price_inr})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-ink-secondary text-xs font-bold uppercase tracking-wider">Status</Label>
                <select value={subNewStatus} onChange={e => setSubNewStatus(e.target.value)} className="w-full bg-surface-card border border-hairline-dark rounded-lg px-3 py-2 text-xs font-semibold text-ink-secondary">
                  <option value="active">Active</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <input type="checkbox" id="cancelAtEnd" checked={subCancelAtEnd} onChange={e => setSubCancelAtEnd(e.target.checked)} className="h-4 w-4 accent-amber-600" />
                <Label htmlFor="cancelAtEnd" className="text-xs font-semibold text-amber-400 cursor-pointer">Cancel at period end</Label>
              </div>
              <div className="bg-ink/5 border border-hairline-dark rounded-lg p-3 space-y-1 text-xs font-semibold">
                <div className="flex justify-between text-ink-tertiary"><span>Subscription ID</span><span className="font-mono text-ink-secondary">{editingSub.id.slice(0, 8)}…</span></div>
                <div className="flex justify-between text-ink-tertiary"><span>Created</span><span>{new Date(editingSub.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
                {editingSub.razorpay_subscription_id && (
                  <div className="flex justify-between text-ink-tertiary"><span>Razorpay ID</span><span className="font-mono text-[10px] text-ink-secondary">{editingSub.razorpay_subscription_id}</span></div>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={subActioning} className="flex-1 bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-bold text-xs h-9">
                  <Save className="h-3.5 w-3.5 mr-1.5" />{subActioning ? "Saving…" : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingSub(null)} className="border-hairline-dark font-bold text-xs h-9">Cancel</Button>
              </div>
            </form>
          </Card>
        ) : (
          <div className="p-6 bg-ink/5 border border-hairline-dark border-dashed text-ink-tertiary text-center rounded-2xl h-64 flex flex-col justify-center items-center text-xs font-semibold">
            <Building2 className="h-8 w-8 mb-3 text-ink-tertiary" />
            <span>Click a subscription row to edit its plan or status.</span>
          </div>
        )}
      </div>
    </div>
  )
}
