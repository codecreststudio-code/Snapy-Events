"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Badge } from "@/lib/components/ui/badge"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"
import { toast } from "@/lib/components/ui/toaster"
import {
  ArrowLeft,
  Crown,
  Invite,
  MoreVertical,
  Shield,
  Trash2,
  User,
  UserPlus,
} from "lucide-react"
import { getInitials } from "@/lib/utils"
import type { UserRole, UserWithOrganization } from "@/lib/types"

interface TeamMember extends UserWithOrganization {
  invited_at?: string
}

async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization")

  const { data, error } = await supabase
    .from("users")
    .select("*, organization:organizations(*)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data as TeamMember[]) || []
}

async function inviteTeamMember(email: string, role: UserRole) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase.auth.inviteUserByEmail(email, {
    data: { role, invited_by: user.id },
  })

  if (error) throw new Error(error.message)
}

async function updateMemberRole(memberId: string, role: UserRole) {
  const supabase = createClient()
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", memberId)

  if (error) throw new Error(error.message)
}

async function removeTeamMember(memberId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", memberId)

  if (error) throw new Error(error.message)
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

const ROLE_COLORS: Record<UserRole, string> = {
  owner: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  member: "bg-green-100 text-green-700",
  viewer: "bg-gray-100 text-gray-700",
}

export default function TeamPage() {
  const queryClient = useQueryClient()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<UserRole>("member")
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  const { data: members, isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: getTeamMembers,
  })

  const inviteMutation = useMutation({
    mutationFn: () => inviteTeamMember(inviteEmail, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] })
      toast({ title: "Invitation sent successfully" })
      setInviteDialogOpen(false)
      setInviteEmail("")
      setInviteRole("member")
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" })
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: UserRole }) =>
      updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] })
      toast({ title: "Role updated successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeTeamMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] })
      toast({ title: "Team member removed" })
      setRemoveDialogOpen(false)
      setMemberToRemove(null)
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove team member", description: error.message, variant: "destructive" })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                inviteMutation.mutate()
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="admin">Admin - Full access to manage team and billing</option>
                  <option value="member">Member - Can create and manage events</option>
                  <option value="viewer">Viewer - Can only view events</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members?.length || 0} member(s) in your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                    {getInitials(member.full_name || member.email)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.full_name || "Unnamed"}</p>
                      {member.role === "owner" && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={ROLE_COLORS[member.role]}>{ROLE_LABELS[member.role]}</Badge>
                  {member.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            if (member.role !== "admin")
                              updateRoleMutation.mutate({ memberId: member.id, role: "admin" })
                          }}
                          disabled={member.role === "admin"}
                        >
                          <Shield className="h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (member.role !== "member")
                              updateRoleMutation.mutate({ memberId: member.id, role: "member" })
                          }}
                          disabled={member.role === "member"}
                        >
                          <User className="h-4 w-4" />
                          Make Member
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (member.role !== "viewer")
                              updateRoleMutation.mutate({ memberId: member.id, role: "viewer" })
                          }}
                          disabled={member.role === "viewer"}
                        >
                          <User className="h-4 w-4" />
                          Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setMemberToRemove(member)
                            setRemoveDialogOpen(true)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
          <CardDescription>What each role can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span className="font-medium">Owner</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Full access to all features</li>
                <li>Manage billing and subscription</li>
                <li>Transfer ownership</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Admin</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Manage events and galleries</li>
                <li>Invite and manage team</li>
                <li>View analytics</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-green-500" />
                <span className="font-medium">Member</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Create and edit events</li>
                <li>Manage galleries</li>
                <li>Generate QR codes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium">{memberToRemove?.full_name || memberToRemove?.email}</span>{" "}
              from the team? They will lose access to all organization resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => memberToRemove && removeMutation.mutate(memberToRemove.id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}