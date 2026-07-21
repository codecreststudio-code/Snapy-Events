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
import {
  User as UserIcon,
  Bell,
  Shield,
  Building2,
  CreditCard,
  Settings
} from "lucide-react"
import type { User } from "@/lib/types"

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