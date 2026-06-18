"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils"
import { EVENT_TYPES } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Event, EventSettings } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Textarea } from "@/lib/components/ui/textarea"
import { Button } from "@/lib/components/ui/button"
import { Switch } from "@/lib/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lib/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lib/components/ui/select"
import { Skeleton } from "@/lib/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/lib/components/ui/dialog"
import { toast } from "@/lib/components/ui/toaster"
import {
  ArrowLeft,
  Calendar,
  Camera,
  Download,
  Images,
  Image,
  MapPin,
  QrCode,
  Settings,
  Trash2,
  Users,
  BarChart3,
  Eye,
  Save,
} from "lucide-react"

interface EventFormData {
  name: string
  description: string
  event_type: string
  event_date: string
  end_date: string
  venue: string
  timezone: string
  status: string
  is_public: boolean
  password_protected: boolean
  password: string
  allow_guest_uploads: boolean
  auto_approve_photos: boolean
  enable_countdown: boolean
  countdown_date: string
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
]

async function getEvent(slug: string): Promise<Event> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single()

  if (error) throw error
  return data
}

async function updateEvent(slug: string, data: Partial<EventFormData>) {
  const supabase = createClient()

  const eventData = {
    name: data.name,
    description: data.description || null,
    event_type: data.event_type || null,
    event_date: data.event_date ? new Date(data.event_date).toISOString() : null,
    end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
    venue: data.venue || null,
    timezone: data.timezone,
    status: data.status,
    settings: {
      is_public: data.is_public,
      password_protected: data.password_protected,
      password: data.password_protected ? data.password : undefined,
      allow_guest_uploads: data.allow_guest_uploads,
      auto_approve_photos: data.auto_approve_photos,
      enable_countdown: data.enable_countdown,
      countdown_date: data.enable_countdown ? data.countdown_date : undefined,
    } as EventSettings,
  }

  const { error } = await supabase.from("events").update(eventData).eq("slug", slug)
  if (error) throw new Error(error.message)
}

async function deleteEvent(slug: string) {
  const supabase = createClient()
  const { error } = await supabase.from("events").delete().eq("slug", slug)
  if (error) throw new Error(error.message)
}

