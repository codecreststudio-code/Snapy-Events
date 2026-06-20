import { z } from "zod"
import { defineRoute, ok, fail, created, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { uploadPhotoSchema } from "@/lib/validators"
import { uploadFile } from "@/lib/integrations/storage"
import { MAX_FILE_SIZES, ALLOWED_MIME_TYPES, API_RATE_LIMITS, PLAN_LIMITS } from "@/lib/constants"
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
    const { data: gallery } = await supabase
      .from("galleries")
      .select("event_id, event:events(organization_id, settings, organization:organizations(plan, settings))")
      .eq("id", id)
      .single()

    if (!gallery) return ApiErrors.notFound("Gallery")

    // Enforce limits
    const event = gallery.event as any
    const orgId = Array.isArray(event) ? event[0]?.organization_id : event?.organization_id
    const orgPlan = Array.isArray(event) ? event[0]?.organization?.plan : event?.organization?.plan || "free"
    const orgSettings = (Array.isArray(event) ? event[0]?.organization?.settings : event?.organization?.settings) || {}
    
    const guestBoost = orgSettings.guest_boost || 0
    const shotsBoost = orgSettings.shots_boost || 0

    const baseLimits = PLAN_LIMITS[orgPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free
    const maxGuests = baseLimits.guests_limit + guestBoost
    const maxShots = baseLimits.shots_limit + shotsBoost
    const maxStorageBytes = (baseLimits.storage_limit_gb || 1) * 1024 * 1024 * 1024

    // Check storage quota
    const { data: storageUsage } = await supabase
      .from("storage_usage")
      .select("total_bytes, photo_count")
      .eq("organization_id", orgId)
      .single()

    const currentStorageBytes = storageUsage?.total_bytes ? BigInt(storageUsage.total_bytes) : 0n
    const currentPhotoCount = storageUsage?.photo_count || 0
    if (currentStorageBytes + BigInt(file.size) > BigInt(maxStorageBytes)) {
      return fail(
        "STORAGE_QUOTA_EXCEEDED",
        `Storage quota exceeded. You are using ${Math.round(Number(currentStorageBytes) / (1024 * 1024))}MB of ${baseLimits.storage_limit_gb}GB. Please upgrade your plan.`,
        403
      )
    }

    const { data: currentUploads } = await supabase
      .from("photos")
      .select("uploader_email, uploader_name")
      .eq("event_id", gallery.event_id)

    const uniqueGuests = new Set(
      (currentUploads || [])
        .map((p) => p.uploader_email?.toLowerCase() || p.uploader_name?.toLowerCase())
        .filter(Boolean)
    )

    const cleanEmail = uploaderEmail?.trim().toLowerCase()
    const cleanName = uploaderName?.trim()
    const guestIdentifier = cleanEmail || cleanName?.toLowerCase() || "anonymous"
    const isNewGuest = !uniqueGuests.has(guestIdentifier)

    if (isNewGuest && uniqueGuests.size >= maxGuests) {
      return fail("PLAN_LIMIT_REACHED", `This event has reached its limit of ${maxGuests} guests. The host must upgrade to receive more uploads.`, 403)
    }

    const currentGuestShotsCount = (currentUploads || []).filter(
      (p) => (p.uploader_email?.toLowerCase() === guestIdentifier || p.uploader_name?.toLowerCase() === guestIdentifier)
    ).length

    if (currentGuestShotsCount >= maxShots) {
      return fail("PLAN_LIMIT_REACHED", `You have reached your limit of ${maxShots} uploads for this event.`, 403)
    }

    const ext = file.name.split(".").pop() ?? "jpg"
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
    
    // Update storage usage
    await supabase
      .from("storage_usage")
      .upsert({
        organization_id: orgId,
        total_bytes: (currentStorageBytes + BigInt(file.size)).toString(),
        photo_count: currentPhotoCount + 1,
      })
      .catch((err) => {
        // Log but don't fail the request
        console.error("Failed to update storage usage:", err)
      })
    
    void trackEvent({ organization_id: auth.organization?.id ?? null, user_id: auth.user?.id ?? null, event_type: "photo.uploaded", event_data: { gallery_id: id }, request })
    return created(data)
  },
}).POST
