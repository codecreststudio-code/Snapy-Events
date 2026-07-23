"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Plus, Edit2, Trash2, Loader2, Save, X, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { AutomationRule, Plan } from "@/lib/types"

export function AutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form state
  const [formName, setFormName] = useState("")
  const [formTrigger, setFormTrigger] = useState("")
  const [formActionType, setFormActionType] = useState("")
  const [formTargetPlan, setFormTargetPlan] = useState("")
  const [formPayload, setFormPayload] = useState("{}")
  const [formActive, setFormActive] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rulesRes, plansRes] = await Promise.all([
        fetch("/api/admin/subscriptions/automations"),
        fetch("/api/admin/subscriptions/plans")
      ])
      const rulesData = await rulesRes.json()
      const plansData = await plansRes.json()
      
      setRules(rulesData.data || [])
      setPlans(plansData.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const startAdd = () => {
    setIsAdding(true)
    setEditingRule(null)
    setFormName("")
    setFormTrigger("trial_expired")
    setFormActionType("downgrade_plan")
    setFormTargetPlan("")
    setFormPayload("{}")
    setFormActive(true)
  }

  const startEdit = (r: AutomationRule) => {
    setIsAdding(false)
    setEditingRule(r)
    setFormName(r.name)
    setFormTrigger(r.trigger_event)
    setFormActionType(r.action_type)
    setFormTargetPlan(r.target_plan || "")
    setFormPayload(JSON.stringify(r.action_payload, null, 2))
    setFormActive(r.is_active)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setActioning(true)

    let parsedPayload = {}
    try {
      parsedPayload = JSON.parse(formPayload)
    } catch {
      toast({ title: "Invalid JSON", description: "Action payload must be valid JSON.", variant: "destructive" })
      setActioning(false)
      return
    }

    const payload = {
      name: formName, trigger_event: formTrigger, action_type: formActionType,
      target_plan: formTargetPlan || null, action_payload: parsedPayload, is_active: formActive
    }

    try {
      if (isAdding) {
        const res = await fetch("/api/admin/subscriptions/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Failed to create automation rule")
      } else {
        const res = await fetch(`/api/admin/subscriptions/automations/${editingRule!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Failed to update automation rule")
      }
      toast({ title: "Success", description: "Rule saved successfully." })
      setEditingRule(null)
      setIsAdding(false)
      fetchData()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return
    setActioning(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/automations/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete rule")
      toast({ title: "Success", description: "Rule deleted." })
      fetchData()
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
          <h2 className="text-lg font-bold text-ink">Automation Engine</h2>
          <Button onClick={startAdd} className="h-8 bg-mauve hover:bg-mauve-strong text-[#faf6ed] text-xs font-bold gap-1">
            <Plus className="h-3.5 w-3.5" /> New Rule
          </Button>
        </div>
        
        {loading ? (
          <div className="p-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-mauve" /></div>
        ) : rules.length === 0 ? (
          <div className="p-16 border border-dashed border-hairline-dark bg-surface-card text-ink-tertiary text-center rounded-2xl text-xs font-semibold">
            <Bot className="h-8 w-8 mx-auto mb-2 text-ink-tertiary" />
            No automation rules configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {rules.map(r => (
              <Card key={r.id} className="bg-surface-card border-hairline-dark shadow-sm hover:border-hairline-dark">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-ink truncate">{r.name}</h3>
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0", r.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-ink/5 text-ink-secondary border-hairline-dark")}>
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-ink-secondary flex-wrap">
                      <span className="text-ink-tertiary">WHEN</span>
                      <span className="font-mono bg-ink/5 px-1 rounded truncate max-w-[160px]">{r.trigger_event}</span>
                      <span className="text-ink-tertiary">THEN</span>
                      <span className="font-mono bg-mauve/10 text-mauve px-1 rounded truncate max-w-[160px]">{r.action_type}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(r)} className="h-7 w-7 p-0 text-ink-secondary hover:bg-mauve/5 rounded-lg"><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        {(editingRule || isAdding) ? (
          <Card className="bg-surface-card border-hairline-dark sticky top-6 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base text-ink font-bold">{isAdding ? "Create Rule" : "Edit Rule"}</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingRule(null) }} className="h-7 w-7 p-0 rounded-lg"><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Rule Name</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} required placeholder="e.g. Downgrade after trial" className="h-8 text-xs font-medium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Trigger Event</Label>
                  <select value={formTrigger} onChange={e => setFormTrigger(e.target.value)} className="w-full h-8 px-2 rounded-md border border-hairline-dark text-xs font-medium">
                    <option value="trial_expired">Trial Expired</option>
                    <option value="subscription_cancelled">Subscription Cancelled</option>
                    <option value="payment_failed">Payment Failed</option>
                    <option value="event_completed">Event Completed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Action to Perform</Label>
                  <select value={formActionType} onChange={e => setFormActionType(e.target.value)} className="w-full h-8 px-2 rounded-md border border-hairline-dark text-xs font-medium">
                    <option value="downgrade_plan">Downgrade Plan</option>
                    <option value="send_email">Send Email Notification</option>
                    <option value="extend_trial">Extend Trial</option>
                  </select>
                </div>
                
                {formActionType === "downgrade_plan" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-ink-secondary">Target Plan (Fallback)</Label>
                    <select value={formTargetPlan} onChange={e => setFormTargetPlan(e.target.value)} className="w-full h-8 px-2 rounded-md border border-hairline-dark text-xs font-medium">
                      <option value="">Select Plan...</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Action Payload (JSON)</Label>
                  <textarea value={formPayload} onChange={e => setFormPayload(e.target.value)} rows={4} className="w-full font-mono rounded-md border border-hairline-dark px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-mauve/50" />
                </div>
                
                <div className="flex items-center gap-2 py-2 border-t border-b border-hairline-dark">
                  <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="rounded text-mauve h-3.5 w-3.5" />
                  <span className="text-xs font-bold text-ink-secondary">Rule Active</span>
                </div>
                <Button type="submit" disabled={actioning} className="w-full h-8 bg-mauve hover:bg-mauve-strong font-bold text-xs">
                  {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Rule
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="p-8 border border-dashed border-hairline-dark bg-ink/5 text-ink-tertiary text-center rounded-xl text-xs font-semibold">
            Select a rule to edit or create a new one.
          </div>
        )}
      </div>
    </div>
  )
}
