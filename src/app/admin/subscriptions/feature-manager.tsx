"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { toast } from "@/lib/components/ui/toaster"
import { Plus, Edit2, Trash2, Loader2, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Feature } from "@/lib/types"

export function FeatureManager() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form state
  const [formId, setFormId] = useState("")
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formType, setFormType] = useState<"boolean" | "quota" | "string">("boolean")
  const [formActive, setFormActive] = useState(true)
  const [formBeta, setFormBeta] = useState(false)

  const fetchFeatures = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/subscriptions/features")
      if (!res.ok) throw new Error("Failed to load features")
      const data = await res.json()
      setFeatures(data.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFeatures() }, [fetchFeatures])

  const startAdd = () => {
    setIsAdding(true)
    setEditingFeature(null)
    setFormId("")
    setFormName("")
    setFormDesc("")
    setFormType("boolean")
    setFormActive(true)
    setFormBeta(false)
  }

  const startEdit = (f: Feature) => {
    setIsAdding(false)
    setEditingFeature(f)
    setFormId(f.id)
    setFormName(f.name)
    setFormDesc(f.description || "")
    setFormType(f.type)
    setFormActive(f.is_active)
    setFormBeta(f.is_beta)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setActioning(true)

    const payload = {
      id: formId, name: formName, description: formDesc,
      type: formType, is_active: formActive, is_beta: formBeta
    }

    try {
      if (isAdding) {
        const res = await fetch("/api/admin/subscriptions/features", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Failed to create feature")
      } else {
        const res = await fetch(`/api/admin/subscriptions/features/${formId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Failed to update feature")
      }
      toast({ title: "Success", description: "Feature saved successfully." })
      setEditingFeature(null)
      setIsAdding(false)
      fetchFeatures()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feature?")) return
    setActioning(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/features/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete feature")
      toast({ title: "Success", description: "Feature deleted." })
      fetchFeatures()
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
          <h2 className="text-lg font-bold text-ink">Feature Manager</h2>
          <Button onClick={startAdd} className="h-8 bg-mauve hover:bg-mauve-strong text-[#faf6ed] text-xs font-bold gap-1">
            <Plus className="h-3.5 w-3.5" /> New Feature
          </Button>
        </div>
        
        {loading ? (
          <div className="p-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-mauve" /></div>
        ) : features.length === 0 ? (
          <div className="p-16 border border-dashed border-hairline-dark bg-surface-card text-ink-tertiary text-center rounded-2xl text-xs font-semibold">
            No features configured yet.
          </div>
        ) : (
          <div className="bg-surface-card border border-hairline-dark rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hairline-dark bg-ink/5 text-ink-secondary font-bold uppercase tracking-wider">
                  <th className="p-3">Feature</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-dark font-medium text-ink-secondary">
                {features.map(f => (
                  <tr key={f.id} className="hover:bg-mauve/5 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-ink">{f.name}</div>
                      <div className="text-[10px] text-ink-tertiary font-mono mt-0.5">{f.id}</div>
                    </td>
                    <td className="p-3 uppercase text-[10px] tracking-wider font-bold text-ink-secondary">{f.type}</td>
                    <td className="p-3">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", f.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-ink/5 text-ink-secondary border-hairline-dark")}>
                        {f.is_active ? "Active" : "Inactive"}
                      </span>
                      {f.is_beta && <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">Beta</span>}
                    </td>
                    <td className="p-3 text-right flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(f)} className="h-7 w-7 p-0 text-ink-secondary hover:bg-mauve/5 rounded-lg"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)} className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        {(editingFeature || isAdding) ? (
          <Card className="bg-surface-card border-hairline-dark sticky top-6 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base text-ink font-bold">{isAdding ? "Create Feature" : "Edit Feature"}</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingFeature(null) }} className="h-7 w-7 p-0 rounded-lg"><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Feature ID / Slug</Label>
                  <Input value={formId} onChange={e => setFormId(e.target.value)} disabled={!isAdding} required className="h-8 text-xs font-medium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Name</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} required className="h-8 text-xs font-medium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Description</Label>
                  <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} className="h-8 text-xs font-medium" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-ink-secondary">Type</Label>
                  <select value={formType} onChange={e => setFormType(e.target.value as any)} className="w-full h-8 px-2 rounded-md border border-hairline-dark text-xs font-medium">
                    <option value="boolean">Boolean (Toggle)</option>
                    <option value="quota">Quota (Number limit)</option>
                    <option value="string">String (Text config)</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 py-2 border-t border-b border-hairline-dark">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="rounded text-mauve focus:ring-mauve h-3.5 w-3.5" />
                    <span className="text-xs font-bold text-ink-secondary">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formBeta} onChange={e => setFormBeta(e.target.checked)} className="rounded text-mauve focus:ring-mauve h-3.5 w-3.5" />
                    <span className="text-xs font-bold text-ink-secondary">Beta</span>
                  </label>
                </div>
                <Button type="submit" disabled={actioning} className="w-full h-8 bg-mauve hover:bg-mauve-strong font-bold text-xs">
                  {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Feature
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="p-8 border border-dashed border-hairline-dark bg-ink/5 text-ink-tertiary text-center rounded-xl text-xs font-semibold">
            Select a feature to edit or create a new one.
          </div>
        )}
      </div>
    </div>
  )
}
