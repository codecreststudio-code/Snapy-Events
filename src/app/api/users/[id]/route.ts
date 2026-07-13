import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { updateUserSchema } from "@/lib/validators"

const params = z.object({ id: z.string().uuid() })

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const { id } = params
    if (id !== auth.user!.id && !auth.isAdmin) {
      return fail("FORBIDDEN", "Access denied", 403)
    }
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, role, permissions, created_at")
      .eq("id", id)
      .single()
    if (error) return fail("DB_ERROR", "Failed to fetch user", 500)
    return ok(data)
  },
}).GET

export const PATCH = defineRoute<z.infer<typeof updateUserSchema>, unknown, { id: string }>({
  method: "PATCH",
  body: updateUserSchema,
  requireAuth: true,
  audit: "user.updated",
  handler: async ({ params, body, auth }) => {
    const { id } = params
    if (id !== auth.user!.id && !auth.isAdmin) return fail("FORBIDDEN", "You can only update your own profile", 403)
    if (id !== auth.user!.id && (body.role !== undefined || body.permissions !== undefined)) {
      return fail("FORBIDDEN", "Cannot change role or permissions of another user", 403)
    }
    if (id === auth.user!.id && (body.role !== undefined || body.permissions !== undefined)) {
      return fail("FORBIDDEN", "Cannot change your own role or permissions", 403)
    }
    const supabase = await createClient()
    const { data, error } = await supabase.from("users").update(body).eq("id", id).select().single()
    if (error) return fail("DB_ERROR", "Failed to update user", 400)
    return ok(data)
  },
}).PATCH

export const DELETE = defineRoute<unknown, unknown, { id: string }>({
  method: "DELETE",
  requireAuth: "admin",
  audit: "user.deleted",
  handler: async ({ params, auth }) => {
    const { id } = params
    if (id === auth.user!.id) return fail("CONFLICT", "Cannot delete yourself", 409)
    const supabase = await createClient()
    const { error } = await supabase.from("users").update({ role: "viewer" }).eq("id", id)
    if (error) return fail("DB_ERROR", "Failed to delete user", 400)
    return ok({ removed: true })
  },
}).DELETE
