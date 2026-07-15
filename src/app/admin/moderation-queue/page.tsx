"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { ShieldAlert, RefreshCw, Eye, CheckCircle2, AlertTriangle, Trash2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ModerationItem = {
  id: string
  resource_type: string
  resource_id: string
  reason: string
  reported_by?: string
  status: string
  created_at: string
}

export default function AdminModerationQueuePage() {
  const [items, setItems] = useState<ModerationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchModerationItems = async () => {
    setLoading(true)
    try {
      // Fetch audit logs indicating flags, or list flagged photos
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, resource_type, resource_id, action, created_at")
        .ilike("action", "%flag%")
        .order("created_at", { ascending: false })

      if (error) throw error
      
      setItems((data || []).map(d => ({
        id: d.id,
        resource_type: d.resource_type || "photo",
        resource_id: d.resource_id || "",
        reason: d.action || "Flagged by AI Safety Model",
        status: "pending",
        created_at: d.created_at
      })))
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModerationItems()
  }, [])

  const handleResolve = async (itemId: string, action: "approve" | "delete") => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setActioningId(itemId)
    try {
      if (item.resource_type === "photo" && item.resource_id) {
        if (action === "approve") {
          const res = await fetch("/api/admin/photos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoIds: [item.resource_id], action: "approve" }),
          })
          const json = await res.json()
          if (!res.ok || json.success === false) throw new Error(json.error?.message || "Failed to approve photo")
        } else {
          const res = await fetch(`/api/admin/photos?photoIds=${item.resource_id}`, { method: "DELETE" })
          const json = await res.json()
          if (!res.ok || json.success === false) throw new Error(json.error?.message || "Failed to delete photo")
        }
        toast({ title: "Resolved", description: `Report resolved: ${action === "approve" ? "content kept" : "content deleted"}.` })
      } else {
        // No moderation action route exists yet for this resource type — just
        // clear it from the queue view rather than pretending to act on it.
        toast({ title: "Dismissed", description: `No automated action available for "${item.resource_type}" reports yet — removed from queue view only.` })
      }
      setItems(items.filter((i) => i.id !== itemId))
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Moderation Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Review automated safety flag reports, user complaints, and override filters.</p>
        </div>
        <Button onClick={fetchModerationItems} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-650" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm font-semibold">
              No pending reports in moderation queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="p-4">Report Details</th>
                    <th className="p-4">Content Type</th>
                    <th className="p-4">Content ID</th>
                    <th className="p-4">Flag Timestamp</th>
                    <th className="p-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span>{item.reason}</span>
                        </div>
                      </td>
                      <td className="p-4 uppercase text-[10px] font-extrabold text-slate-400">{item.resource_type}</td>
                      <td className="p-4 font-mono text-slate-700">{item.resource_id.substring(0, 16)}...</td>
                      <td className="p-4 text-slate-400 font-semibold">{new Date(item.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right space-x-1.5">
                        <Button
                          onClick={() => handleResolve(item.id, "approve")}
                          disabled={actioningId === item.id}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] px-2.5 py-1.5 h-auto rounded-lg border border-emerald-100 shadow-sm"
                        >
                          Approve (Keep)
                        </Button>
                        <Button
                          onClick={() => handleResolve(item.id, "delete")}
                          disabled={actioningId === item.id}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] px-2.5 py-1.5 h-auto rounded-lg border border-rose-100 shadow-sm"
                        >
                          Reject (Delete)
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
