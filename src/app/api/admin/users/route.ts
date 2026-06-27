import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { publicEnv } from "@/lib/env"

const listQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

const patchBodySchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["suspend", "activate", "change_plan", "reset_password", "change_role", "change_organization"]),
  planId: z.enum(["free", "starter", "standard", "premium"]).optional(),
  newPassword: z.string().min(8).optional(),
  role: z.enum(["owner", "admin", "member", "viewer"]).optional(),
  organizationId: z.string().uuid().nullable().optional(),
})

function admin() {
  if (!publicEnv.SUPABASE_URL) throw new Error("supabase url not set")
  return createAdmin(publicEnv.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export const GET = defineRoute({
  method: "GET",
  query: listQuery,
  requireAuth: "admin",
  handler: async ({ query }) => {
    const sb = admin()
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    // Fetch users with their organizations joined
    const { data, count, error } = await sb
      .from("users")
      .select("id, email, full_name, role, is_active, created_at, user_id, user:organizations(id, name, plan, settings)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET

export const PATCH = defineRoute({
  method: "PATCH",
  body: patchBodySchema,
  requireAuth: "admin",
  handler: async ({ body }) => {
    const sb = admin()
    const { userId, action, planId, newPassword, role, organizationId } = body

    // Fetch user details first
    const { data: userProfile, error: getError } = await sb
      .from("users")
      .select("user_id")
      .eq("id", userId)
      .single()

    if (getError || !userProfile) {
      return fail("NOT_FOUND", "User not found", 404)
    }

    if (action === "suspend") {
      // Suspend user (setting is_active to false)
      const { error } = await sb.from("users").update({ is_active: false }).eq("id", userId)
      if (error) return fail("DB_ERROR", error.message, 500)
      
      // Suspend in Auth
      const { error: authErr } = await sb.auth.admin.updateUserById(userId, {
        ban_duration: "1000h", // ban for a long time
      })
      if (authErr) return fail("AUTH_ERROR", authErr.message, 500)
    } 
    else if (action === "activate") {
      const { error } = await sb.from("users").update({ is_active: true }).eq("id", userId)
      if (error) return fail("DB_ERROR", error.message, 500)

      // Unban in Auth
      const { error: authErr } = await sb.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      })
      if (authErr) return fail("AUTH_ERROR", authErr.message, 500)
    } 
    else if (action === "change_plan") {
      if (!planId) return fail("VALIDATION_ERROR", "planId is required for changing plans", 422)
      if (!userProfile.user_id) {
        return fail("CONFLICT", "User does not belong to an organization", 409)
      }

      const { error } = await sb
        .from("organizations")
        .update({ plan: planId })
        .eq("id", userProfile.user_id)

      if (error) return fail("DB_ERROR", error.message, 500)
    } 
    else if (action === "reset_password") {
      const pwd = newPassword || "Reset@123"
      const { error: authErr } = await sb.auth.admin.updateUserById(userId, {
        password: pwd,
      })
      if (authErr) return fail("AUTH_ERROR", authErr.message, 500)
      return ok({ success: true, message: `Password reset to: ${pwd}` })
    }
    else if (action === "change_role") {
      if (!role) return fail("VALIDATION_ERROR", "role is required to change role", 422)
      const { error } = await sb
        .from("users")
        .update({ role })
        .eq("id", userId)
      if (error) return fail("DB_ERROR", error.message, 500)
    }
    else if (action === "change_organization") {
      const { error } = await sb
        .from("users")
        .update({ user_id: organizationId })
        .eq("id", userId)
      if (error) return fail("DB_ERROR", error.message, 500)
    }

    return ok({ success: true })
  },
}).PATCH

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")
    if (!userId) return fail("VALIDATION_ERROR", "userId query parameter is required", 422)

    const sb = admin()

    // 1. Delete in Auth
    const { error: authErr } = await sb.auth.admin.deleteUser(userId)
    if (authErr) return fail("AUTH_ERROR", authErr.message, 500)

    // 2. Delete Profile in DB (cascade might delete events or we delete it)
    const { error: dbErr } = await sb.from("users").delete().eq("id", userId)
    if (dbErr) return fail("DB_ERROR", dbErr.message, 500)

    return ok({ success: true })
  },
}).DELETE
