"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Search, Calendar, RefreshCw, Trash2, Loader2, Link as LinkIcon, Building } from "lucide-react"

type EventItem = {
  id: string
  name: string
  slug: string
  status: string
  event_date: string | null
  created_at: string
  venue: string | null
  organization_id: string
  organization: {
    name: string
    plan: string
  } | null
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)

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
      (e.organization?.name || "").toLowerCase().includes(term)
    )
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Event Management" description="Monitor and moderate photography events running on the platform." />
        <Button onClick={fetchEvents} variant="outline" className="border-slate-800 flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-slate-500" />
        <Input
          placeholder="Search by event, studio, or venue..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-800 text-slate-100"
        />
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No events found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="p-4">Event details</th>
                    <th className="p-4">Organizer</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Event Date</th>
                    <th className="p-4">Created At</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredEvents.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{e.name}</span>
                          <a
                            href={`/event/${e.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-orange-400"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <div className="text-xs text-slate-500">{e.venue || "No venue"}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-200 flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-500" />
                          <span>{e.organization?.name || "N/A"}</span>
                        </div>
                        <div className="text-xs text-slate-500">Plan: <span className="text-orange-500/80 font-bold uppercase">{e.organization?.plan}</span></div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          e.status === "published"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : e.status === "draft"
                            ? "bg-slate-500/10 text-slate-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            e.status === "published" ? "bg-emerald-500" : e.status === "draft" ? "bg-slate-500" : "bg-amber-500"
                          }`} />
                          {e.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {e.event_date ? new Date(e.event_date).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(e.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          onClick={() => handleDeleteEvent(e.id)}
                          disabled={actioningId === e.id}
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:text-rose-400"
                          title="Delete Event"
                        >
                          <Trash2 className="h-4 w-4" />
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
