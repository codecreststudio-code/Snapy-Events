import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { signedUrl, deleteFile } from "@/lib/integrations/storage"
import { logAudit } from "@/lib/audit/log"

const params = z.object({ id: z.string().uuid() })

export const GET = defineRoute({
  method: "GET",
  requireAuth: true,
  handler: async ({ params }) => {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase.from("photos").select("*, gallery:galleries(*), event:events(id, name)").eq("id", id).single()
    if (error || !data) return ApiErrors.notFound("Photo")
    if (data.storage_path) {
      const url = await signedUrl("PHOTOS", data.storage_path, 3600)
      ;(data as { signedUrl?: string }).signedUrl = url ?? undefined
    }
    return ok(data)
  },
}).GET

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: true,
  audit: "photo.deleted",
  handler: async ({ params, auth, request }) => {
    const { id } = await params
    const supabase = await createClient()
    const { data: photo } = await supabase.from("photos").select("storage_path, event_id, gallery_id").eq("id", id).single()
    if (photo?.storage_path) await deleteFile("PHOTOS", photo.storage_path).catch(() => null)
    const { error } = await supabase.from("photos").delete().eq("id", id)
    if (error) return fail("DB_ERROR", error.message, 400)
    await logAudit({ organization_id: auth.organization!.id, user_id: auth.user!.id, action: "photo.deleted", resource_type: "photo", resource_id: id, request })
    return ok({ deleted: true })
  },
}).DELETE
