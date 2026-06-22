"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { MessageSquare, RefreshCw, AlertCircle, HelpCircle, CheckCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type TicketItem = {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  created_at: string
  organization?: {
    name: string
  }
}

export default function AdminSupportTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)

  const supabase = createClient()

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, description, status, priority, created_at, organization:organizations(name)")
        .order("created_at", { ascending: false })

      if (error) throw error
      setTickets((data as any) || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleResolve = async (ticketId: string) => {
    setActioningId(ticketId)
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "resolved" })
        .eq("id", ticketId)

      if (error) throw error
      toast({ title: "Resolved", description: "Support ticket marked as resolved." })
      fetchTickets()
      if (selectedTicket?.id === ticketId) {
        setSelectedOrg(prev => prev ? { ...prev, status: "resolved" } : null)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const setSelectedOrg = (fn: (prev: TicketItem | null) => TicketItem | null) => {
    setSelectedTicket(fn(selectedTicket))
  }

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support Center</h1>
          <p className="text-sm text-slate-500 mt-1">Review guest inquiries, resolve billing disputes, and answer photographer tickets.</p>
        </div>
        <Button onClick={fetchTickets} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Tickets list */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-16 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-650" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm font-semibold">
                No active support tickets registered.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="p-4">Subject</th>
                      <th className="p-4">Studio</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {tickets.map((t) => (
                      <tr 
                        key={t.id}
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors cursor-pointer",
                          selectedTicket?.id === t.id ? "bg-violet-50/20" : ""
                        )}
                        onClick={() => setSelectedTicket(t)}
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-sm">{t.subject}</div>
                          <div className="text-[10px] text-slate-450 mt-0.5 truncate max-w-[200px]">{t.description}</div>
                        </td>
                        <td className="p-4 font-semibold text-slate-700">
                          {t.organization?.name || "Global Client"}
                        </td>
                        <td className="p-4">
                          <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                            t.priority === "high" ? "bg-rose-100 text-rose-700" :
                            t.priority === "medium" ? "bg-orange-100 text-orange-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            t.status === "open" ? "bg-rose-50 text-rose-700 border-rose-100" :
                            t.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            "bg-slate-100 text-slate-600 border-slate-200"
                          )}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected ticket details */}
        <Card className="bg-white border-slate-200 shadow-sm p-6 sticky top-6">
          {selectedTicket ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 text-base">{selectedTicket.subject}</h3>
                <span className="text-xs text-slate-400 block mt-1">Ticket ID: {selectedTicket.id}</span>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs text-slate-650 font-semibold leading-relaxed">
                <p className="font-bold text-slate-400 text-[10px] uppercase mb-1.5">Description:</p>
                <p>{selectedTicket.description}</p>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Priority</span>
                  <span className="text-slate-700 capitalize font-bold">{selectedTicket.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Studio Workspace</span>
                  <span className="text-slate-700 font-bold">{selectedTicket.organization?.name || "Global Client"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Opened At</span>
                  <span className="text-slate-700 font-semibold">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                </div>
              </div>

              {selectedTicket.status !== "resolved" && (
                <div className="border-t border-slate-100 pt-4">
                  <Button
                    onClick={() => handleResolve(selectedTicket.id)}
                    disabled={actioningId === selectedTicket.id}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-10 shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Resolve Ticket</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-center text-slate-400">
              <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
              <span className="text-xs font-semibold">Select a support ticket from the queue to view full transcript and resolve the query.</span>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
