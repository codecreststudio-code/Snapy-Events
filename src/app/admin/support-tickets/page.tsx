"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Search, RefreshCw, MessageSquare, Loader2, User, Building2, Clock, Send, ShieldAlert, CheckCircle2, XCircle, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

type MessageItem = {
  id: string
  message: string
  author: string
  created_at: string
}

type TicketItem = {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  organization: {
    name: string
  } | null
  messages: MessageItem[]
}

export default function AdminSupportTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [replyMessage, setReplyMessage] = useState("")

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/support-tickets")
      if (!res.ok) throw new Error("Failed to load support tickets")
      const result = await res.json()
      setTickets(result.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setActioningId(ticketId)
    try {
      const res = await fetch("/api/admin/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      toast({ title: "Updated", description: `Ticket marked as ${newStatus}.` })
      fetchTickets()
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !replyMessage.trim()) return
    const ticketId = selectedTicket.id
    setActioningId(ticketId)
    try {
      const res = await fetch("/api/admin/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message: replyMessage, author: "Support Agent" }),
      })
      if (!res.ok) throw new Error("Failed to send support reply")
      toast({ title: "Sent", description: "Reply posted successfully." })
      setReplyMessage("")
      fetchTickets()
      
      // Update selected ticket messages locally
      const newMsg: MessageItem = {
        id: Math.random().toString(),
        message: replyMessage,
        author: "Support Agent",
        created_at: new Date().toISOString(),
      }
      setSelectedTicket(prev => prev ? { 
        ...prev, 
        status: "pending", 
        messages: [...(prev.messages || []), newMsg] 
      } : null)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const filteredTickets = tickets.filter((t) => {
    const term = search.toLowerCase()
    const matchesSearch = 
      t.subject.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term) ||
      (t.organization?.name || "").toLowerCase().includes(term)

    if (statusFilter === "all") return matchesSearch
    return matchesSearch && t.status === statusFilter
  })

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support Center</h1>
          <p className="text-sm text-slate-500 mt-1">Review customer tickets, reply to inquiries, and manage resolution lifecycles.</p>
        </div>
        <Button onClick={fetchTickets} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center max-w-sm w-full relative">
          <Search className="h-4 w-4 absolute left-3 text-slate-400" />
          <Input
            placeholder="Filter by subject, keyword, studio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-slate-800 shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-1.5 bg-slate-200/50 p-0.5 rounded-lg text-xs">
          {["all", "open", "pending", "resolved", "closed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-2.5 py-1.5 rounded-md capitalize transition-all cursor-pointer font-semibold",
                statusFilter === st ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Ticket List Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-16 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-650" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                No tickets matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="p-4">Ticket Info</th>
                      <th className="p-4">Tenant / Studio</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Last Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {filteredTickets.map((t) => (
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
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{t.description}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-700 font-semibold flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{t.organization?.name || "Independent"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase",
                            t.priority === "urgent" ? "bg-red-50 text-red-700 border-red-100" :
                            t.priority === "high" ? "bg-orange-50 text-orange-700 border-orange-100" :
                            t.priority === "normal" ? "bg-blue-50 text-blue-700 border-blue-100" :
                            "bg-slate-50 text-slate-550 border-slate-100"
                          )}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase",
                            t.status === "open" ? "bg-rose-50 text-rose-700 border-rose-100" :
                            t.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100" :
                            t.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            "bg-slate-100 text-slate-600 border-slate-200"
                          )}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-400 font-semibold">
                          {new Date(t.updated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Ticket Conversation drawer */}
        <Card className="bg-white border-slate-200 shadow-sm p-6 sticky top-6 flex flex-col justify-between min-h-[400px]">
          {selectedTicket ? (
            <div className="space-y-6 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{selectedTicket.subject}</h3>
                    <span className="text-xs text-slate-400 block mt-0.5">Org: {selectedTicket.organization?.name || "N/A"}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                      selectedTicket.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-750 border-rose-100"
                    )}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-700 mb-1">Issue Description:</p>
                  {selectedTicket.description}
                </div>

                {/* Conversation message logs list */}
                <div className="border-t border-slate-100 pt-4 space-y-3 max-h-48 overflow-y-auto pr-1">
                  {(selectedTicket.messages || []).map((msg) => (
                    <div 
                      key={msg.id}
                      className={cn("p-2 rounded-xl text-xs max-w-[85%] space-y-1.5",
                        msg.author === "Support Agent" 
                          ? "bg-violet-50 text-violet-750 ml-auto border border-violet-100" 
                          : "bg-slate-100 text-slate-700 mr-auto border border-slate-150"
                      )}
                    >
                      <p className="font-semibold text-[9px] opacity-75">{msg.author}</p>
                      <p className="font-medium leading-relaxed">{msg.message}</p>
                      <span className="text-[8px] opacity-50 block text-right">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat action interface controls */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <Input
                    placeholder="Type support agent message..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="h-9 text-xs bg-white border-slate-200 text-slate-800"
                  />
                  <Button
                    type="submit"
                    disabled={actioningId === selectedTicket.id || !replyMessage.trim()}
                    className="h-9 px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Button
                    onClick={() => handleStatusChange(selectedTicket.id, "resolved")}
                    variant="outline"
                    className="w-full h-8 text-[10px] font-bold border border-slate-200 text-emerald-600 bg-emerald-50/20 hover:bg-emerald-50 flex items-center justify-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark Resolved</span>
                  </Button>
                  <Button
                    onClick={() => handleStatusChange(selectedTicket.id, "closed")}
                    variant="outline"
                    className="w-full h-8 text-[10px] font-bold border border-slate-200 text-rose-600 bg-rose-50/20 hover:bg-rose-50 flex items-center justify-center gap-1 shadow-sm"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Close Ticket</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-center text-slate-400">
              <Inbox className="h-8 w-8 text-slate-300 mb-2" />
              <span className="text-xs font-semibold">Select a support ticket from the list to view conversations, assign priority states, and send replies.</span>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
