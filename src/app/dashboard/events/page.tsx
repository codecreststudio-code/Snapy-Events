"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Plus, Calendar, MapPin, Image as ImageIcon, MoreVertical, Camera, ExternalLink, QrCode, Images, Eye, RotateCcw } from "lucide-react"
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
import { toast } from "@/lib/components/ui/toaster"
import type { Event } from "@/lib/types"
import { useAuth } from "@/lib/hooks"

async function getEvents(orgId: string): Promise<Event[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("host_id", orgId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

// Restores an archived capsule back to "published" — the quickest path back
// from the Archived tab without having to open the event's own settings
// drawer and hunt for the status <select>.
async function restoreEvent(slug: string) {
  const supabase = createClient()
  const { error } = await supabase.from("events").update({ status: "published" }).eq("slug", slug)
  if (error) throw new Error(error.message)
}

export default function EventsPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const orgId = profile?.id
  const queryClient = useQueryClient()

  // Active/Archived tab — Archive Memory Capsule (added in the settings
  // drawer, dashboard/events/[slug]/page.tsx) previously had no way to see
  // archived events again short of guessing the URL; they just vanished
  // from this list once archived since every event rendered unconditionally.
  const [activeFilter, setActiveFilter] = useState<"active" | "archived">("active")

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", orgId],
    queryFn: () => getEvents(orgId!),
    enabled: !!orgId,
  })

  const restoreMutation = useMutation({
    mutationFn: restoreEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
      queryClient.invalidateQueries({ queryKey: ["events-list"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({ title: "Capsule restored", description: "Moved back to your active events." })
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't restore capsule", description: error.message, variant: "destructive" })
    },
  })

  const isLoading = authLoading || (!!orgId && eventsLoading)

  const archivedCount = events?.filter((e) => e.status === "archived").length ?? 0
  const activeCount = events?.filter((e) => e.status !== "archived").length ?? 0
  const filteredEvents = events?.filter((e) =>
    activeFilter === "archived" ? e.status === "archived" : e.status !== "archived"
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="font-playfair text-3xl font-light text-white">Events</h1>
            <p className="text-white/50 text-sm">Manage your event hubs</p>
          </div>
          <Button disabled className="rounded-full bg-[#D4AF37] text-[#141110] font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Create Event
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 w-full rounded-2xl border border-[#3D332A] bg-[#1C1814] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#3D332A] pb-6">
        <div>
          <h1 className="font-playfair text-3xl font-light text-white">
            Your Memory Capsules
          </h1>
          <p className="text-white/50 mt-1 text-sm">
            Create and manage live media sharing pages for your clients and guests.
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="rounded-full bg-[#D4AF37] hover:bg-[#c19f2e] text-[#141110] font-semibold shadow-lg shadow-[#D4AF37]/10 hover:scale-[1.01] active:scale-[0.99] transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Active / Archived filter tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 rounded-full text-xs w-fit">
        {[
          { id: "active" as const, label: "Active", count: activeCount },
          { id: "archived" as const, label: "Archived", count: archivedCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === tab.id ? "bg-[#D4AF37] text-[#141110] font-bold" : "text-white/60 hover:text-white"
            }`}
          >
            {tab.label}
            <span
              className={`text-[10px] rounded-full px-1.5 ${
                activeFilter === tab.id ? "bg-[#141110]/20" : "bg-white/10"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Grid List */}
      {filteredEvents && filteredEvents.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            // The event wizard offers 3 cover types: an uploaded photo or
            // stock photo (both saved to cover_image_url), or one of the
            // built-in gradient swatches (saved to settings.cover_gradient
            // instead, since it's CSS, not an image URL). This card used to
            // only ever check cover_image_url, so any event created with a
            // gradient cover — the wizard's default — fell through to the
            // generic placeholder icon instead of showing the gradient the
            // host actually picked.
            const coverGradient = (event.settings as any)?.cover_gradient as string | undefined
            const isArchived = event.status === "archived"
            return (
            <Card
              key={event.id}
              className={`overflow-hidden rounded-2xl border border-[#3D332A] bg-[#1C1814] hover:border-[#D4AF37]/40 hover:shadow-xl hover:shadow-[#D4AF37]/5 transition-all duration-300 group flex flex-col justify-between ${
                isArchived ? "opacity-70" : ""
              }`}
            >
              <div>
                {/* Event Cover Image */}
                <div
                  className="aspect-video bg-white/5 relative overflow-hidden"
                  style={!event.cover_image_url && coverGradient ? { backgroundImage: coverGradient } : undefined}
                >
                  {event.cover_image_url ? (
                    <img
                      src={event.cover_image_url}
                      alt={event.name}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isArchived ? "grayscale" : ""}`}
                    />
                  ) : coverGradient ? null : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-[#D4AF37]/10 flex items-center justify-center">
                      <Camera className="h-10 w-10 text-white/20 group-hover:text-[#D4AF37]/50 transition-colors" />
                    </div>
                  )}

                  {/* Actions Dropdown */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full border border-white/10 bg-[#141110]/80 hover:bg-[#141110] text-white shadow-sm cursor-pointer">
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
                        {isArchived && (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            disabled={restoreMutation.isPending}
                            onClick={() => restoreMutation.mutate(event.slug)}
                          >
                            <RotateCcw className="h-4 w-4 text-muted-foreground" />
                            Restore to Active
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Event Details Content */}
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <Link href={`/dashboard/events/${event.slug}`}>
                      <h3 className="font-semibold text-lg text-white hover:text-[#D4AF37] transition-colors line-clamp-1 leading-snug">
                        {event.name}
                      </h3>
                    </Link>
                  </div>

                  <div className="space-y-2 text-xs text-white/50">
                    {event.event_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-white/30" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                    )}
                    {event.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-white/30" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and views footer */}
              <div className="px-5 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border flex items-center gap-1.5 ${
                    event.status === "published"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : event.status === "archived"
                        ? "bg-white/5 border-white/15 text-white/50"
                        : "bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      event.status === "published"
                        ? "bg-emerald-400 animate-pulse"
                        : event.status === "archived"
                          ? "bg-white/40"
                          : "bg-[#D4AF37]"
                    }`}
                  />
                  {event.status}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <ImageIcon className="h-4 w-4 text-white/30" />
                  <span>{event.view_count || 0} views</span>
                </div>
              </div>
            </Card>
            )
          })}
        </div>
      ) : (
        <Card className="rounded-2xl border border-dashed border-[#3D332A] bg-[#1C1814]/40 py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-white/5 rounded-full mb-4 border border-white/10 shadow-inner">
              <Camera className="h-10 w-10 text-white/30" />
            </div>
            <h3 className="font-playfair text-xl font-light text-white">
              {activeFilter === "archived" ? "No archived events" : "No events yet"}
            </h3>
            <p className="text-sm text-white/50 mt-2 max-w-sm">
              {activeFilter === "archived"
                ? "Events you archive from their settings drawer will show up here."
                : "Create your first photography event to instantly collect guest pictures via QR codes and manage photo galleries."}
            </p>
            {activeFilter !== "archived" && (
              <div className="mt-6">
                <Link href="/dashboard/events/new">
                  <Button className="rounded-full bg-[#D4AF37] hover:bg-[#c19f2e] text-[#141110] font-semibold shadow-lg shadow-[#D4AF37]/10 hover:scale-[1.01] active:scale-[0.99] transition-all">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Event
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
