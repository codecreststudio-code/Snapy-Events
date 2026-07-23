"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Camera, Plus, ChevronRight, QrCode } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks"
import { AccountMenu } from "@/lib/components/layout/account-menu"
import { HomeBottomTabs } from "@/lib/components/layout/home-bottom-tabs"
import { NotificationCenter } from "@/lib/components/notifications/notification-center"
import { Logo } from "@/lib/components/layout/logo"
import { JoinEventModal } from "@/lib/components/events/join-event-modal"

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
  sample_photos?: string[]
}

interface DashboardData {
  activeEvents: DashboardEvent[]
  albums: DashboardEvent[]
}

function supabasePhotoUrl(path: string) {
  if (path.startsWith("http")) return path
  const supabase = createClient()
  return supabase.storage.from("event-memories").getPublicUrl(path).data.publicUrl
}

async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = createClient()

  // 1. Fetch host events sorted newest first
  let { data: eventsData, error: eventsError } = await supabase
    .from("events")
    .select("id, name, slug, status, event_date, end_date, cover_image_url")
    .eq("host_id", userId)
    .order("created_at", { ascending: false })

  if (eventsError || !eventsData || eventsData.length === 0) {
    const { data: orgEvents } = await supabase
      .from("events")
      .select("id, name, slug, status, event_date, end_date, cover_image_url")
      .eq("organization_id", userId)
      .order("created_at", { ascending: false })
    if (orgEvents && orgEvents.length > 0) {
      eventsData = orgEvents
    }
  }

  const events = eventsData || []

  if (events.length === 0) {
    return { activeEvents: [], albums: [] }
  }

  // 2. Fetch photo counts and sample thumbnail paths per event from photos table
  const eventIds = events.map((e) => e.id)
  const { data: photosData } = await supabase
    .from("photos")
    .select("event_id, storage_path")
    .in("event_id", eventIds)

  const countMap: Record<string, number> = {}
  const samplePhotoMap: Record<string, string[]> = {}
  photosData?.forEach((p) => {
    countMap[p.event_id] = (countMap[p.event_id] || 0) + 1
    if (!samplePhotoMap[p.event_id]) samplePhotoMap[p.event_id] = []
    if (samplePhotoMap[p.event_id].length < 4 && p.storage_path) {
      samplePhotoMap[p.event_id].push(p.storage_path)
    }
  })

  const fullEvents: DashboardEvent[] = events.map((e) => ({
    ...e,
    photo_count: countMap[e.id] || 0,
    sample_photos: samplePhotoMap[e.id] || [],
  }))

  const activeEvents = fullEvents.filter(
    (e) => e.status === "active" || e.status === "published" || e.status === "draft"
  )

  return { activeEvents, albums: fullEvents }
}

function formatDateRange(startStr: string | null, endStr: string | null) {
  if (!startStr) return null
  const start = new Date(startStr)
  const startMonth = start.toLocaleDateString("en-US", { month: "short" })
  const startDay = start.getDate()
  const startYear = start.getFullYear()

  if (!endStr) {
    return `${startMonth} ${startDay}, ${startYear}`
  }

  const end = new Date(endStr)
  const endMonth = end.toLocaleDateString("en-US", { month: "short" })
  const endDay = end.getDate()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}~${endDay}, ${startYear}`
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`
}

function StatusPill({ status }: { status: string }) {
  const isLive = status === "active" || status === "published"
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
        isLive
          ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
          : "border border-hairline-dark bg-mauve/5 text-ink-secondary"
      }`}
    >
      {isLive ? "PUBLISHED" : status}
    </span>
  )
}

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const userId = profile?.id || user?.id
  const [showJoinModal, setShowJoinModal] = useState(false)

  const { data, isLoading: dataLoading } = useQuery({
    queryKey: ["dashboard-home", userId],
    queryFn: () => getDashboardData(userId!),
    enabled: !!userId,
    refetchInterval: 20000,
  })

  const isLoading = authLoading || (!!userId && dataLoading)
  const activeEvents = data?.activeEvents ?? []
  const albums = data?.albums ?? []

  return (
    <div className="min-h-screen bg-surface-dark text-ink pb-28">
      <JoinEventModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />

      {/* Top bar */}
      <div className="pt-safe sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#e5dfd0] bg-[#faf6ed]/95 px-5 py-4 backdrop-blur-lg">
        <Link href="/dashboard" className="inline-flex items-center transition-opacity hover:opacity-90">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1.5 rounded-full border border-mauve/30 bg-mauve/10 px-3.5 py-2 text-xs font-bold text-mauve hover:bg-mauve/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Join Event</span>
          </button>
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
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6 space-y-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-mauve" />
          </div>
        ) : (
          <>
            {/* SAMPLE EVENT ONBOARDING BANNER */}
            <section className="rounded-3xl border border-mauve/30 bg-gradient-to-r from-mauve/15 via-white to-[#faf6ed] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mauve text-white shadow-md shadow-mauve/20">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-playfair text-base font-bold text-ink">Explore Sample Event 💍</h3>
                    <p className="text-xs text-ink-secondary">Take a 5-minute interactive tour to see how Snapsy Events works</p>
                  </div>
                </div>
                <Link href="/dashboard/demo">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full bg-mauve px-4 py-2 text-xs font-bold text-[#faf6ed] shadow-md shadow-mauve/20 transition-all hover:bg-mauve-strong hover:scale-[1.02]"
                  >
                    Try Demo <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>
            </section>

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
                      className="flex items-center justify-between gap-4 rounded-2xl border border-[#e5dfd0] bg-[#ffffff] p-4 transition-all hover:border-mauve/40 shadow-xs"
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
                <div className="space-y-6">
                  {albums.map((event) => {
                    const dateRange = formatDateRange(event.event_date, event.end_date)
                    const photosToDisplay = event.sample_photos && event.sample_photos.length > 0
                      ? event.sample_photos
                      : event.cover_image_url
                        ? [event.cover_image_url]
                        : []

                    return (
                      <Link
                        key={event.id}
                        href={`/dashboard/events/${event.slug}`}
                        className="group block space-y-3 rounded-3xl border border-[#e5dfd0] bg-[#ffffff] p-5 shadow-xs transition-all hover:border-mauve/40"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-playfair text-lg font-bold text-ink group-hover:text-mauve transition-colors">{event.name}</h3>
                            <StatusPill status={event.status} />
                          </div>
                          {dateRange && <span className="text-xs text-ink-secondary font-medium">{dateRange}</span>}
                        </div>

                        {/* 4-Image Horizontal Grid (Matching Image 1 Reference) */}
                        <div className="grid grid-cols-4 gap-2 h-28 rounded-2xl overflow-hidden">
                          {[0, 1, 2, 3].map((idx) => {
                            const photoSrc = photosToDisplay[idx] || event.cover_image_url
                            return (
                              <div key={idx} className="relative h-full w-full bg-ink/5 overflow-hidden rounded-xl border border-hairline-dark">
                                {photoSrc ? (
                                  <img
                                    src={photoSrc.startsWith("http") ? photoSrc : supabasePhotoUrl(photoSrc)}
                                    alt=""
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-mauve/5 text-mauve/40">
                                    <Camera className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        <div className="flex items-center justify-between text-xs text-ink-secondary pt-1">
                          <span>{event.photo_count} memories captured</span>
                          <span className="font-semibold text-mauve group-hover:underline flex items-center gap-1">View Album →</span>
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
