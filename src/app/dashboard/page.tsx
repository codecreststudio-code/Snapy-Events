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

function supabasePhotoUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path
  }
  const cleanPath = path.startsWith("/") ? path.slice(1) : path
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rgueysvqeivxdnoeholx.supabase.co"

  if (cleanPath.startsWith("photos/") || cleanPath.startsWith("event-memories/") || cleanPath.startsWith("event-photos/") || cleanPath.startsWith("gallery-covers/")) {
    return `${supabaseUrl}/storage/v1/object/public/${cleanPath}`
  }
  return `${supabaseUrl}/storage/v1/object/public/photos/${cleanPath}`
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
    .select("event_id, storage_path, thumbnail_path")
    .in("event_id", eventIds)

  const countMap: Record<string, number> = {}
  const samplePhotoMap: Record<string, string[]> = {}
  photosData?.forEach((p) => {
    countMap[p.event_id] = (countMap[p.event_id] || 0) + 1
    if (!samplePhotoMap[p.event_id]) samplePhotoMap[p.event_id] = []
    const imgPath = p.thumbnail_path || p.storage_path
    if (samplePhotoMap[p.event_id].length < 4 && imgPath) {
      samplePhotoMap[p.event_id].push(imgPath)
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

              <div className="space-y-6">
                {/* User's Created Albums */}
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

                      {/* Photos Grid or Clean Empty Placeholder */}
                      {photosToDisplay.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2 h-28 rounded-2xl overflow-hidden">
                          {photosToDisplay.slice(0, 4).map((photoPath, idx) => {
                            const photoSrc = supabasePhotoUrl(photoPath)
                            if (!photoSrc) return null
                            const totalMore = event.photo_count > 4 ? event.photo_count - 4 : 0
                            return (
                              <div key={idx} className="relative h-full w-full bg-ink/5 overflow-hidden rounded-xl border border-hairline-dark">
                                <img
                                  src={photoSrc}
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                {idx === 3 && totalMore > 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold text-xs backdrop-blur-[1px]">
                                    +{totalMore}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center rounded-2xl border border-dashed border-[#e5dfd0] bg-[#faf6ed]/50 px-4 text-center">
                          <div className="flex items-center gap-2 text-xs font-medium text-ink-secondary">
                            <Camera className="h-4 w-4 text-mauve/70" />
                            <span>No photos yet — start capturing moments</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-ink-secondary pt-1">
                        <span>{event.photo_count} memories captured</span>
                        <span className="font-semibold text-mauve group-hover:underline flex items-center gap-1">View Album →</span>
                      </div>
                    </Link>
                  )
                })}

                {/* Sample Album Card ("Welcome! SAMPLE" matching Image 2 reference) */}
                <Link
                  href="/dashboard/demo"
                  className="group block space-y-3 rounded-3xl border border-[#e5dfd0] bg-[#ffffff] p-5 shadow-xs transition-all hover:border-mauve/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-playfair text-lg font-bold text-ink group-hover:text-mauve transition-colors">
                        Welcome!
                      </h3>
                      <span className="rounded-md bg-mauve/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-mauve border border-mauve/20">
                        SAMPLE
                      </span>
                    </div>
                    <span className="text-xs text-ink-secondary font-medium">Jul 15~16, 2026</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 h-28 rounded-2xl overflow-hidden">
                    {[
                      "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
                      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
                      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80",
                      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&q=80"
                    ].map((src, idx) => (
                      <div key={idx} className="relative h-full w-full bg-ink/5 overflow-hidden rounded-xl border border-hairline-dark">
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {idx === 3 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold text-xs backdrop-blur-[1px]">
                            +3
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-secondary pt-1">
                    <span>Interactive sample album</span>
                    <span className="font-semibold text-mauve group-hover:underline flex items-center gap-1">Try Demo →</span>
                  </div>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>

      <HomeBottomTabs />
    </div>
  )
}
