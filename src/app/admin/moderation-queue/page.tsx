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

  // photos, videos, and voice notes are all rows in the single `photos`
  // table (differentiated only by mime_type — see src/app/api/admin/photos,
  // /videos, /voice-notes route.ts, which all select from the same table).
  // /api/admin/photos's PATCH (approve) and DELETE handlers don't filter by
  // mime_type, so they work unmodified for any of these resource types —
  // this previously only ran for resource_type === "photo", so a flagged
  // video or voice note could never actually be approved/removed from here,
  // only dismissed from the queue view with no real action taken.
  const MEDIA_RESOURCE_TYPES = new Set(["photo", "video", "voice_note", "audio"])

  const handleResolve = async (itemId: string, action: "approve" | "delete") => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setActioningId(itemId)
    try {
      if (MEDIA_RESOURCE_TYPES.has(item.resource_type) && item.resource_id) {
        if (action === "approve") {
          const res = await fetch("/api/admin/photos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoIds: [item.resource_id], action: "approve" }),
          })
          const json = await res.json()
          if (!res.ok || json.success === false) throw new Error(json.error?.message || "Failed to approve content")
        } else {
          const res = await fetch(`/api/admin/photos?photoIds=${item.resource_id}`, { method: "DELETE" })
          const json = await res.json()
          if (!res.ok || json.success === false) throw new Error(json.error?.message || "Failed to delete content")
        }
        toast({ title: "Resolved", description: `Report resolved: ${action === "approve" ? "content kept" : "content deleted"}.` })
      } else {
        // No moderation action route exists yet for this resource type (e.g.
        // a flagged comment, which lives inside a photo's JSONB `comments`
        // array rather than its own row) — just clear it from the queue view
        // rather than pretending to act on it.
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
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-ink">Moderation Queue</h1>
          <p className="text-sm text-ink-secondary mt-1">Review automated safety flag reports, user complaints, and override filters.</p>
        </div>
        <Button onClick={fetchModerationItems} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-ink-secondary bg-surface-card hover:bg-mauve/5 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-ink-secondary" />
          <span>Refresh</span>
        </Button>
      </div>

      <Card className="bg-surface-card border-hairline-dark overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-mauve" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center text-ink-tertiary text-sm font-semibold">
              No pending reports in moderation queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-hairline-dark text-ink-tertiary font-bold uppercase tracking-wider bg-ink/5">
                    <th className="p-4">Report Details</th>
                    <th className="p-4">Content Type</th>
                    <th className="p-4">Content ID</th>
                    <th className="p-4">Flag Timestamp</th>
                    <th className="p-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-dark text-ink-secondary font-medium">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-mauve/5 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-ink text-sm flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span>{item.reason}</span>
                        </div>
                      </td>
                      <td className="p-4 uppercase text-[10px] font-extrabold text-ink-tertiary">{item.resource_type}</td>
                      <td className="p-4 font-mono text-ink-secondary">{item.resource_id.substring(0, 16)}...</td>
                      <td className="p-4 text-ink-tertiary font-semibold">{new Date(item.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right space-x-1.5">
                        <Button
                          onClick={() => handleResolve(item.id, "approve")}
                          disabled={actioningId === item.id}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-[10px] px-2.5 py-1.5 h-auto rounded-lg border border-emerald-500/20 shadow-sm"
                        >
                          Approve (Keep)
                        </Button>
                        <Button
                          onClick={() => handleResolve(item.id, "delete")}
                          disabled={actioningId === item.id}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] px-2.5 py-1.5 h-auto rounded-lg border border-red-500/20 shadow-sm"
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
