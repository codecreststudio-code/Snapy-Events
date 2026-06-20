"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Plus, Calendar, MapPin, Image as ImageIcon, MoreVertical, Camera, ExternalLink, QrCode, Images, Eye } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent } from "@/lib/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
import type { Event } from "@/lib/types"
import { useAuth } from "@/lib/hooks"

async function getEvents(orgId: string): Promise<Event[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export default function EventsPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const orgId = profile?.organization_id

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", orgId],
    queryFn: () => getEvents(orgId!),
    enabled: !!orgId,
  })

  const isLoading = authLoading || (!!orgId && eventsLoading)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Events</h1>
            <p className="text-muted-foreground text-sm">Manage your event hubs</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Create Event
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 w-full rounded-xl border bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Your Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage live media sharing pages for your clients and guests.
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Main Grid List */}
      {events && events.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden border border-border/40 bg-card/60 backdrop-blur-md hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between">
              <div>
                {/* Event Cover Image */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {event.cover_image_url ? (
                    <img
                      src={event.cover_image_url}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-indigo-500/5 flex items-center justify-center">
                      <Camera className="h-10 w-10 text-muted-foreground/40 group-hover:text-primary/45 transition-colors" />
                    </div>
                  )}

                  {/* Actions Dropdown */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full border shadow-sm cursor-pointer">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                          <Link href={`/dashboard/events/${event.slug}`}>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            View Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                          <Link href={`/event/${event.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            Public Gallery
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                          <Link href={`/dashboard/events/${event.slug}/qr`}>
                            <QrCode className="h-4 w-4 text-muted-foreground" />
                            QR Setup
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                          <Link href={`/dashboard/events/${event.slug}/gallery`}>
                            <Images className="h-4 w-4 text-muted-foreground" />
                            Galleries
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Event Details Content */}
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <Link href={`/dashboard/events/${event.slug}`}>
                      <h3 className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1 leading-snug">
                        {event.name}
                      </h3>
                    </Link>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    {event.event_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                    )}
                    {event.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and views footer */}
              <div className="px-5 py-4 border-t border-border/30 bg-muted/10 flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border flex items-center gap-1.5 ${
                    event.status === "published"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${event.status === "published" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {event.status}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ImageIcon className="h-4 w-4 text-slate-400" />
                  <span>{event.view_count || 0} views</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border/60 bg-card/20 py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-muted/40 rounded-full mb-4 border shadow-inner">
              <Camera className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">No events yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Create your first photography event to instantly collect guest pictures via QR codes and manage photo galleries.
            </p>
            <div className="mt-6">
              <Link href="/dashboard/events/new">
                <Button className="shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Event
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}