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

  // Run all queries in parallel — eliminates the sequential waterfall
  const [
    eventsResult,
    eventCountResult,
  ] = await Promise.all([
    // Recent events with gallery photo counts
    supabase
      .from("events")
      .select(`id, name, slug, event_date, status, galleries(id, photo_count)`)
      .eq("host_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),

    // Total event count
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("host_id", orgId),
  ])

  const events = eventsResult.data || []
  const allEventIds = events.map((e: any) => e.id)
  const totalEventCount = eventCountResult.count || 0

  // Second parallel batch — only if there are events
  let photoCount = 0
  let galleryCount = 0
  let qrCount = 0

  if (allEventIds.length > 0) {
    const [storageResult, photoCountResult, galleryCountResult, qrCountResult] = await Promise.all([
      supabase
        .from("storage_usage")
        .select("photo_count")
        .eq("user_id", orgId)
        .maybeSingle(),

      supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .in("event_id", allEventIds),

      supabase
        .from("galleries")
        .select("id", { count: "exact", head: true })
        .in("event_id", allEventIds),

      supabase
        .from("qr_codes")
        .select("id", { count: "exact", head: true })
        .in("event_id", allEventIds),
    ])

    photoCount = storageResult.data?.photo_count || photoCountResult.count || 0
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
  })

  const isLoading = authLoading || (!!orgId && statsLoading)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Track scans, verify media uploads, and manage event photo-sharing checkpoints.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/events/new">
            <Button className="shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Events */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-primary/20 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Events</span>
            <Camera className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-extrabold tracking-tight">{stats?.totalEvents || 0}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Live Tracker
              </span>
            </div>
            {/* Sparkline Visual SVG */}
            <div className="h-8 pt-2">
              <svg className="w-full h-full text-primary/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,18 Q15,10 30,15 T60,5 T90,12 L100,10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Total Photos */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-violet-500/20 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Photos</span>
            <Layers className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 transition-colors" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-extrabold tracking-tight">{stats?.totalPhotos || 0}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full">
                Real-time collection
              </span>
            </div>
            {/* Sparkline Visual SVG */}
            <div className="h-8 pt-2">
              <svg className="w-full h-full text-violet-500/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,15 Q20,5 40,12 T80,3 T100,10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Galleries */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-pink-500/20 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Galleries</span>
            <ImageIcon className="h-4 w-4 text-muted-foreground group-hover:text-pink-500 transition-colors" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-extrabold tracking-tight">{stats?.totalGalleries || 0}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded-full">
                QR-enabled access
              </span>
            </div>
            {/* Sparkline Visual SVG */}
            <div className="h-8 pt-2">
              <svg className="w-full h-full text-pink-500/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,10 Q25,18 50,8 T75,12 T100,5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* QR Codes */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/20 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">QR Codes</span>
            <QrCode className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-extrabold tracking-tight">{stats?.totalQRCodes || 0}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Scan checkpoints
              </span>
            </div>
            {/* Sparkline Visual SVG */}
            <div className="h-8 pt-2">
              <svg className="w-full h-full text-indigo-500/30" viewBox="0 0 100 20" preserveAspectRatio="none">
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
          <Card className="border border-border/40 bg-card/40 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  Get Started Checklist
                </CardTitle>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {onboardingPercent}% Done
                </span>
              </div>
              <CardDescription className="text-xs">
                Complete these initial actions to launch your interactive event photography galleries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-500"
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
                        ? "bg-muted/10 border-border/30 opacity-75"
                        : "bg-background/60 hover:bg-primary/5 hover:border-primary/20 hover:scale-[1.01]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`text-sm font-semibold leading-tight ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {step.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
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
          <Card className="border border-border/40 bg-card/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Recent Events</CardTitle>
                <CardDescription className="text-xs">Your latest event photo hubs</CardDescription>
              </div>
              <Link href="/dashboard/events">
                <Button variant="outline" size="sm" className="text-xs group border-border/60">
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
                      className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card/70 hover:border-primary/20 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                          <Camera className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {event.event_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(event.event_date)}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 border-l pl-3">
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
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                          }`}
                        >
                          {event.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed rounded-xl bg-card/25">
                  <div className="p-4 bg-muted/40 rounded-full w-fit mx-auto border mb-4">
                    <Camera className="h-10 w-10 text-muted-foreground/60" />
                  </div>
                  <h3 className="font-bold text-base">No active events</h3>
                  <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                    Create your first photography event to instantly collect guest pictures.
                  </p>
                  <Link href="/dashboard/events/new" className="inline-block mt-5">
                    <Button size="sm">
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
      <Card className="border border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Quick Shortcuts</CardTitle>
          <CardDescription className="text-xs">Direct paths to essential checkpoint controllers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-3">
            {/* Create Event */}
            <Link href="/dashboard/events/new">
              <div className="p-5 rounded-xl border border-border/40 bg-card/30 hover:bg-primary/5 hover:border-primary/20 hover:scale-[1.01] hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="p-3 bg-primary/10 rounded-xl w-fit group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <Camera className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-bold text-sm mt-4 group-hover:text-primary transition-colors">Create Event</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Establish a new QR upload hub for a marriage, party, or coordinate project.
                </p>
              </div>
            </Link>

            {/* Manage QR Codes */}
            <Link href="/dashboard/qr">
              <div className="p-5 rounded-xl border border-border/40 bg-card/30 hover:bg-primary/5 hover:border-primary/20 hover:scale-[1.01] hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="p-3 bg-indigo-500/10 rounded-xl w-fit group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                  <QrCode className="h-6 w-6 text-indigo-500 group-hover:text-white" />
                </div>
                <h3 className="font-bold text-sm mt-4 group-hover:text-indigo-500 transition-colors">QR codes Manager</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Download printable SVG vectors, view scanning stats, and monitor active paths.
                </p>
              </div>
            </Link>

            {/* Galleries */}
            <Link href="/dashboard/galleries">
              <div className="p-5 rounded-xl border border-border/40 bg-card/30 hover:bg-primary/5 hover:border-primary/20 hover:scale-[1.01] hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="p-3 bg-pink-500/10 rounded-xl w-fit group-hover:bg-pink-500 group-hover:text-white transition-all duration-300">
                  <ImageIcon className="h-6 w-6 text-pink-500 group-hover:text-white" />
                </div>
                <h3 className="font-bold text-sm mt-4 group-hover:text-pink-500 transition-colors">Shared Galleries</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
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