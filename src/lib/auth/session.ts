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
  role: UserRole
  permissions: Permission[]
  isAdmin: boolean
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return emptyAuth()

  let profileData: any = null
  const { data: existingProfile, error: profileError } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, role, permissions, is_admin")
    .eq("id", user.id)
    .single()

  if (profileError || !existingProfile) {
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

    profileData = insertedProfile
  } else {
    profileData = existingProfile
  }

  if (!profileData) {
    return emptyAuth()
  }

  const profile = profileData

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
  return { user: null, role: "viewer", permissions: [], isAdmin: false }
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
