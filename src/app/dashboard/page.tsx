"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Camera,
  Image as ImageIcons,
  QrCode,
  TrendingUp,
  Plus,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronRight,
  Layers,
  ImageIcon
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
import { useAuth } from "@/lib/hooks"

interface DashboardStats {
  totalEvents: number
  totalPhotos: number
  totalGalleries: number
  totalQRCodes: number
  recentEvents: Array<{
    id: string
    name: string
    slug: string
    event_date: string | null
    status: string
    photo_count: number
  }>
}

async function getDashboardStats(orgId: string): Promise<DashboardStats> {
  const supabase = createClient()

  // Fetch recent events and all event IDs for total host metric aggregation
  const [eventsResult, allEventsResult] = await Promise.all([
    supabase
      .from("events")
      .select(`id, name, slug, event_date, status, galleries(id, photo_count)`)
      .eq("host_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("events")
      .select("id")
      .eq("host_id", orgId)
  ])

  const events = eventsResult.data || []
  const allHostEvents = allEventsResult.data || []
  const allHostEventIds = allHostEvents.map((e: any) => e.id)
  const totalEventCount = allHostEvents.length

  let photoCount = 0
  let galleryCount = 0
  let qrCount = 0

  if (allHostEventIds.length > 0) {
    const [photoCountResult, galleryCountResult, qrCountResult] = await Promise.all([
      supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .in("event_id", allHostEventIds),

      supabase
        .from("galleries")
        .select("id", { count: "exact", head: true })
        .in("event_id", allHostEventIds),

      supabase
        .from("qr_codes")
        .select("id", { count: "exact", head: true })
        .in("event_id", allHostEventIds),
    ])

    // Count directly from the photos table — it's the source of truth for
    // "how many photos exist right now". storage_usage.photo_count used to be
    // read here instead, but that column is a running upload counter that
    // never decrements on delete, so it drifts from reality (a host who
    // uploaded and then removed photos, or whose count came from an older
    // event, would see a stale "Total Photos" that doesn't match any actual
    // gallery — exactly the "shows 5 but every gallery says 0" report).
    photoCount = photoCountResult.count || 0
    galleryCount = galleryCountResult.count || 0
    qrCount = qrCountResult.count || 0
  }

  const recentEventsWithCounts = events.map((event: any) => ({
    id: event.id,
    name: event.name,
    slug: event.slug,
    event_date: event.event_date,
    status: event.status,
    photo_count: (event.galleries as any[])?.reduce((sum, g) => sum + (g.photo_count || 0), 0) || 0,
  }))

  return {
    totalEvents: totalEventCount,
    totalPhotos: photoCount,
    totalGalleries: galleryCount,
    totalQRCodes: qrCount,
    recentEvents: recentEventsWithCounts,
  }
}


export default function DashboardPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const orgId = profile?.id

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", orgId],
    queryFn: () => getDashboardStats(orgId!),
    enabled: !!orgId,
    // Safety-net poll (same pattern as the event detail page) so guest-driven
    // changes — a new upload, a QR scan — show up here even if the host
    // never triggers a mutation or refocuses the tab.
    refetchInterval: 20000,
  })

  const isLoading = authLoading || (!!orgId && statsLoading)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mauve" />
      </div>
    )
  }

  // Calculate onboarding progress based on database states
  const onboardingSteps = [
    {
      id: "create-event",
      title: "Create your first event",
      description: "Set up the basic details of your occasion to begin.",
      completed: (stats?.totalEvents || 0) > 0,
      link: "/dashboard/events/new",
    },
    {
      id: "configure-gallery",
      title: "Set up a photo gallery",
      description: "Galleries organize where guests store and view photos.",
      completed: (stats?.totalGalleries || 0) > 0,
      link: "/dashboard/events",
    },
    {
      id: "generate-qr",
      title: "Generate QR codes",
      description: "Display QR codes at your venue so guests can scan to upload.",
      completed: (stats?.totalQRCodes || 0) > 0,
      link: "/dashboard/qr",
    },
    {
      id: "upload-photo",
      title: "Receive your first upload",
      description: "A guest scans the QR and uploads a test photo.",
      completed: (stats?.totalPhotos || 0) > 0,
      link: "/dashboard/events",
    },
  ]

  const completedStepsCount = onboardingSteps.filter((step) => step.completed).length
  const onboardingPercent = Math.round((completedStepsCount / onboardingSteps.length) * 100)

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#3D332A] pb-6">
        <div>
          <h1 className="font-playfair text-3xl font-light text-white">
            Dashboard Overview
          </h1>
          <p className="text-white/50 mt-1 text-sm">
            Track scans, verify media uploads, and manage event photo-sharing checkpoints.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/events/new">
            <Button className="rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Events */}
        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814] relative overflow-hidden group hover:border-mauve/40 hover:shadow-xl hover:shadow-mauve/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-mauve/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Total Events</span>
            <Camera className="h-4 w-4 text-white/50 group-hover:text-mauve transition-colors" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-extrabold tracking-tight text-white">{stats?.totalEvents || 0}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Live Tracker
              </span>
            </div>
            {/* Sparkline Visual SVG */}
            <div className="h-8 pt-2">
              <svg className="w-full h-full text-mauve/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,18 Q15,10 30,15 T60,5 T90,12 L100,10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Total Photos */}
        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814] relative overflow-hidden group hover:border-mauve/40 hover:shadow-xl hover:shadow-mauve/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-mauve/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Total Photos</span>
            <Layers className="h-4 w-4 text-white/50 group-hover:text-mauve transition-colors" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-extrabold tracking-tight text-white">{stats?.totalPhotos || 0}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-mauve bg-mauve/10 border border-mauve/20 px-2 py-0.5 rounded-full">
                Real-time collection
              </span>
            </div>
            {/* Sparkline Visual SVG */}
            <div className="h-8 pt-2">
              <svg className="w-full h-full text-mauve/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,15 Q20,5 40,12 T80,3 T100,10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Galleries */}
        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814] relative overflow-hidden group hover:border-mauve/40 hover:shadow-xl hover:shadow-mauve/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-mauve/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Active Galleries</span>
            <ImageIcon className="h-4 w-4 text-white/50 group-hover:text-mauve transition-colors" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-extrabold tracking-tight text-white">{stats?.totalGalleries || 0}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-mauve bg-mauve/10 border border-mauve/20 px-2 py-0.5 rounded-full">
                QR-enabled access
              </span>
            </div>
            {/* Sparkline Visual SVG */}
            <div className="h-8 pt-2">
              <svg className="w-full h-full text-mauve/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,10 Q25,18 50,8 T75,12 T100,5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* QR Codes */}
        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814] relative overflow-hidden group hover:border-mauve/40 hover:shadow-xl hover:shadow-mauve/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-mauve/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">QR Codes</span>
            <QrCode className="h-4 w-4 text-white/50 group-hover:text-mauve transition-colors" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-extrabold tracking-tight text-white">{stats?.totalQRCodes || 0}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-mauve bg-mauve/10 border border-mauve/20 px-2 py-0.5 rounded-full">
                Scan checkpoints
              </span>
            </div>
            {/* Sparkline Visual SVG */}
            <div className="h-8 pt-2">
              <svg className="w-full h-full text-mauve/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,17 Q30,12 50,15 T80,8 T100,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Onboarding Checklist & Recent Events */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Onboarding Checklist (Left 5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-mauve via-mauve-strong to-mauve" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                  <Sparkles className="h-5 w-5 text-mauve animate-pulse" />
                  Get Started Checklist
                </CardTitle>
                <span className="text-xs font-bold text-mauve bg-mauve/10 border border-mauve/20 px-2 py-0.5 rounded-full">
                  {onboardingPercent}% Done
                </span>
              </div>
              <CardDescription className="text-xs text-white/50">
                Complete these initial actions to launch your interactive event photography galleries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-mauve to-mauve-strong transition-all duration-500"
                  style={{ width: `${onboardingPercent}%` }}
                />
              </div>

              {/* Steps checklist */}
              <div className="space-y-3 pt-2">
                {onboardingSteps.map((step, idx) => (
                  <Link
                    href={step.completed ? "#" : step.link}
                    key={step.id}
                    className={`block p-3 rounded-lg border transition-all ${
                      step.completed
                        ? "bg-white/5 border-white/10 opacity-75"
                        : "bg-white/[0.03] hover:bg-mauve/5 border-[#3D332A] hover:border-mauve/30 hover:scale-[1.01]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-white/40 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`text-sm font-semibold leading-tight ${step.completed ? "line-through text-white/40" : "text-white"}`}>
                          {step.title}
                        </h4>
                        <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Events List (Right 7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-white">Recent Events</CardTitle>
                <CardDescription className="text-xs text-white/50">Your latest event photo hubs</CardDescription>
              </div>
              <Link href="/dashboard/events">
                <Button variant="outline" size="sm" className="text-xs group border-[#3D332A] bg-transparent text-white/70 hover:bg-white/5 hover:text-white">
                  View All
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats?.recentEvents && stats.recentEvents.length > 0 ? (
                <div className="space-y-3.5">
                  {stats.recentEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/dashboard/events/${event.slug}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-[#3D332A] bg-white/[0.02] hover:bg-white/[0.04] hover:border-mauve/40 hover:shadow-md hover:shadow-mauve/5 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mauve/10 group-hover:bg-mauve group-hover:text-[#141110] transition-all duration-300">
                          <Camera className="h-5 w-5 text-mauve group-hover:text-[#141110] transition-colors" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-semibold text-sm truncate text-white group-hover:text-mauve transition-colors">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                            {event.event_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(event.event_date)}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                              <ImageIcon className="h-3.5 w-3.5" />
                              {event.photo_count} photos
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                            event.status === "published"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-mauve/10 border-mauve/20 text-mauve"
                          }`}
                        >
                          {event.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-mauve transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-[#3D332A] rounded-xl bg-white/[0.02]">
                  <div className="p-4 bg-white/5 rounded-full w-fit mx-auto border border-[#3D332A] mb-4">
                    <Camera className="h-10 w-10 text-white/30" />
                  </div>
                  <h3 className="font-bold text-base text-white">No active events</h3>
                  <p className="text-xs text-white/50 mt-2 max-w-xs mx-auto">
                    Create your first photography event to instantly collect guest pictures.
                  </p>
                  <Link href="/dashboard/events/new" className="inline-block mt-5">
                    <Button size="sm" className="rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814]">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white">Quick Shortcuts</CardTitle>
          <CardDescription className="text-xs text-white/50">Direct paths to essential checkpoint controllers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-3">
            {/* Create Event */}
            <Link href="/dashboard/events/new">
              <div className="p-5 rounded-xl border border-[#3D332A] bg-white/[0.02] hover:bg-mauve/5 hover:border-mauve/40 hover:scale-[1.01] hover:shadow-lg hover:shadow-mauve/5 transition-all duration-300 cursor-pointer group">
                <div className="p-3 bg-mauve/10 rounded-xl w-fit group-hover:bg-mauve group-hover:text-[#141110] transition-all duration-300">
                  <Camera className="h-6 w-6 text-mauve group-hover:text-[#141110]" />
                </div>
                <h3 className="font-bold text-sm mt-4 text-white group-hover:text-mauve transition-colors">Create Event</h3>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  Establish a new QR upload hub for a marriage, party, or coordinate project.
                </p>
              </div>
            </Link>

            {/* Manage QR Codes */}
            <Link href="/dashboard/qr">
              <div className="p-5 rounded-xl border border-[#3D332A] bg-white/[0.02] hover:bg-mauve/5 hover:border-mauve/40 hover:scale-[1.01] hover:shadow-lg hover:shadow-mauve/5 transition-all duration-300 cursor-pointer group">
                <div className="p-3 bg-mauve/10 rounded-xl w-fit group-hover:bg-mauve group-hover:text-[#141110] transition-all duration-300">
                  <QrCode className="h-6 w-6 text-mauve group-hover:text-[#141110]" />
                </div>
                <h3 className="font-bold text-sm mt-4 text-white group-hover:text-mauve transition-colors">QR codes Manager</h3>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  Download printable SVG vectors, view scanning stats, and monitor active paths.
                </p>
              </div>
            </Link>

            {/* Galleries */}
            <Link href="/dashboard/galleries">
              <div className="p-5 rounded-xl border border-[#3D332A] bg-white/[0.02] hover:bg-mauve/5 hover:border-mauve/40 hover:scale-[1.01] hover:shadow-lg hover:shadow-mauve/5 transition-all duration-300 cursor-pointer group">
                <div className="p-3 bg-mauve/10 rounded-xl w-fit group-hover:bg-mauve group-hover:text-[#141110] transition-all duration-300">
                  <ImageIcon className="h-6 w-6 text-mauve group-hover:text-[#141110]" />
                </div>
                <h3 className="font-bold text-sm mt-4 text-white group-hover:text-mauve transition-colors">Shared Galleries</h3>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  Modify watermarks, toggle guest permission layers, and setup AI face lookups.
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}