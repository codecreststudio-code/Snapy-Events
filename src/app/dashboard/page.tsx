"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Camera, Plus, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks"
import { AccountMenu } from "@/lib/components/layout/account-menu"
import { HomeBottomTabs } from "@/lib/components/layout/home-bottom-tabs"
import { NotificationCenter } from "@/lib/components/notifications/notification-center"

// Redesigned to match a minimal, native-app-style home screen (host's own
// request, replacing the previous sidebar/stat-cards/checklist admin-panel
// layout entirely, at every screen size — see dashboard-sidebar.tsx and
// dashboard-main.tsx for how the shared sidebar/padding step aside on this
// one route). Two sections: ACTIVE (the host's currently live/published
// events, or a big "Create Event" prompt if there are none) and ALBUMS
// (every event's gallery, shown as a cover-image card — newest first).

interface DashboardEvent {
  id: string
  name: string
  slug: string
  status: string
  event_date: string | null
  end_date: string | null
  cover_image_url: string | null
  photo_count: number
}

interface DashboardData {
  activeEvents: DashboardEvent[]
  albums: DashboardEvent[]
}

async function getDashboardData(orgId: string): Promise<DashboardData> {
  const supabase = createClient()

  const { data } = await supabase
    .from("events")
    .select("id, name, slug, status, event_date, end_date, cover_image_url, galleries(id, photo_count)")
    .eq("host_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30)

  const events: DashboardEvent[] = (data || []).map((event: any) => ({
    id: event.id,
    name: event.name,
    slug: event.slug,
    status: event.status,
    event_date: event.event_date,
    end_date: event.end_date,
    cover_image_url: event.cover_image_url,
    photo_count: (event.galleries as any[])?.reduce((sum, g) => sum + (g.photo_count || 0), 0) || 0,
  }))

  return {
    activeEvents: events.filter((e) => e.status === "published"),
    albums: events,
  }
}

// Compact "Jul 14–15, 2026" style range — falls back to a single date if
// there's no end_date, or if it's identical to event_date.
function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : null
  const sameDay = endDate && startDate.toDateString() === endDate.toDateString()

  const startMonth = startDate.toLocaleDateString("en-US", { month: "short" })
  const startDay = startDate.getDate()
  const year = startDate.getFullYear()

  if (!endDate || sameDay) {
    return `${startMonth} ${startDay}, ${year}`
  }

  const endMonth = endDate.toLocaleDateString("en-US", { month: "short" })
  const endDay = endDate.getDate()
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()

  return sameMonth
    ? `${startMonth} ${startDay}–${endDay}, ${year}`
    : `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
}

function StatusPill({ status }: { status: string }) {
  const isPublished = status === "published"
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase border backdrop-blur-sm ${
        isPublished
          ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
          : "bg-black/40 border-white/20 text-white/70"
      }`}
    >
      {status}
    </span>
  )
}

export default function DashboardPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const orgId = profile?.id

  const { data, isLoading: dataLoading } = useQuery({
    queryKey: ["dashboard-home", orgId],
    queryFn: () => getDashboardData(orgId!),
    enabled: !!orgId,
    refetchInterval: 20000,
  })

  const isLoading = authLoading || (!!orgId && dataLoading)
  const activeEvents = data?.activeEvents ?? []
  const albums = data?.albums ?? []

  return (
    <div className="min-h-screen bg-surface-dark text-ink pb-28">
      {/* Top bar */}
      <div className="pt-safe sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#e5dfd0] bg-[#faf6ed]/95 px-5 py-4 backdrop-blur-lg">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mauve">
            <Camera className="h-5 w-5 text-[#faf6ed]" />
          </div>
          <span className="font-playfair text-lg font-semibold text-ink">Snapsy</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/events/new">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-mauve px-4 py-2 text-xs font-bold text-[#faf6ed] shadow-lg shadow-mauve/20 transition-all hover:bg-mauve-strong hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </Link>
          <NotificationCenter />
          <AccountMenu variant="compact" />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6 space-y-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-mauve" />
          </div>
        ) : (
          <>
            {/* ACTIVE */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Active</h2>

              {activeEvents.length === 0 ? (
                <div className="flex flex-col items-center gap-5 py-10 text-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                  <p className="text-sm text-ink-tertiary">No active events</p>
                  <Link href="/dashboard/events/new">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full bg-mauve px-6 py-3 text-sm font-bold text-[#faf6ed] shadow-lg shadow-mauve/20 transition-all hover:bg-mauve-strong hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="h-4 w-4" />
                      Create Event
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/dashboard/events/${event.slug}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-[#e5dfd0] bg-[#ffffff] p-4 transition-all hover:border-mauve/40"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-mauve/10">
                          <Camera className="h-5 w-5 text-mauve" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="truncate text-sm font-semibold text-ink">{event.name}</h3>
                          <p className="text-xs text-ink-secondary">Live · {event.photo_count} photos</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-tertiary" />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* ALBUMS */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Albums</h2>

              {albums.length === 0 ? (
                <p className="text-sm text-ink-tertiary">No albums yet — create your first event to get started.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {albums.map((event) => {
                    const dateRange = formatDateRange(event.event_date, event.end_date)
                    return (
                      <Link
                        key={event.id}
                        href={`/dashboard/events/${event.slug}`}
                        className="group relative block aspect-[16/10] overflow-hidden rounded-2xl border border-[#e5dfd0] bg-gradient-to-br from-mauve/20 to-[#ffffff] transition-all hover:border-mauve/40"
                      >
                        {event.cover_image_url && (
                          <img
                            src={event.cover_image_url}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        <div className="absolute top-3 right-3">
                          <StatusPill status={event.status} />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <h3 className="truncate font-playfair text-base font-semibold text-white">{event.name}</h3>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            {dateRange && <span className="text-[11px] text-white/70">{dateRange}</span>}
                            <span className="text-[11px] text-white/70">{event.photo_count} photos</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <HomeBottomTabs />
    </div>
  )
}
