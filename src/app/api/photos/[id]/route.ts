import { z } from "zod"
import { defineRoute, ok, fail, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { signedUrl, deleteFile } from "@/lib/integrations/storage"
import { logAudit } from "@/lib/audit/log"

const params = z.object({ id: z.string().uuid() })

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const { id } = params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("photos")
      .select("*, gallery:galleries!inner(event_id), event:events!inner(id, name, host_id)")
      .eq("id", id)
      .single()
    if (error || !data) return ApiErrors.notFound("Photo")
    const photo = data as any
    const hostId = photo.event?.host_id
    if (hostId && hostId !== auth.user!.id) return fail("FORBIDDEN", "Access denied", 403)
    if (photo.storage_path) {
      const url = await signedUrl("PHOTOS", photo.storage_path, 3600)
      photo.signedUrl = url ?? undefined
    }
    return ok(photo)
  },
}).GET

export const DELETE = defineRoute<unknown, unknown, { id: string }>({
  method: "DELETE",
  requireAuth: true,
  audit: "photo.deleted",
  handler: async ({ params, auth, request }) => {
    const { id } = params
    const supabase = await createClient()
    const { data: photo } = await supabase
      .from("photos")
      .select("storage_path, event_id, gallery_id")
      .eq("id", id)
      .single()
    if (!photo) return fail("NOT_FOUND", "Photo not found", 404)
    const { data: gallery } = await supabase
      .from("galleries")
      .select("event_id")
      .eq("id", photo.gallery_id)
      .single()
    const eventId = gallery?.event_id || photo.event_id
    const { data: event } = await supabase
      .from("events")
      .select("host_id")
      .eq("id", eventId)
      .single()
    if (!event || event.host_id !== auth.user!.id) return fail("FORBIDDEN", "You do not own this event", 403)
    if (photo.storage_path) await deleteFile("PHOTOS", photo.storage_path).catch(() => null)
    const { error } = await supabase.from("photos").delete().eq("id", id)
    if (error) return fail("DB_ERROR", "Failed to delete photo", 400)
    await logAudit({ user_id: auth.user!.id, action: "photo.deleted", resource_type: "photo", resource_id: id, request })
    return ok({ deleted: true })
  },
}).DELETE
