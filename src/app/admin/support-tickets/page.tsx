"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Search, RefreshCw, MessageSquare, Loader2, Building2, Clock, Send, ShieldAlert, CheckCircle2, XCircle, Inbox } from "lucide-react"
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
  user: {
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
      (t.user?.name || "").toLowerCase().includes(term)

    if (statusFilter === "all") return matchesSearch
    return matchesSearch && t.status === statusFilter
  })

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-ink">Support Center</h1>
          <p className="text-sm text-ink-secondary mt-1">Review customer tickets, reply to inquiries, and manage resolution lifecycles.</p>
        </div>
        <Button onClick={fetchTickets} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-ink-secondary bg-surface-card hover:bg-mauve/5 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-ink-secondary" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center max-w-sm w-full relative">
          <Search className="h-4 w-4 absolute left-3 text-ink-tertiary" />
          <Input
            placeholder="Filter by subject, keyword, studio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-surface-card border-hairline-dark text-ink shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-1.5 flex-wrap bg-ink/10 p-0.5 rounded-lg text-xs">
          {["all", "open", "pending", "resolved", "closed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-2.5 py-1.5 rounded-md capitalize transition-all cursor-pointer font-semibold",
                statusFilter === st ? "bg-surface-card text-ink shadow-sm" : "text-ink-secondary hover:text-ink"
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Ticket List Table */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-16 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-mauve" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-16 text-center text-ink-tertiary text-sm">
                No tickets matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-hairline-dark text-ink-tertiary font-bold uppercase tracking-wider bg-ink/5">
                      <th className="p-4">Ticket Info</th>
                      <th className="p-4">Tenant / Studio</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Last Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline-dark text-ink-secondary font-medium">
                    {filteredTickets.map((t) => (
                      <tr 
                        key={t.id} 
                        className={cn(
                          "hover:bg-mauve/5 transition-colors cursor-pointer",
                          selectedTicket?.id === t.id ? "bg-mauve/10" : ""
                        )}
                        onClick={() => setSelectedTicket(t)}
                      >
                        <td className="p-4">
                          <div className="font-bold text-ink text-sm">{t.subject}</div>
                          <div className="text-[10px] text-ink-tertiary mt-0.5 truncate max-w-[200px]">{t.description}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-ink-secondary font-semibold flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-ink-tertiary" />
                            <span>{t.user?.name || "Independent"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase",
                            t.priority === "urgent" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            t.priority === "high" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            t.priority === "normal" ? "bg-mauve/10 text-mauve border-mauve/20" :
                            "bg-ink/5 text-ink-secondary border-hairline-dark"
                          )}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase",
                            t.status === "open" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            t.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            t.status === "resolved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            "bg-ink/5 text-ink-secondary border-hairline-dark"
                          )}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4 text-right text-ink-tertiary font-semibold">
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
        <Card className="bg-surface-card border-hairline-dark shadow-sm p-6 sticky top-6 flex flex-col justify-between min-h-[400px]">
          {selectedTicket ? (
            <div className="space-y-6 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-ink text-base">{selectedTicket.subject}</h3>
                    <span className="text-xs text-ink-tertiary block mt-0.5">Org: {selectedTicket.user?.name || "N/A"}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                      selectedTicket.status === "resolved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                <div className="bg-ink/5 border border-hairline-dark rounded-xl p-3 text-xs text-ink-secondary">
                  <p className="font-semibold text-ink-secondary mb-1">Issue Description:</p>
                  {selectedTicket.description}
                </div>

                {/* Conversation message logs list */}
                <div className="border-t border-hairline-dark pt-4 space-y-3 max-h-48 overflow-y-auto pr-1">
                  {(selectedTicket.messages || []).map((msg) => (
                    <div 
                      key={msg.id}
                      className={cn("p-2 rounded-xl text-xs max-w-[85%] space-y-1.5",
                        msg.author === "Support Agent" 
                          ? "bg-mauve/10 text-mauve ml-auto border border-mauve/20" 
                          : "bg-ink/5 text-ink-secondary mr-auto border border-hairline-dark"
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
              <div className="border-t border-hairline-dark pt-4 space-y-3">
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <Input
                    placeholder="Type support agent message..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="h-9 text-xs bg-surface-card border-hairline-dark text-ink"
                  />
                  <Button
                    type="submit"
                    disabled={actioningId === selectedTicket.id || !replyMessage.trim()}
                    className="h-9 px-3 bg-mauve hover:bg-mauve-strong text-[#1a1410] font-bold rounded-lg shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Button
                    onClick={() => handleStatusChange(selectedTicket.id, "resolved")}
                    variant="outline"
                    className="w-full h-8 text-[10px] font-bold border border-hairline-dark text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark Resolved</span>
                  </Button>
                  <Button
                    onClick={() => handleStatusChange(selectedTicket.id, "closed")}
                    variant="outline"
                    className="w-full h-8 text-[10px] font-bold border border-hairline-dark text-red-400 bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center gap-1 shadow-sm"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Close Ticket</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-center text-ink-tertiary">
              <Inbox className="h-8 w-8 text-ink-tertiary mb-2" />
              <span className="text-xs font-semibold">Select a support ticket from the list to view conversations, assign priority states, and send replies.</span>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
