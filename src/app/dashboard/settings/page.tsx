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
import { useAuth } from "@/lib/hooks"
import { HomeBottomTabs } from "@/lib/components/layout/home-bottom-tabs"
import Link from "next/link"
import {
  User as UserIcon,
  Bell,
  BellRing,
  Shield,
  Building2,
  CreditCard,
  Settings as SettingsIcon,
  Pencil,
  Globe,
  Mail,
  Tag,
  LogOut,
  Trash2,
  QrCode,
  Download,
  ShieldAlert
} from "lucide-react"
import type { User } from "@/lib/types"

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

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
  const { signOut } = useAuth()

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

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
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

  // Derive initials
  const nameToUse = profileForm.full_name || profile?.full_name || profile?.email || "User"
  const initials = nameToUse
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16">
      <div className="border-b border-[#e5dfd0] pb-4">
        <h1 className="font-playfair text-3xl font-light text-ink">Settings</h1>
      </div>

      {/* SECTION 1: INFO */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-secondary">INFO</p>
        <div className="flex items-center gap-4 bg-surface-card border border-hairline-dark p-4 rounded-3xl shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#faf6ed] border-2 border-[#e5dfd0] flex items-center justify-center text-[#b8925a] font-bold text-lg shrink-0 shadow-inner">
            {initials}
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              value={profileForm.full_name || profile?.full_name || ""}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              placeholder="Enter your name"
              className="w-full rounded-2xl border border-hairline-dark bg-surface-dark px-4 py-3 text-sm text-ink font-semibold focus:border-mauve outline-none transition-colors pr-10"
            />
            <button
              onClick={() => profileMutation.mutate()}
              disabled={profileMutation.isPending}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-secondary hover:text-mauve transition cursor-pointer"
              title="Save name"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: SOCIALS */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-secondary">SOCIALS</p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 bg-surface-card border border-hairline-dark p-4 rounded-2xl hover:border-mauve transition text-ink font-semibold text-xs cursor-pointer shadow-sm"
          >
            <InstagramIcon className="h-4 w-4 text-pink-500" />
            <span>Instagram</span>
          </a>
          <a
            href="https://snapsy.events"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 bg-surface-card border border-hairline-dark p-4 rounded-2xl hover:border-mauve transition text-ink font-semibold text-xs cursor-pointer shadow-sm"
          >
            <Globe className="h-4 w-4 text-mauve" />
            <span>Website</span>
          </a>
        </div>
        <a
          href="/contact"
          className="flex items-center gap-3 bg-surface-card border border-hairline-dark p-4 rounded-2xl hover:border-mauve transition text-ink font-semibold text-xs cursor-pointer shadow-sm w-full"
        >
          <Mail className="h-4 w-4 text-ink-secondary" />
          <span>Contact Support</span>
        </a>
      </div>

      {/* SECTION 4: DESTINATIONS & OPTIONS */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-secondary">DESTINATIONS</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-3 bg-surface-card border border-hairline-dark p-4 rounded-2xl hover:border-mauve transition text-ink font-semibold text-xs cursor-pointer shadow-sm"
          >
            <CreditCard className="h-4 w-4 text-mauve" />
            <span>Billing & Subscriptions</span>
          </Link>
          <Link
            href="/dashboard/qr"
            className="flex items-center gap-3 bg-surface-card border border-hairline-dark p-4 rounded-2xl hover:border-mauve transition text-ink font-semibold text-xs cursor-pointer shadow-sm"
          >
            <QrCode className="h-4 w-4 text-mauve" />
            <span>QR Codes & Invites</span>
          </Link>
          <Link
            href="/dashboard/downloads"
            className="flex items-center gap-3 bg-surface-card border border-hairline-dark p-4 rounded-2xl hover:border-mauve transition text-ink font-semibold text-xs cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4 text-mauve" />
            <span>Downloads & Exports</span>
          </Link>
          {profile?.is_admin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 bg-surface-card border border-mauve/40 p-4 rounded-2xl hover:border-mauve transition text-mauve font-semibold text-xs cursor-pointer shadow-sm"
            >
              <Shield className="h-4 w-4 text-mauve" />
              <span>Admin Portal</span>
            </Link>
          )}
        </div>
      </div>

      {/* SECTION 4: ACCOUNT */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-secondary">ACCOUNT</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 bg-surface-card border border-red-500/20 p-4 rounded-2xl hover:bg-red-500/10 transition text-red-500 font-semibold text-xs cursor-pointer shadow-sm w-full text-left"
        >
          <LogOut className="h-4 w-4 text-red-500" />
          <span>Logout</span>
        </button>
        <button
          onClick={() => toast({ title: "Delete Account", description: "Please contact support to delete your account data.", variant: "destructive" })}
          className="flex items-center gap-3 bg-surface-card border border-red-500/20 p-4 rounded-2xl hover:bg-red-500/10 transition text-red-500 font-semibold text-xs cursor-pointer shadow-sm w-full text-left"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
          <span>Delete Account</span>
        </button>
      </div>

      <div className="space-y-6 pt-6 border-t border-[#e5dfd0]">

        <Card className="rounded-2xl border border-[#e5dfd0] bg-[#ffffff]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-mauve" />
              <CardTitle className="text-ink">Profile</CardTitle>
            </div>
            <CardDescription className="text-ink-secondary">Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-ink-secondary">Email</Label>
              <Input id="email" value={profile?.email || ""} disabled className="bg-ink/5 border-[#e5dfd0] text-ink-secondary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-name" className="text-ink-secondary">Full Name</Label>
              <Input
                id="full-name"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Smith"
                className="bg-ink/5 border-[#e5dfd0] text-ink placeholder:text-ink-tertiary focus:border-mauve focus:ring-mauve"
              />
            </div>
            <Button
              onClick={() => profileMutation.mutate()}
              disabled={profileMutation.isPending}
              className="rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {profileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#e5dfd0] bg-[#ffffff]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-mauve" />
              <CardTitle className="text-ink">Notifications</CardTitle>
            </div>
            <CardDescription className="text-ink-secondary">Choose what you want to be notified about</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-ink">New Photos Uploaded</Label>
                <p className="text-sm text-ink-secondary">
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
            <Separator className="bg-[#e5dfd0]" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-ink">Guest Uploads</Label>
                <p className="text-sm text-ink-secondary">
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
            <Separator className="bg-[#e5dfd0]" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-ink">Event Reminders</Label>
                <p className="text-sm text-ink-secondary">
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
            <Separator className="bg-[#e5dfd0]" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-ink">WhatsApp Updates</Label>
                <p className="text-sm text-ink-secondary">
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
              className="rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              {notificationMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#e5dfd0] bg-[#ffffff]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-mauve" />
              <CardTitle className="text-ink">Push Notifications</CardTitle>
            </div>
            <CardDescription className="text-ink-secondary">
              Control what shows up in your notification center and on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[#e5dfd0] bg-ink/5 px-4 py-3">
              <div className="space-y-0.5">
                <Label className="text-ink">Enable push notifications</Label>
                <p className="text-sm text-ink-secondary">
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
                  className="rounded-full bg-mauve font-semibold text-[#faf6ed] hover:bg-mauve-strong"
                >
                  {isEnablingPush ? "Requesting..." : pushPermission === "denied" ? "Blocked" : "Enable"}
                </Button>
              )}
            </div>

            <Separator className="bg-[#e5dfd0]" />

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
                      <Label className="text-ink">{field.label}</Label>
                      <p className="text-sm text-ink-secondary">{field.description}</p>
                    </div>
                    <Switch
                      checked={pushPrefs?.[field.key] ?? false}
                      disabled={pushPrefsMutation.isPending}
                      onCheckedChange={(checked) => pushPrefsMutation.mutate({ [field.key]: checked })}
                    />
                  </div>
                )
                if (idx === NOTIFICATION_PREFERENCE_FIELDS.length - 1) return [row]
                return [row, <Separator key={`${field.key}-sep`} className="bg-[#e5dfd0]" />]
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#e5dfd0] bg-[#ffffff]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-mauve" />
              <CardTitle className="text-ink">Security</CardTitle>
            </div>
            <CardDescription className="text-ink-secondary">Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-ink">Password</Label>
                <p className="text-sm text-ink-secondary">
                  Change your account password
                </p>
              </div>
              <Button variant="outline" className="border-[#e5dfd0] bg-transparent text-ink-secondary hover:bg-mauve/5 hover:text-ink">Change Password</Button>
            </div>
            <Separator className="bg-[#e5dfd0]" />
            <div className="flex flex-col">
              <MfaSettings />
            </div>
          </CardContent>
        </Card>
      </div>

      <HomeBottomTabs />
    </div>
  )
}