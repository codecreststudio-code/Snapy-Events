"use server"

import { createServiceClient, createClient as createServerClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/types"

export async function inviteTeamMemberAction(email: string, role: UserRole) {
  const userSupabase = await createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Check if current user is owner or admin in their organization
  const { data: profile } = await userSupabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
    throw new Error("Unauthorized to invite team members")
  }

  // Create admin client to invite user
  const adminSupabase = await createServiceClient()
  const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { 
      role, 
      invited_by: user.id,
      organization_id: profile.organization_id
    },
  })

  if (error) throw new Error(error.message)
}
