// src/lib/auth/session.ts
// Server-side auth helpers that read the active session from Supabase and
// resolve the current user, organization, role, and permissions.

import { createClient } from "@/lib/supabase/server"
import { hasPermission } from "@/lib/auth/rbac"
import type { Permission, UserRole } from "@/lib/types"
import { HttpError } from "@/lib/api/handler"

export interface AuthContext {
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
  organization: {
    id: string
    name: string
    slug: string
    plan: string
    feature_flags: Record<string, boolean>
  } | null
  role: UserRole
  permissions: Permission[]
  isAdmin: boolean
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log(`[getAuthContext] User resolved: ${user ? user.email : "null"}`)
  if (!user) return emptyAuth()

  let profileData: any = null
  const { data: existingProfile, error: profileError } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, role, permissions, is_admin, organization_id, organizations:organizations(id, name, slug, plan, feature_flags)")
    .eq("id", user.id)
    .single()

  if (profileError || !existingProfile) {
    console.log(`[getAuthContext] Profile not found for user: ${user.id}. Auto-provisioning...`)
    const { createServiceClient } = await import("@/lib/supabase/server")
    const svc = await createServiceClient()
    
    const userEmail = user.email || ""
    const fullName = user.user_metadata?.full_name || userEmail.split("@")[0] || "User"
    const avatarUrl = user.user_metadata?.avatar_url || null

    const { data: insertedProfile, error: insertError } = await svc
      .from("users")
      .insert({
        id: user.id,
        email: userEmail,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: "owner",
        permissions: ["*"],
        is_admin: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error(`[getAuthContext] Failed to auto-provision user profile:`, insertError.message)
      return emptyAuth()
    }

    // Refetch the profile with organizations relation
    const { data: refetchedProfile } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, role, permissions, is_admin, organization_id, organizations:organizations(id, name, slug, plan, feature_flags)")
      .eq("id", user.id)
      .single()

    profileData = refetchedProfile
  } else {
    profileData = existingProfile
  }

  if (!profileData) {
    console.log(`[getAuthContext] Profile resolve failed for user: ${user.id}`)
    return emptyAuth()
  }

  const profile = profileData

  // Server-side auto-provisioning of organization if it is missing
  if (!profile.organization_id) {
    console.log(`[getAuthContext] User ${user.email} is missing organization_id. Auto-provisioning...`)
    const { createServiceClient } = await import("@/lib/supabase/server")
    const { slugify } = await import("@/lib/utils")
    const svc = await createServiceClient()
    
    const userEmail = profile.email || user.email || ""
    const fullName = profile.full_name || userEmail.split("@")[0] || "User"
    const orgName = `${fullName}'s Workspace`
    const orgSlug = `${slugify(orgName)}-${Date.now().toString(36).slice(-4)}`

    const { data: org, error: orgError } = await svc
      .from("organizations")
      .insert({
        name: orgName,
        slug: orgSlug,
        plan: "free",
      })
      .select()
      .single()

    if (!orgError && org) {
      const { error: updateError } = await svc
        .from("users")
        .update({
          organization_id: org.id,
          role: "owner",
          permissions: ["*"],
        })
        .eq("id", user.id)

      if (!updateError) {
        // Re-fetch profile with the new organization linked
        const { data: updatedProfile } = await supabase
          .from("users")
          .select("id, email, full_name, avatar_url, role, permissions, is_admin, organization_id, organizations:organizations(id, name, slug, plan, feature_flags)")
          .eq("id", user.id)
          .single()
        
        if (updatedProfile) {
          profile.organization_id = updatedProfile.organization_id
          ;(profile as any).organizations = (updatedProfile as any).organizations
          profile.role = updatedProfile.role
          profile.permissions = updatedProfile.permissions
          console.log(`[getAuthContext] Auto-provisioned workspace ${org.name} successfully for ${user.email}`)
        }
      } else {
        console.error(`[getAuthContext] Failed to update user organization_id:`, updateError.message)
      }
    } else {
      console.error(`[getAuthContext] Failed to create organization:`, orgError?.message)
    }
  }

  // Supabase returns the joined organization; suppress TS about possibly-null
  const org = (profile as any).organizations
  const role = (profile.role as UserRole) ?? "viewer"
  const permissions = ((profile.permissions as Permission[]) ?? []).filter(Boolean)
  // Built-in role grants
  const grants = roleGrants(role)
  for (const p of grants) if (!permissions.includes(p)) permissions.push(p)

  return {
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name ?? null,
      avatar_url: profile.avatar_url ?? null,
    },
    organization: org
      ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan, feature_flags: org.feature_flags ?? {} }
      : null,
    role,
    permissions,
    isAdmin: role === "owner" || role === "admin" || profile.is_admin === true,
  }
}

function roleGrants(role: UserRole): Permission[] {
  switch (role) {
    case "owner":
      return [
        "events:create",
        "events:read",
        "events:update",
        "events:delete",
        "galleries:create",
        "galleries:read",
        "galleries:update",
        "galleries:delete",
        "users:create",
        "users:read",
        "users:update",
        "users:delete",
        "billing:read",
        "billing:manage",
        "analytics:read",
      ]
    case "admin":
      return [
        "events:create",
        "events:read",
        "events:update",
        "events:delete",
        "galleries:create",
        "galleries:read",
        "galleries:update",
        "galleries:delete",
        "users:read",
        "users:update",
        "analytics:read",
        "billing:read",
      ]
    case "member":
      return [
        "events:create",
        "events:read",
        "events:update",
        "galleries:create",
        "galleries:read",
        "galleries:update",
        "galleries:delete",
        "analytics:read",
      ]
    case "viewer":
    default:
      return ["events:read", "galleries:read"]
  }
}

function emptyAuth(): AuthContext {
  return { user: null, organization: null, role: "viewer", permissions: [], isAdmin: false }
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx.user) throw new HttpError("Authentication required", 401)
  return ctx
}

export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (!ctx.isAdmin) throw new HttpError("Admin access required", 403)
  return ctx
}

export function requirePermission(ctx: AuthContext, perm: Permission) {
  if (!hasPermission(ctx.role, ctx.permissions, perm)) {
    throw new HttpError(`Missing permission: ${perm}`, 403)
  }
}

export function requireOrg(ctx: AuthContext) {
  if (!ctx.organization) throw new HttpError("No organization context", 400)
  return ctx.organization
}
