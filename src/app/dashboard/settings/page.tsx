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
import { User, Bell, Shield, Building2, CreditCard } from "lucide-react"
import type { UserWithOrganization } from "@/lib/types"

async function getProfile(): Promise<UserWithOrganization | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("users")
    .select("*, organization:organizations(*)")
    .eq("id", user.id)
    .single()

  if (error) throw error
  return data as UserWithOrganization
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

async function updateOrganization(data: { name?: string }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization")

  const { error } = await supabase
    .from("organizations")
    .update({ name: data.name })
    .eq("id", profile.organization_id)

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

  const [orgForm, setOrgForm] = useState({
    name: (profile?.organization as { name?: string })?.name || "",
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

  const orgMutation = useMutation({
    mutationFn: () => updateOrganization(orgForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      toast({ title: "Organization updated successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update organization", description: error.message, variant: "destructive" })
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Organization</CardTitle>
            </div>
            <CardDescription>Settings for your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ name: e.target.value })}
                placeholder="My Photography Studio"
              />
            </div>
            <Button
              onClick={() => orgMutation.mutate()}
              disabled={orgMutation.isPending || !orgForm.name}
            >
              {orgMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ full_name: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <Button
              onClick={() => profileMutation.mutate()}
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Choose what you want to be notified about</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Photos Uploaded</Label>
                <p className="text-sm text-muted-foreground">
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
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Guest Uploads</Label>
                <p className="text-sm text-muted-foreground">
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
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Event Reminders</Label>
                <p className="text-sm text-muted-foreground">
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
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>WhatsApp Updates</Label>
                <p className="text-sm text-muted-foreground">
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
            >
              {notificationMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">
                  Change your account password
                </p>
              </div>
              <Button variant="outline">Change Password</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button variant="outline">Enable 2FA</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}