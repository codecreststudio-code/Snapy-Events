"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Switch } from "@/lib/components/ui/switch"
import { Separator } from "@/lib/components/ui/separator"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { toast } from "@/lib/components/ui/toaster"
import { MfaSettings } from "./mfa-settings"
import { usePushNotifications } from "@/lib/pwa/use-push-notifications"
import {
  User as UserIcon,
  Bell,
  BellRing,
  Shield,
  Building2,
  CreditCard,
  Settings
} from "lucide-react"
import type { User } from "@/lib/types"

// Preference categories exposed by GET/PATCH /api/notifications/preferences
// (Phase B push-notification infra). Kept separate from the pre-existing
// "Notifications" card above (which is a different, older email-preference
// shape stored on users.preferences and isn't part of this API contract).
type NotificationPreferences = {
  comments: boolean
  likes: boolean
  uploads: boolean
  reminders: boolean
  marketing: boolean
  ai_stories: boolean
  highlights: boolean
  announcements: boolean
  new_guest: boolean
  milestones: boolean
}

const NOTIFICATION_PREFERENCE_FIELDS: {
  key: keyof NotificationPreferences
  label: string
  description: string
}[] = [
  { key: "uploads", label: "New uploads", description: "When new photos are uploaded to your events" },
  { key: "comments", label: "Comments", description: "When someone comments on your photos" },
  { key: "likes", label: "Likes", description: "When someone likes your photos" },
  { key: "new_guest", label: "New guest joined", description: "When a new guest joins your event" },
  { key: "reminders", label: "Event reminders", description: "Reminders before your events start" },
  { key: "ai_stories", label: "AI Story ready", description: "When your AI-generated story is ready to view" },
  { key: "highlights", label: "Highlights", description: "When we pick highlight photos from your event" },
  { key: "milestones", label: "Milestones", description: "Photo-count milestones and event achievements" },
  { key: "announcements", label: "Announcements", description: "Important updates from Snapsy" },
  { key: "marketing", label: "Marketing & offers", description: "Occasional product news, tips, and offers" },
]

async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await fetch("/api/notifications/preferences")
  if (!res.ok) throw new Error("Failed to load notification preferences")
  return res.json()
}

async function patchNotificationPreferences(patch: Partial<NotificationPreferences>): Promise<void> {
  const res = await fetch("/api/notifications/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error("Failed to update notification preferences")
}

async function getProfile(): Promise<User | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) throw error
  return data as User
}

