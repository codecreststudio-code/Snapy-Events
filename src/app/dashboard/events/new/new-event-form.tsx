"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { slugify } from "@/lib/utils"
import { EVENT_TYPES } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/components/ui/card"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Textarea } from "@/lib/components/ui/textarea"
import { Button } from "@/lib/components/ui/button"
import { Switch } from "@/lib/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lib/components/ui/select"
import { toast } from "@/lib/components/ui/toaster"

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

interface EventFormData {
  name: string
  description: string
  event_type: string
  event_date: string
  end_date: string
  venue: string
  timezone: string
  is_public: boolean
  password_protected: boolean
  password: string
  allow_guest_uploads: boolean
  auto_approve_photos: boolean
  enable_countdown: boolean
  countdown_date: string
}

async function createEvent(data: EventFormData) {
  const supabase = createClient()

  const slug = `${slugify(data.name)}-${Date.now().toString(36)}`

  const eventData = {
    name: data.name,
    slug,
    description: data.description || null,
    event_type: data.event_type || null,
    event_date: data.event_date ? new Date(data.event_date).toISOString() : null,
    end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
    venue: data.venue || null,
    timezone: data.timezone,
    cover_image_url: null,
    status: "draft" as const,
    settings: {
      is_public: data.is_public,
      password_protected: data.password_protected,
      password: data.password_protected ? data.password : undefined,
      allow_guest_uploads: data.allow_guest_uploads,
      auto_approve_photos: data.auto_approve_photos,
      enable_countdown: data.enable_countdown,
      countdown_date: data.enable_countdown ? data.countdown_date : undefined,
    },
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert(eventData)
    .select("slug")
    .single()

  if (error) throw new Error(error.message)
  return event
}

export function NewEventForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    description: "",
    event_type: "",
    event_date: "",
    end_date: "",
    venue: "",
    timezone: "America/New_York",
    is_public: true,
    password_protected: false,
    password: "",
    allow_guest_uploads: true,
    auto_approve_photos: false,
    enable_countdown: false,
    countdown_date: "",
  })

  const mutation = useMutation({
    mutationFn: createEvent,
    onSuccess: (data) => {
      toast({ title: "Event created successfully" })
      router.push(`/dashboard/events/${data.slug}`)
      router.refresh()
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create event", description: error.message, variant: "destructive" })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(formData)
  }

  function updateField(field: keyof EventFormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Tell us about your event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Sarah & John's Wedding"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Join us for a memorable celebration..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select value={formData.event_type} onValueChange={(v) => updateField("event_type", v)}>
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
              <Select value={formData.timezone} onValueChange={(v) => updateField("timezone", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date & Venue</CardTitle>
          <CardDescription>When and where is your event?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event_date">Start Date & Time</Label>
              <Input
                id="event_date"
                type="datetime-local"
                value={formData.event_date}
                onChange={(e) => updateField("event_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => updateField("venue", e.target.value)}
              placeholder="123 Main Street, City, State 12345"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cover Image</CardTitle>
          <CardDescription>Add a cover image for your event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Click to upload or drag and drop</p>
              <p className="text-xs">PNG, JPG, WEBP up to 10MB</p>
            </div>
            <input type="file" accept="image/*" className="hidden" />
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
              <p className="text-sm text-muted-foreground">Allow anyone with the link to view the event</p>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) => updateField("is_public", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Password Protected</Label>
              <p className="text-sm text-muted-foreground">Require a password to access the event</p>
            </div>
            <Switch
              checked={formData.password_protected}
              onCheckedChange={(checked) => updateField("password_protected", checked)}
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
                placeholder="Enter password"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Guest Uploads</Label>
              <p className="text-sm text-muted-foreground">Let guests upload photos to the event</p>
            </div>
            <Switch
              checked={formData.allow_guest_uploads}
              onCheckedChange={(checked) => updateField("allow_guest_uploads", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Approve Photos</Label>
              <p className="text-sm text-muted-foreground">Automatically approve guest uploads without moderation</p>
            </div>
            <Switch
              checked={formData.auto_approve_photos}
              onCheckedChange={(checked) => updateField("auto_approve_photos", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Countdown</Label>
              <p className="text-sm text-muted-foreground">Show a countdown timer until photos are revealed</p>
            </div>
            <Switch
              checked={formData.enable_countdown}
              onCheckedChange={(checked) => updateField("enable_countdown", checked)}
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
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create Event"}
        </Button>
      </div>
    </form>
  )
}