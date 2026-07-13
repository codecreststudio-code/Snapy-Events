import { z } from "zod"
import { defineRoute, ok, fail, created, ApiErrors } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { uploadPhotoSchema } from "@/lib/validators"
import { uploadFile, deleteFile } from "@/lib/integrations/storage"
import { processImage, validateImageDimensions } from "@/lib/integrations/image-processing"
import { validateFile, isDangerousExtension, isSvgContent } from "@/lib/security/file-validation"
import { MAX_FILE_SIZES, ALLOWED_MIME_TYPES, API_RATE_LIMITS } from "@/lib/constants"
import { trackEvent } from "@/lib/analytics/track"
import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"

const querySchema = z.object({ gallery_id: z.string().uuid() })

function getMimeCategory(mime: string): "PHOTO" | "VIDEO" | "AUDIO" | null {
  if ((ALLOWED_MIME_TYPES.PHOTO as readonly string[]).includes(mime)) return "PHOTO"
  if ((ALLOWED_MIME_TYPES.VIDEO as readonly string[]).includes(mime)) return "VIDEO"
  if ((ALLOWED_MIME_TYPES.AUDIO as readonly string[]).includes(mime)) return "AUDIO"
  return null
}

export const POST = defineRoute<unknown, z.infer<typeof querySchema>, unknown>({
  method: "POST",
  query: querySchema,
  requireAuth: false,
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

    if (file.size === 0) return fail("VALIDATION_ERROR", "File is empty", 422)
    if (file.name.length > 255) return fail("VALIDATION_ERROR", "Filename too long", 422)

    if (isDangerousExtension(file.name)) return fail("VALIDATION_ERROR", "File type not allowed", 415)

    const category = getMimeCategory(file.type)
    if (!category) return fail("VALIDATION_ERROR", "Unsupported file type", 415)

    const maxAllowedSize = MAX_FILE_SIZES[category]
    if (file.size > maxAllowedSize) return fail("VALIDATION_ERROR", "File too large", 413)

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    if (isSvgContent(new Uint8Array(fileBuffer))) {
      return fail("VALIDATION_ERROR", "SVG files are not allowed", 415)
    }

    const validation = validateFile(new Uint8Array(fileBuffer), file.name, file.type, file.size)
    if (!validation.valid) return fail("VALIDATION_ERROR", validation.error!, 415)

    const { data: gallery } = await supabase
      .from("galleries")
      .select("event_id, event:events(organization_id, host_id, settings)")
      .eq("id", id)
      .single()

    if (!gallery) return ApiErrors.notFound("Gallery")

    if (category === "VIDEO") {
      const videoGate = await checkEventFeatureAccess(gallery.event_id, "video_uploads")
      if (!videoGate.allowed) {
        return fail("FORBIDDEN", videoGate.reason || "Video uploads are disabled for this event. Upgrade plan to enable videos.", 403)
      }
    }

    if (category === "AUDIO") {
      const audioGate = await checkEventFeatureAccess(gallery.event_id, "voice_notes")
      if (!audioGate.allowed) {
        return fail("FORBIDDEN", audioGate.reason || "Voice notes & audio are disabled for this event. Upgrade plan to enable audio greetings.", 403)
      }
    }

    const event = gallery.event as any
    const eventObj = Array.isArray(event) ? event[0] : event
    const hostId = eventObj?.host_id
    let orgId = eventObj?.organization_id

    if (!orgId && hostId) {
      const { data: u } = await supabase.from("users").select("organization_id").eq("id", hostId).maybeSingle()
      orgId = u?.organization_id
    }

    const { data: hostProfile } = await supabase
      .from("users")
      .select("preferences")
      .eq("id", hostId)
      .maybeSingle()

    const { data: subscription } = orgId
      ? await supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("organization_id", orgId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle()
      : { data: null }

    const orgPlan = subscription?.plan_id || "free"
    const hostPrefs = (hostProfile?.preferences as Record<string, any>) || {}

    const guestBoost = hostPrefs.guest_boost || 0
    const shotsBoost = hostPrefs.shots_boost || 0

    let baseLimits = { guests_limit: 0, shots_limit: 0, storage_limit_gb: 1 }
    if (orgPlan) {
      const { data: planData } = await supabase.from("plans").select("limits").eq("id", orgPlan).single()
      if (planData?.limits) {
        baseLimits = {
          guests_limit: planData.limits.guests_limit ?? 0,
          shots_limit: planData.limits.shots_limit ?? 0,
          storage_limit_gb: planData.limits.storage_limit_gb ?? 1,
        }
      }
    }

    const maxGuests = baseLimits.guests_limit + guestBoost
    const maxShots = baseLimits.shots_limit + shotsBoost
    const maxStorageBytes = baseLimits.storage_limit_gb * 1024 * 1024 * 1024

    const { data: storageUsage } = orgId
      ? await supabase
          .from("storage_usage")
          .select("total_bytes, photo_count")
          .eq("user_id", orgId)
          .maybeSingle()
      : { data: null }

    const currentStorageBytes = storageUsage?.total_bytes ? BigInt(storageUsage.total_bytes) : BigInt(0)
    const currentPhotoCount = storageUsage?.photo_count || 0
    const effectiveOrgId = orgId || "anon"

    if (currentStorageBytes + BigInt(fileBuffer.length) > BigInt(maxStorageBytes)) {
      return fail(
        "STORAGE_QUOTA_EXCEEDED",
        `Storage quota exceeded. You are using ${Math.round(Number(currentStorageBytes) / (1024 * 1024))}MB of ${baseLimits.storage_limit_gb}GB. Please upgrade your plan.`,
        403,
      )
    }

    const { data: currentUploads } = await supabase
      .from("photos")
      .select("uploader_email, uploader_name")
      .eq("event_id", gallery.event_id)

    const uniqueGuests = new Set(
      (currentUploads || [])
        .map((p) => p.uploader_email?.toLowerCase() || p.uploader_name?.toLowerCase())
        .filter(Boolean),
    )

    const cleanEmail = uploaderEmail?.trim().toLowerCase()
    const cleanName = uploaderName?.trim()
    const guestIdentifier = cleanEmail || cleanName?.toLowerCase() || "anonymous"
    const isNewGuest = !uniqueGuests.has(guestIdentifier)

    if (isNewGuest && uniqueGuests.size >= maxGuests) {
      return fail("PLAN_LIMIT_REACHED", `This event has reached its limit of ${maxGuests} guests. The host must upgrade to receive more uploads.`, 403)
    }

    const currentGuestShotsCount = (currentUploads || []).filter(
      (p) => (p.uploader_email?.toLowerCase() === guestIdentifier || p.uploader_name?.toLowerCase() === guestIdentifier),
    ).length

    if (currentGuestShotsCount >= maxShots) {
      return fail("PLAN_LIMIT_REACHED", `You have reached your limit of ${maxShots} uploads for this event.`, 403)
    }

    let uploadBuffer: Buffer = fileBuffer
    let uploadMime = file.type
    let imageWidth: number | null = null
    let imageHeight: number | null = null
    let thumbnailUploadPath: string | null = null
    let thumbnailBuffer: Buffer | null = null

    if (category === "PHOTO") {
      try {
        const dimCheck = await validateImageDimensions(fileBuffer)
        if (!dimCheck.valid) return fail("VALIDATION_ERROR", dimCheck.error!, 422)

        imageWidth = dimCheck.width
        imageHeight = dimCheck.height

        const result = await processImage(fileBuffer, file.type, effectiveOrgId, gallery.event_id, id)
        uploadBuffer = result.processed.buffer as Buffer
        uploadMime = result.processed.mimeType
        imageWidth = result.processed.width
        imageHeight = result.processed.height

        if (result.thumbnail) {
          thumbnailBuffer = result.thumbnail.buffer as Buffer
          thumbnailUploadPath = result.thumbnailUploadPath
        }
      } catch {
        return fail("PROCESSING_ERROR", "Failed to process image", 500)
      }
    }

    const fileId = crypto.randomUUID()
    const ext = uploadMime === "image/jpeg" ? "jpg" : uploadMime.split("/").pop() || "bin"
    const storagePath = `${effectiveOrgId}/${gallery.event_id}/${id}/${fileId}.${ext}`

    const uploadBlob = new Blob([new Uint8Array(uploadBuffer)], { type: uploadMime })
    const uploadOpts = { bucket: "PHOTOS" as const, path: storagePath, file: uploadBlob, contentType: uploadMime, cacheControl: "31536000" }

    const up = await uploadFile(uploadOpts)

    if (thumbnailBuffer && thumbnailUploadPath) {
      try {
        await uploadFile({
          bucket: "PHOTOS" as const,
          path: thumbnailUploadPath,
          file: new Blob([new Uint8Array(thumbnailBuffer)], { type: "image/jpeg" }),
          contentType: "image/jpeg",
          cacheControl: "31536000",
        })
      } catch {
        thumbnailUploadPath = null
      }
    }

    const { data, error } = await supabase
      .from("photos")
      .insert({
        gallery_id: id,
        event_id: gallery.event_id,
        uploader_id: auth.user?.id ?? null,
        uploader_name: uploaderName,
        uploader_email: uploaderEmail,
        storage_path: up.path,
        thumbnail_path: thumbnailUploadPath,
        original_filename: file.name,
        mime_type: uploadMime,
        file_size: uploadBuffer.length,
        width: imageWidth,
        height: imageHeight,
        is_approved: approvedFlag,
        processing_status: "ready",
      })
      .select()
      .single()

    if (error) {
      try { await deleteFile("PHOTOS", up.path) } catch {}
      if (thumbnailUploadPath) {
        try { await deleteFile("PHOTOS", thumbnailUploadPath) } catch {}
      }
      return fail("DB_ERROR", "Failed to save photo record", 500)
    }

    if (orgId) {
      try {
        await supabase.from("storage_usage").upsert(
          {
            user_id: orgId,
            total_bytes: (currentStorageBytes + BigInt(uploadBuffer.length)).toString(),
            photo_count: currentPhotoCount + 1,
          },
        )
      } catch {}
    }

    void trackEvent({ user_id: auth.user?.id ?? undefined, event_type: "photo.uploaded", event_data: { gallery_id: id }, request })
    return created(data)
  },
}).POST
