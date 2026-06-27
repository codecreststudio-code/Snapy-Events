"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Search, Calendar, RefreshCw, Trash2, Loader2, Link as LinkIcon, Building, ShieldAlert, Eye, Sliders } from "lucide-react"
import { cn } from "@/lib/utils"

type EventItem = {
  id: string
  name: string
  slug: string
  status: string
  event_date: string | null
  created_at: string
  venue: string | null
  host_id: string
  user: {
    name: string
    plan: string
  } | null
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/events")
      if (!res.ok) throw new Error("Failed to load events")
      const data = await res.json()
      setEvents(data.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you absolutely sure you want to delete this event? All photos and galleries associated with it will be permanently deleted.")) return

    setActioningId(eventId)
    try {
      const res = await fetch(`/api/admin/events?eventId=${eventId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete event")
      toast({ title: "Success", description: "Event has been deleted." })
      fetchEvents()
      if (selectedEvent?.id === eventId) setSelectedEvent(null)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const filteredEvents = events.filter((e) => {
    const term = search.toLowerCase()
    return (
      e.name.toLowerCase().includes(term) ||
      (e.venue || "").toLowerCase().includes(term) ||
      (e.user?.name || "").toLowerCase().includes(term)
    )
  })

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Event Management</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor and moderate photography events running on the platform.</p>
        </div>
        <Button onClick={fetchEvents} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-slate-400" />
        <Input
          placeholder="Search by event, studio, or venue..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200 text-slate-800 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main List Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-16 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                No events found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="p-4">Event details</th>
                      <th className="p-4">Organizer</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Event Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {filteredEvents.map((e) => (
                      <tr 
                        key={e.id} 
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors cursor-pointer",
                          selectedEvent?.id === e.id ? "bg-violet-50/20" : ""
                        )}
                        onClick={() => setSelectedEvent(e)}
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <span>{e.name}</span>
                            <a
                              href={`/event/${e.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-violet-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LinkIcon className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{e.venue || "No venue"}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-700 font-semibold flex items-center gap-1">
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                            <span>{e.user?.name || "N/A"}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Plan: <span className="text-violet-600 font-bold uppercase">{e.user?.plan}</span></div>
                        </td>
                        <td className="p-4">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            e.status === "published"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : e.status === "draft"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          )}>
                            {e.status}
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-400 font-semibold">
                          {e.event_date ? new Date(e.event_date).toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Event Details Panel */}
        <Card className="bg-white border-slate-200 shadow-sm p-6 sticky top-6">
          {selectedEvent ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{selectedEvent.name}</h3>
                  <a
                    href={`/event/${selectedEvent.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1 mt-1"
                  >
                    <span>slug: {selectedEvent.slug}</span>
                    <LinkIcon className="h-3 w-3" />
                  </a>
                </div>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border",
                  selectedEvent.status === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                  {selectedEvent.status}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Event ID</span>
                  <span className="font-mono text-slate-700 font-semibold">{selectedEvent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Venue</span>
                  <span className="text-slate-700 font-semibold">{selectedEvent.venue || "No Venue"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Organizer</span>
                  <span className="text-slate-700 font-semibold">{selectedEvent.user?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Organizer Plan</span>
                  <span className="text-violet-600 font-bold uppercase">{selectedEvent.user?.plan || "free"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Event Date</span>
                  <span className="text-slate-700 font-semibold">
                    {selectedEvent.event_date ? new Date(selectedEvent.event_date).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Created At</span>
                  <span className="text-slate-700 font-semibold">{new Date(selectedEvent.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <a href={`/event/${selectedEvent.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      <span>View Live</span>
                    </a>
                  </Button>
                  <Button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    disabled={actioningId === selectedEvent.id}
                    className="w-full text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Event</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-center text-slate-400">
              <Calendar className="h-8 w-8 text-slate-300 mb-2" />
              <span className="text-xs font-semibold">Select an event to view complete collection details and moderate options.</span>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}

