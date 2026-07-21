"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Bell, RefreshCw, Send, Loader2, MessageSquare, Mail, AlertCircle, CheckCircle, Sliders } from "lucide-react"

type QueueItem = {
  id: string
  type: string
  recipient: string
  status: string
  retry_count: number
  scheduled_for: string
  created_at: string
}

export default function AdminNotificationsPage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [broadcasting, setBroadcasting] = useState(false)

  // Broadcast state
  const [bannerText, setBannerText] = useState("")

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/notifications?pageSize=20")
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.error?.message || "Failed to load notification queue")
      setQueue(json.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bannerText) return
    setBroadcasting(true)
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "push",
          recipient: "all_users",
          subject: "Global Announcement",
          message: bannerText,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.error?.message || "Failed to schedule broadcast")
      toast({ title: "Success", description: "Global banner announcement scheduled successfully." })
      setBannerText("")
      fetchQueue()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setBroadcasting(false)
    }
  }

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-white">Notifications Dispatcher</h1>
          <p className="text-sm text-white/50 mt-1">Configure WhatsApp integration channels, template hooks, and manage outgoing queues.</p>
        </div>
        <Button onClick={fetchQueue} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-white/70 bg-surface-card hover:bg-white/5 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-white/50" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Outbox Queue */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-surface-card border-hairline-dark overflow-hidden shadow-sm">
            <div className="p-4 border-b border-hairline-dark bg-white/5">
              <h3 className="font-bold text-white/80 text-sm flex items-center gap-1.5">
                <Bell className="h-4.5 w-4.5 text-mauve" />
                <span>Outbound Dispatch Queue</span>
              </h3>
            </div>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-mauve" />
                </div>
              ) : queue.length === 0 ? (
                <div className="p-12 text-center text-white/40 text-xs">No pending messages in dispatch queue.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-hairline-dark text-white/40 font-bold uppercase tracking-wider bg-white/5">
                        <th className="p-4">Message ID</th>
                        <th className="p-4">Channel</th>
                        <th className="p-4">Recipient</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/65 font-medium">
                      {queue.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono font-bold text-white/80">{item.id.substring(0, 8)}...</td>
                          <td className="p-4 uppercase text-[10px] font-extrabold text-mauve flex items-center gap-1 mt-3.5">
                            {item.type === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                            <span>{item.type}</span>
                          </td>
                          <td className="p-4 text-white/70 truncate max-w-[150px]">{item.recipient}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.status === "sent" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              item.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              "bg-white/5 text-white/60 border-hairline-dark"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-4 text-right text-white/40 font-semibold">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Global Announcement Alert Trigger */}
        <Card className="bg-surface-card border-hairline-dark p-6 sticky top-6 shadow-sm">
          <h3 className="font-bold text-white/80 text-sm flex items-center gap-1.5 mb-4">
            <Sliders className="h-4.5 w-4.5 text-mauve" />
            <span>Send Global Announcement</span>
          </h3>
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Banner message text</label>
              <textarea
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                placeholder="Alert all organizers about system scheduled maintenance at 2 AM IST..."
                required
                rows={4}
                className="flex min-h-[80px] w-full rounded-lg border border-hairline-dark bg-surface-card px-3 py-2 text-xs text-white/80 font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mauve/50 shadow-sm"
              />
            </div>
            
            <Button
              type="submit"
              disabled={broadcasting}
              className="w-full bg-mauve hover:bg-mauve-strong text-[#141110] font-bold h-10 shadow-sm flex items-center justify-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span>{broadcasting ? "Sending..." : "Publish Broadcast"}</span>
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
