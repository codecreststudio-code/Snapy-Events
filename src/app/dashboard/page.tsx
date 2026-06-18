"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Camera,
  Image,
  Users,
  QrCode,
  TrendingUp,
  Plus,
  ArrowRight,
  Calendar,
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"

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

async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()

  const { data: events } = await supabase
    .from("events")
    .select("id, name, slug, event_date, status")
    .order("created_at", { ascending: false })
    .limit(5)

  const { count: photoCount } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })

  const { count: galleryCount } = await supabase
    .from("galleries")
    .select("*", { count: "exact", head: true })

  const { count: qrCount } = await supabase
    .from("qr_codes")
    .select("*", { count: "exact", head: true })

  const recentEventsWithCounts = await Promise.all(
    (events || []).map(async (event) => {
      const { count } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
      return { ...event, photo_count: count || 0 }
    })
  )

  return {
    totalEvents: events?.length || 0,
    totalPhotos: photoCount || 0,
    totalGalleries: galleryCount || 0,
    totalQRCodes: qrCount || 0,
    recentEvents: recentEventsWithCounts,
  }
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your overview.</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">All time events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPhotos || 0}</div>
            <p className="text-xs text-muted-foreground">Uploaded photos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Galleries</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGalleries || 0}</div>
            <p className="text-xs text-muted-foreground">Active galleries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Codes</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalQRCodes || 0}</div>
            <p className="text-xs text-muted-foreground">Generated codes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Your latest events</CardDescription>
            </div>
            <Link href="/dashboard/events">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.recentEvents && stats.recentEvents.length > 0 ? (
            <div className="space-y-4">
              {stats.recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/events/${event.slug}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Camera className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{event.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {event.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(event.event_date)}
                          </span>
                        )}
                        <span>{event.photo_count} photos</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        event.status === "published"
                          ? "bg-green-100 text-green-700"
                          : event.status === "draft"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {event.status}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No events yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first event to get started
              </p>
              <Link href="/dashboard/events/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/events/new">
              <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Camera className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Create Event</h3>
                <p className="text-sm text-muted-foreground">Set up a new event</p>
              </div>
            </Link>

            <Link href="/dashboard/qr">
              <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <QrCode className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Manage QR Codes</h3>
                <p className="text-sm text-muted-foreground">View and edit QR codes</p>
              </div>
            </Link>

            <Link href="/dashboard/galleries">
              <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <Image className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-medium">Galleries</h3>
                <p className="text-sm text-muted-foreground">Manage your galleries</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}