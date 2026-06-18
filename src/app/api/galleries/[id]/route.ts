import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { updateGallerySchema } from "@/lib/validators"

const params = z.object({ id: z.string().uuid() })

export const GET = defineRoute({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("galleries")
      .select("*, event:events(id, name, slug, organization_id)")
      .eq("id", id)
      .single()
    if (error || !data) return ApiErrors.notFound("Gallery")
    return ok(data)
  },
}).GET

export const PATCH = defineRoute({
  method: "PATCH",
  body: updateGallerySchema,
  requireAuth: true,
  handler: async ({ params, body }) => {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase.from("galleries").update(body).eq("id", id).select().single()
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).PATCH

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: true,
  audit: "gallery.deleted",
  handler: async ({ params }) => {
    const { id } = await params
    const supabase = await createClient()
    const { error } = await supabase.from("galleries").delete().eq("id", id)
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok({ deleted: true })
  },
}).DELETE
