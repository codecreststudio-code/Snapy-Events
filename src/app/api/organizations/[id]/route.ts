import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { updateOrganizationSchema } from "@/lib/validators"

const params = z.object({ id: z.string().uuid() })

export const GET = defineRoute({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const { id } = await params
    if (id !== auth.organization!.id) return ApiErrors.forbidden("Cross-org access denied")
    const supabase = await createClient()
    const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single()
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data)
  },
}).GET

export const PATCH = defineRoute({
  method: "PATCH",
  body: updateOrganizationSchema,
  requireAuth: true,
  audit: "org.updated",
  handler: async ({ params, body, auth }) => {
    const { id } = await params
    if (id !== auth.organization!.id) return ApiErrors.forbidden()
    const supabase = await createClient()
    const { data, error } = await supabase.from("organizations").update(body).eq("id", id).select().single()
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).PATCH

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: true,
  audit: "org.deleted",
  handler: async ({ params, auth }) => {
    const { id } = await params
    if (id !== auth.organization!.id) return ApiErrors.forbidden()
    if (auth.role !== "owner") return ApiErrors.forbidden("Only owners can delete the organization")
    const supabase = await createClient()
    const { error } = await supabase.from("organizations").delete().eq("id", id)
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok({ deleted: true })
  },
}).DELETE