async function updateProfile(data: { full_name?: string; avatar_url?: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("users")
    .update({ full_name: data.full_name })
    .eq("id", user.id)

  if (error) throw new Error(error.message)
}


async function updateNotificationPreferences(preferences: Record<string, boolean>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("users")
    .update({ preferences: { notification_preferences: preferences } })
    .eq("id", user.id)

  if (error) throw new Error(error.message)
}

export default function SettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  })

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || "",
    avatar_url: profile?.avatar_url || "",
  })

  const [notifications, setNotifications] = useState({
    email_new_photos: true,
    email_new_guest_uploads: true,
    email_event_reminders: true,
    whatsapp_event_updates: false,
  })

  const profileMutation = useMutation({
    mutationFn: () => updateProfile(profileForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      toast({ title: "Profile updated successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" })
    },
  })


  const notificationMutation = useMutation({
    mutationFn: () => updateNotificationPreferences(notifications),
    onSuccess: () => {
      toast({ title: "Notification preferences updated" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update preferences", description: error.message, variant: "destructive" })
    },
  })

  const { data: pushPrefs, isLoading: pushPrefsLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: getNotificationPreferences,
  })

  const pushPrefsMutation = useMutation({
    mutationFn: patchNotificationPreferences,
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<NotificationPreferences | undefined>(["notification-preferences"], (prev) =>
        prev ? { ...prev, ...variables } : prev
      )
      toast({ title: "Notification preference updated" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update preference", description: error.message, variant: "destructive" })
    },
  })

  const { permission: pushPermission, isSupported: pushSupported, requestPermission } = usePushNotifications()
  const [isEnablingPush, setIsEnablingPush] = useState(false)

  const handleEnablePush = async () => {
    setIsEnablingPush(true)
    try {
      const result = await requestPermission()
      if (result === "granted") {
        toast({ title: "Push notifications enabled" })
      } else if (result === "denied") {
        toast({
          title: "Push notifications blocked",
          description: "Enable notifications for this site in your browser's settings, then reload the page.",
          variant: "destructive",
        })
      }
    } finally {
      setIsEnablingPush(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="border-b border-[#3D332A] pb-6">
        <h1 className="font-playfair text-3xl font-light text-white">Settings</h1>
        <p className="text-white/50 mt-1 text-sm">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">

        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-mauve" />
              <CardTitle className="text-white">Profile</CardTitle>
            </div>
            <CardDescription className="text-white/50">Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">Email</Label>
              <Input id="email" value={profile?.email || ""} disabled className="bg-white/5 border-[#3D332A] text-white/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-name" className="text-white/70">Full Name</Label>
              <Input
                id="full-name"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Smith"
                className="bg-white/5 border-[#3D332A] text-white placeholder:text-white/40 focus:border-mauve focus:ring-mauve"
              />
            </div>
            <Button
              onClick={() => profileMutation.mutate()}
              disabled={profileMutation.isPending}
              className="rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {profileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-mauve" />
              <CardTitle className="text-white">Notifications</CardTitle>
            </div>
            <CardDescription className="text-white/50">Choose what you want to be notified about</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">New Photos Uploaded</Label>
                <p className="text-sm text-white/50">
                  Get notified when new photos are uploaded to your events
                </p>
              </div>
              <Switch
                checked={notifications.email_new_photos}
                onCheckedChange={(checked) =>
                  setNotifications((p) => ({ ...p, email_new_photos: checked }))
                }
              />
            </div>
            <Separator className="bg-[#3D332A]" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Guest Uploads</Label>
                <p className="text-sm text-white/50">
                  Get notified when guests upload photos
                </p>
              </div>
              <Switch
                checked={notifications.email_new_guest_uploads}
                onCheckedChange={(checked) =>
                  setNotifications((p) => ({ ...p, email_new_guest_uploads: checked }))
                }
              />
            </div>
            <Separator className="bg-[#3D332A]" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Event Reminders</Label>
                <p className="text-sm text-white/50">
                  Get reminders before your events start
                </p>
              </div>
              <Switch
                checked={notifications.email_event_reminders}
                onCheckedChange={(checked) =>
                  setNotifications((p) => ({ ...p, email_event_reminders: checked }))
                }
              />
            </div>
            <Separator className="bg-[#3D332A]" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">WhatsApp Updates</Label>
                <p className="text-sm text-white/50">
                  Receive updates via WhatsApp (if configured)
                </p>
              </div>
              <Switch
                checked={notifications.whatsapp_event_updates}
                onCheckedChange={(checked) =>
                  setNotifications((p) => ({ ...p, whatsapp_event_updates: checked }))
                }
              />
            </div>
            <Button
              onClick={() => notificationMutation.mutate()}
              disabled={notificationMutation.isPending}
              className="rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {notificationMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-mauve" />
              <CardTitle className="text-white">Push Notifications</CardTitle>
            </div>
            <CardDescription className="text-white/50">
              Control what shows up in your notification center and on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[#3D332A] bg-white/5 px-4 py-3">
              <div className="space-y-0.5">
                <Label className="text-white">Enable push notifications</Label>
                <p className="text-sm text-white/50">
                  {!pushSupported
                    ? "Not supported in this browser"
                    : pushPermission === "granted"
                      ? "Enabled on this device"
                      : pushPermission === "denied"
                        ? "Blocked — enable notifications for this site in your browser settings, then reload"
                        : "Get notified even when Snapsy isn't open"}
                </p>
              </div>
              {pushPermission === "granted" ? (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Enabled
                </span>
              ) : (
                <Button
                  onClick={handleEnablePush}
                  disabled={!pushSupported || pushPermission === "denied" || isEnablingPush}
                  size="sm"
                  className="rounded-full bg-mauve font-semibold text-[#141110] hover:bg-mauve-strong"
                >
                  {isEnablingPush ? "Requesting..." : pushPermission === "denied" ? "Blocked" : "Enable"}
                </Button>
              )}
            </div>

            <Separator className="bg-[#3D332A]" />

            {pushPrefsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              NOTIFICATION_PREFERENCE_FIELDS.flatMap((field, idx) => {
                const row = (
                  <div key={field.key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-white">{field.label}</Label>
                      <p className="text-sm text-white/50">{field.description}</p>
                    </div>
                    <Switch
                      checked={pushPrefs?.[field.key] ?? false}
                      disabled={pushPrefsMutation.isPending}
                      onCheckedChange={(checked) => pushPrefsMutation.mutate({ [field.key]: checked })}
                    />
                  </div>
                )
                if (idx === NOTIFICATION_PREFERENCE_FIELDS.length - 1) return [row]
                return [row, <Separator key={`${field.key}-sep`} className="bg-[#3D332A]" />]
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-mauve" />
              <CardTitle className="text-white">Security</CardTitle>
            </div>
            <CardDescription className="text-white/50">Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Password</Label>
                <p className="text-sm text-white/50">
                  Change your account password
                </p>
              </div>
              <Button variant="outline" className="border-[#3D332A] bg-transparent text-white/70 hover:bg-white/5 hover:text-white">Change Password</Button>
            </div>
            <Separator className="bg-[#3D332A]" />
            <div className="flex flex-col">
              <MfaSettings />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}