async function getEventGalleries(eventId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("galleries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
  return data || []
}

async function getEventQRCodes(eventId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
  return data || []
}

export default function EventDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("overview")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", params.slug],
    queryFn: () => getEvent(params.slug),
  })

  const { data: galleries } = useQuery({
    queryKey: ["event-galleries", event?.id],
    queryFn: () => getEventGalleries(event!.id),
    enabled: !!event?.id,
  })

  const { data: qrCodes } = useQuery({
    queryKey: ["event-qrcodes", event?.id],
    queryFn: () => getEventQRCodes(event!.id),
    enabled: !!event?.id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EventFormData>) => updateEvent(params.slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", params.slug] })
      toast({ title: "Event updated successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update event", description: error.message, variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      toast({ title: "Event deleted successfully" })
      router.push("/dashboard/events")
      router.refresh()
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete event", description: error.message, variant: "destructive" })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Camera className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">Event not found</h2>
        <Button asChild className="mt-4">
          <Link href="/dashboard/events">Back to Events</Link>
        </Button>
      </div>
    )
  }

  const settings = event.settings as EventSettings
  const formData: EventFormData = {
    name: event.name,
    description: event.description || "",
    event_type: event.event_type || "",
    event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
    end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : "",
    venue: event.venue || "",
    timezone: event.timezone,
    status: event.status,
    is_public: settings.is_public,
    password_protected: settings.password_protected,
    password: settings.password || "",
    allow_guest_uploads: settings.allow_guest_uploads,
    auto_approve_photos: settings.auto_approve_photos,
    enable_countdown: settings.enable_countdown,
    countdown_date: settings.countdown_date ? new Date(settings.countdown_date).toISOString().slice(0, 16) : "",
  }

  function updateField(field: keyof EventFormData, value: string | boolean) {
    const newData = { ...formData, [field]: value }
    updateMutation.mutate({ [field]: value } as Partial<EventFormData>)
    return newData
  }

  const tabs = [
    { value: "overview", label: "Overview", icon: Eye },
    { value: "galleries", label: "Galleries", icon: Gallery },
    { value: "qr", label: "QR Codes", icon: QrCode },
    { value: "guests", label: "Guests", icon: Users },
    { value: "analytics", label: "Analytics", icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-muted-foreground">
            {event.status} · {event.view_count || 0} views
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/event/${event.slug}`} target="_blank">
            View Public Page
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/events/${event.slug}/qr`}>
            <QrCode className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/dashboard/events/${event.slug}/gallery`}>
            <Gallery className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>Basic information about your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    onBlur={(e) => updateMutation.mutate({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => updateMutation.mutate({ status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event_type">Event Type</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(v) => updateMutation.mutate({ event_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(v) => updateMutation.mutate({ timezone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  onBlur={(e) => updateMutation.mutate({ description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event_date">Start Date & Time</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => updateField("event_date", e.target.value)}
                    onBlur={(e) =>
                      updateMutation.mutate({
                        event_date: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date & Time</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => updateField("end_date", e.target.value)}
                    onBlur={(e) =>
                      updateMutation.mutate({
                        end_date: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => updateField("venue", e.target.value)}
                  onBlur={(e) => updateMutation.mutate({ venue: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Settings</CardTitle>
              <CardDescription>Configure how guests interact with your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Event</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow anyone with the link to view the event
                  </p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => updateMutation.mutate({ is_public: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Password Protected</Label>
                  <p className="text-sm text-muted-foreground">
                    Require a password to access the event
                  </p>
                </div>
                <Switch
                  checked={formData.password_protected}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ password_protected: checked })
                  }
                />
              </div>

              {formData.password_protected && (
                <div className="space-y-2">
                  <Label htmlFor="password">Access Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    onBlur={(e) => updateMutation.mutate({ password: e.target.value })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Guest Uploads</Label>
                  <p className="text-sm text-muted-foreground">
                    Let guests upload photos to the event
                  </p>
                </div>
                <Switch
                  checked={formData.allow_guest_uploads}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ allow_guest_uploads: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Approve Photos</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve guest uploads without moderation
                  </p>
                </div>
                <Switch
                  checked={formData.auto_approve_photos}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ auto_approve_photos: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Countdown</Label>
                  <p className="text-sm text-muted-foreground">
                    Show a countdown timer until photos are revealed
                  </p>
                </div>
                <Switch
                  checked={formData.enable_countdown}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ enable_countdown: checked })
                  }
                />
              </div>

              {formData.enable_countdown && (
                <div className="space-y-2">
                  <Label htmlFor="countdown_date">Reveal Date & Time</Label>
                  <Input
                    id="countdown_date"
                    type="datetime-local"
                    value={formData.countdown_date}
                    onChange={(e) => updateField("countdown_date", e.target.value)}
                    onBlur={(e) =>
                      updateMutation.mutate({
                        countdown_date: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Event</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete "{event.name}"? This action cannot be
                      undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(params.slug)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete Event"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="galleries" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Galleries</h2>
              <p className="text-sm text-muted-foreground">
                {galleries?.length || 0} galleries
              </p>
            </div>
            <Button asChild>
              <Link href={`/dashboard/events/${params.slug}/gallery`}>Manage Galleries</Link>
            </Button>
          </div>

          {galleries && galleries.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {galleries.map((gallery) => (
                <Card key={gallery.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {gallery.cover_image_url ? (
                      <img
                        src={gallery.cover_image_url}
                        alt={gallery.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{gallery.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {gallery.photo_count || 0} photos
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {gallery.is_public ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                          Public
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                          Private
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Image className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No galleries yet</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Create galleries to organize photos from your event.
                </p>
                <Button asChild>
                  <Link href={`/dashboard/events/${params.slug}/gallery`}>Create Gallery</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="qr" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">QR Codes</h2>
              <p className="text-sm text-muted-foreground">
                {qrCodes?.length || 0} QR codes
              </p>
            </div>
            <Button asChild>
              <Link href={`/dashboard/events/${params.slug}/qr`}>Manage QR Codes</Link>
            </Button>
          </div>

          {qrCodes && qrCodes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {qrCodes.map((qr) => (
                <Card key={qr.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{qr.name || "QR Code"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {qr.scan_count || 0} scans
                      </p>
                    </div>
                    <QrCode className="h-8 w-8 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No QR codes yet</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Generate QR codes for guests to scan and access your event.
                </p>
                <Button asChild>
                  <Link href={`/dashboard/events/${params.slug}/qr`}>Generate QR Code</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="guests" className="space-y-6">
          <div>
            <h2 className="text-lg font-medium">Guests</h2>
            <p className="text-sm text-muted-foreground">Guest access and uploads</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Guest management coming soon</h3>
              <p className="text-sm text-muted-foreground text-center">
                Track guest uploads and manage access permissions.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div>
            <h2 className="text-lg font-medium">Analytics</h2>
            <p className="text-sm text-muted-foreground">Event performance insights</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                  <p className="mt-2 text-2xl font-semibold">{event.view_count || 0}</p>
                </div>
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Photos</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {galleries?.reduce((acc, g) => acc + (g.photo_count || 0), 0) || 0}
                  </p>
                </div>
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">QR Scans</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {qrCodes?.reduce((acc, q) => acc + (q.scan_count || 0), 0) || 0}
                  </p>
                </div>
                <QrCode className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}