import { z } from "zod"
import { defineRoute, ok, fail, created, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { uploadPhotoSchema } from "@/lib/validators"
import { uploadFile } from "@/lib/integrations/storage"
import { MAX_FILE_SIZES, ALLOWED_MIME_TYPES, API_RATE_LIMITS } from "@/lib/constants"
import { trackEvent } from "@/lib/analytics/track"

const querySchema = z.object({ gallery_id: z.string().uuid() })

export const POST = defineRoute<unknown, z.infer<typeof querySchema>, unknown>({
  method: "POST",
  query: querySchema,
  requireAuth: true,
  rateLimit: { key: "photos:upload", limit: API_RATE_LIMITS.UPLOAD_PHOTOS, windowSeconds: 60 },
  audit: "photo.uploaded",
  handler: async ({ request, query, auth }) => {
    const id = query.gallery_id
    const supabase = await createClient()
    const fd = await request.formData()
    const file = fd.get("file") as File | null
    const uploaderName = (fd.get("uploader_name") as string | null) ?? null
    const uploaderEmail = (fd.get("uploader_email") as string | null) ?? null
    const approvedFlag = (fd.get("is_approved") as string | null) === "true"
    if (!file) return fail("VALIDATION_ERROR", "Missing file", 422)
    if (file.size > MAX_FILE_SIZES.PHOTO) return fail("VALIDATION_ERROR", "File too large", 413)
    if (!ALLOWED_MIME_TYPES.PHOTO.includes(file.type as (typeof ALLOWED_MIME_TYPES.PHOTO)[number])) {
      return fail("VALIDATION_ERROR", "Unsupported file type", 415)
    }
    const { data: gallery } = await supabase.from("galleries").select("event_id, event:events(organization_id, settings)").eq("id", id).single()
    if (!gallery) return ApiErrors.notFound("Gallery")
    const ext = file.name.split(".").pop() ?? "jpg"
    const event = gallery.event as any
    const orgId = Array.isArray(event) ? event[0]?.organization_id : event?.organization_id
    const path = `${orgId}/${gallery.event_id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const up = await uploadFile({ bucket: "PHOTOS", path, file, contentType: file.type, cacheControl: "31536000" })
    const { data, error } = await supabase
      .from("photos")
      .insert({
        gallery_id: id,
        event_id: gallery.event_id,
        uploader_id: auth.user?.id ?? null,
        uploader_name: uploaderName,
        uploader_email: uploaderEmail,
        storage_path: up.path,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        is_approved: approvedFlag,
        processing_status: "ready",
      })
      .select()
      .single()
    if (error) return fail("DB_ERROR", error.message, 500)
    void trackEvent({ organization_id: auth.organization?.id ?? null, user_id: auth.user?.id ?? null, event_type: "photo.uploaded", event_data: { gallery_id: id }, request })
    return created(data)
  },
}).POST
