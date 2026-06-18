// src/lib/auth/session.ts
// Server-side auth helpers that read the active session from Supabase and
// resolve the current user, organization, role, and permissions.

import { createClient } from "@/lib/supabase/server"
import { hasPermission, type Permission, type UserRole } from "@/lib/auth/rbac"
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
  if (!user) return emptyAuth()

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, role, permissions, organization_id, organizations:organizations(id, name, slug, plan, feature_flags)")
    .eq("id", user.id)
    .single()

  if (!profile) return emptyAuth()
  // Supabase returns the joined organization; suppress TS about possibly-null
  const org = (profile as { organizations?: { id: string; name: string; slug: string; plan: string; feature_flags: Record<string, boolean> } | null }).organizations
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
    isAdmin: role === "owner" || role === "admin" || (profile as { is_admin?: boolean }).is_admin === true,
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
