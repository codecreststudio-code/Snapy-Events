import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { updateUserSchema } from "@/lib/validators"

const params = z.object({ id: z.string().uuid() })

export const GET = defineRoute({
  method: "GET",
  requireAuth: true,
  handler: async ({ params }) => {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, role, permissions, organization_id, created_at")
      .eq("id", id)
      .single()
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data)
  },
}).GET

export const PATCH = defineRoute({
  method: "PATCH",
  body: updateUserSchema,
  requireAuth: true,
  audit: "user.updated",
  handler: async ({ params, body }) => {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase.from("users").update(body).eq("id", id).select().single()
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).PATCH

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: true,
  audit: "user.deleted",
  handler: async ({ params, auth }) => {
    const { id } = await params
    if (id === auth.user!.id) return fail("CONFLICT", "Cannot delete yourself", 409)
    const supabase = await createClient()
    const { error } = await supabase.from("users").update({ organization_id: null, role: "viewer" }).eq("id", id)
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok({ removed: true })
  },
}).DELETE
