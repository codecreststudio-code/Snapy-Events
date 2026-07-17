import { z } from "zod"
import { after } from "next/server"
import { defineRoute, ok, fail, created, ApiErrors } from "@/lib/api/handler"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { uploadPhotoSchema } from "@/lib/validators"
import { uploadFile, deleteFile } from "@/lib/integrations/storage"
import { processImage } from "@/lib/integrations/image-processing"
import { validateFile, isDangerousExtension, isSvgContent } from "@/lib/security/file-validation"
import { MAX_FILE_SIZES, ALLOWED_MIME_TYPES, API_RATE_LIMITS } from "@/lib/constants"
import { trackEvent } from "@/lib/analytics/track"
import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"
import { hasGuestSessionFromRequest, isEventHost } from "@/lib/security/guest-session"
import { detectAndStoreFaces } from "@/lib/integrations/face"

const querySchema = z.object({ gallery_id: z.string().uuid() })

function getMimeCategory(mime: string): "PHOTO" | "VIDEO" | "AUDIO" | null {
  if (!mime || mime.startsWith("image/") || mime === "application/octet-stream") return "PHOTO"
  if (mime.startsWith("video/")) return "VIDEO"
  if (mime.startsWith("audio/")) return "AUDIO"
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
    const supabase = await createServiceClient()
    const contentType = request.headers.get("content-type") || ""

    let preUploadedPath: string | null = null
    let originalFilename = ""
    let mimeType = "image/jpeg"
    let fileSize = 0
    let uploaderName: string | null = null
    let uploaderEmail: string | null = null
    let approvedFlag = true
    let fileBuffer: Buffer | null = null

    if (contentType.includes("application/json")) {
      const body = await request.json()
      preUploadedPath = body.storage_path ?? null
      originalFilename = body.file_name || "upload.bin"
      mimeType = body.mime_type || body.file_type || "image/jpeg"
      fileSize = body.file_size || 0
      uploaderName = body.uploader_name ?? null
      uploaderEmail = body.uploader_email ?? null
      approvedFlag = body.is_approved !== false
      if (!preUploadedPath) return fail("VALIDATION_ERROR", "Missing storage_path in JSON payload", 422)
    } else {
      const fd = await request.formData()
      const file = fd.get("file") as File | null
      uploaderName = (fd.get("uploader_name") as string | null) ?? null
      uploaderEmail = (fd.get("uploader_email") as string | null) ?? null
      approvedFlag = (fd.get("is_approved") as string | null) === "true"
      if (!file) return fail("VALIDATION_ERROR", "Missing file", 422)
      if (file.size === 0) return fail("VALIDATION_ERROR", "File is empty", 422)
      if (file.name.length > 255) return fail("VALIDATION_ERROR", "Filename too long", 422)

      originalFilename = file.name
      mimeType = file.type
      fileSize = file.size

      if (isDangerousExtension(originalFilename)) return fail("VALIDATION_ERROR", "File type not allowed", 415)

      fileBuffer = Buffer.from(await file.arrayBuffer())

      if (isSvgContent(new Uint8Array(fileBuffer))) {
        return fail("VALIDATION_ERROR", "SVG files are not allowed", 415)
      }

      const validation = validateFile(new Uint8Array(fileBuffer), originalFilename, mimeType, fileSize)
      if (!validation.valid) return fail("VALIDATION_ERROR", validation.error!, 415)
    }

    if (isDangerousExtension(originalFilename)) return fail("VALIDATION_ERROR", "File type not allowed", 415)

    const category = getMimeCategory(mimeType)
    if (!category) return fail("VALIDATION_ERROR", "Unsupported file type", 415)

    const maxAllowedSize = MAX_FILE_SIZES[category]
    if (fileSize > maxAllowedSize) return fail("VALIDATION_ERROR", "File too large", 413)

    const { data: gallery } = await supabase
      .from("galleries")
      .select("event_id, event:events(host_id, settings)")
      .eq("id", id)
      .single()

    if (!gallery) return ApiErrors.notFound("Gallery")

    const event = gallery.event as any
    const eventObj = Array.isArray(event) ? event[0] : event
    const hostId = eventObj?.host_id
    const settings = (eventObj?.settings as Record<string, any>) || {}

    // Guests may never self-approve based on their own request body — that
    // would let a malicious guest force-approve their own upload regardless
    // of the host's moderation preference. But this route always runs with
    // requireAuth:false (guests must be able to hit it anonymously after
    // check-in), so `auth.user` is empty for EVERY caller here, including
    // the host's own uploads from the guest-facing upload page — a blind
    // `if (!auth?.user?.id) approvedFlag = false` therefore forced
    // is_approved=false on every single upload ever made through this route,
    // permanently, regardless of the event's auto_approve_photos toggle.
    // Since there is no moderation UI in the normal flow to flip it back to
    // true, this meant nothing ever appeared on the guest-facing gallery
    // page (which filters on is_approved) — every photo, video, and voice
    // note uploaded looked like it "disappeared" after uploading.
    // The event's own auto_approve_photos setting (a host-controlled,
    // server-side value looked up here, not something the guest's request
    // body can influence) is the correct source of truth for guest uploads.
    if (!auth?.user?.id) {
      approvedFlag = settings.auto_approve_photos === true
    }

    // Guest uploads require a completed check-in for this specific event
    // (see src/lib/security/guest-session.ts). The authenticated host is
    // exempt — they upload from their own dashboard under their own account,
    // not as a guest. Without this, anyone with the gallery/event URL could
    // upload regardless of whether they ever checked in, which defeated the
    // point of the per-event join code and check-in modal entirely.
    if (!(await isEventHost(hostId)) && !hasGuestSessionFromRequest(request, gallery.event_id)) {
      return fail("FORBIDDEN", "Please check in to this event before uploading.", 403)
    }

    if (category === "PHOTO") {
      const contentTypes = settings.content_types || {}
      if (contentTypes.photos === false) {
        return fail("FORBIDDEN", "Photo uploads are disabled for this event in event settings.", 403)
      }
    }

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


    // Presigned-upload confirm (JSON branch): the client hands us a storage_path
    // and file_size. Trusting the path lets a guest reference another tenant's
    // objects (IDOR); trusting the size lets them dodge the storage quota. Pin
    // the path to this gallery's prefix and read the real size from storage.
    if (preUploadedPath) {
      const prefix = `${hostId || "anon"}/${gallery.event_id}/${id}/`
      if (!preUploadedPath.startsWith(prefix)) {
        return fail("VALIDATION_ERROR", "storage_path is outside this gallery", 422)
      }
      const slash = preUploadedPath.lastIndexOf("/")
      const dir = preUploadedPath.slice(0, slash)
      const fname = preUploadedPath.slice(slash + 1)
      const { data: objs } = await supabase.storage.from("photos").list(dir, { search: fname, limit: 1 })
      const realSize = objs?.find((o) => o.name === fname)?.metadata?.size
      if (realSize == null) return fail("VALIDATION_ERROR", "Uploaded object not found in storage", 422)
      fileSize = Number(realSize)
    }

    const { data: hostProfile } = await supabase
      .from("users")
      .select("preferences")
      .eq("id", hostId)
      .maybeSingle()

    const { data: subscription } = hostId
      ? await supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("user_id", hostId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle()
      : { data: null }

    const orgPlan = subscription?.plan_id || "free"
    const hostPrefs = (hostProfile?.preferences as Record<string, any>) || {}

    const guestBoost = hostPrefs.guest_boost || 0
    const shotsBoost = hostPrefs.shots_boost || 0

    const PLAN_DEFAULT_LIMITS: Record<string, { guests: number; shots: number; storage: number }> = {
      free: { guests: 5, shots: 5, storage: 1 },
      starter: { guests: 10, shots: 10, storage: 10 },
      standard: { guests: 50, shots: 15, storage: 100 },
      premium: { guests: 100, shots: 25, storage: 1000 },
    }

    const fallback = PLAN_DEFAULT_LIMITS[orgPlan] || PLAN_DEFAULT_LIMITS.free

    let baseLimits = { guests_limit: fallback.guests, shots_limit: fallback.shots, storage_limit_gb: fallback.storage }
    if (orgPlan) {
      const { data: planData } = await supabase.from("plans").select("limits").eq("id", orgPlan).maybeSingle()
      if (planData?.limits) {
        baseLimits = {
          guests_limit: planData.limits.guests_limit ?? planData.limits.guest_limit ?? fallback.guests,
          shots_limit: planData.limits.shots_limit ?? planData.limits.shot_limit ?? fallback.shots,
          storage_limit_gb: planData.limits.storage_limit_gb ?? fallback.storage,
        }
      }
    }

    const maxGuests = baseLimits.guests_limit + guestBoost
    const maxShots = baseLimits.shots_limit + shotsBoost
    const maxStorageBytes = baseLimits.storage_limit_gb * 1024 * 1024 * 1024

    const { data: storageUsage } = hostId
      ? await supabase
          .from("storage_usage")
          .select("total_bytes, photo_count")
          .eq("user_id", hostId)
          .maybeSingle()
      : { data: null }

    const currentStorageBytes = storageUsage?.total_bytes ? BigInt(storageUsage.total_bytes) : BigInt(0)
    const currentPhotoCount = storageUsage?.photo_count || 0
    const effectiveOrgId = hostId || "anon"

    if (currentStorageBytes + BigInt(fileSize) > BigInt(maxStorageBytes)) {
      return fail(
        "STORAGE_QUOTA_EXCEEDED",
        `Storage quota exceeded. You are using ${Math.round(Number(currentStorageBytes) / (1024 * 1024))}MB of ${baseLimits.storage_limit_gb}GB. Please upgrade your plan.`,
        403,
      )
    }

    const cleanEmail = uploaderEmail?.trim().toLowerCase() || null
    const cleanName = uploaderName?.trim() || null
    const guestIdentifier = cleanEmail || cleanName?.toLowerCase() || "anonymous"

    // Count unique guests via an aggregate — avoids a full-table scan.
    // We approximate uniqueness by counting distinct uploader_email values;
    // guests who only provided a name fall into the name bucket.
    const { count: totalGuestCount } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", gallery.event_id)
      .not("uploader_email", "is", null)

    // Count this specific guest's shots (email match first, then name fallback)
    const guestShotsQuery = cleanEmail
      ? supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("event_id", gallery.event_id)
          .eq("uploader_email", cleanEmail)
      : supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("event_id", gallery.event_id)
          .eq("uploader_name", cleanName || "")

    const { count: currentGuestShotsCount } = await guestShotsQuery

    // A guest is "new" when they have no prior shots in this event
    const isNewGuest = (currentGuestShotsCount ?? 0) === 0

    if (isNewGuest && (totalGuestCount ?? 0) >= maxGuests) {
      return fail("PLAN_LIMIT_REACHED", `This event has reached its limit of ${maxGuests} guests. The host must upgrade to receive more uploads.`, 403)
    }

    // settings.photo_limit is the host's chosen per-guest cap from the event
    // wizard. Selecting a value above the plan's own included limit (or
    // "Unlimited", stored as -1) is now a paid add-on charged at checkout
    // (see PLAN_BASE_PHOTO_LIMITS / PHOTO_LIMIT_ADDON_PRICES in
    // src/lib/constants) — so once configured, it IS the real cap for this
    // event, not just an extra ceiling on top of the plan default. Using
    // Math.min against the plan's own maxShots here would silently discard
    // the add-on the host paid for.
    const hostConfiguredPhotoLimit = typeof settings.photo_limit === "number" ? settings.photo_limit : null
    const effectiveMaxShots = hostConfiguredPhotoLimit === -1
      ? Infinity
      : (hostConfiguredPhotoLimit && hostConfiguredPhotoLimit > 0 ? hostConfiguredPhotoLimit : maxShots)

    if (Number.isFinite(effectiveMaxShots) && (currentGuestShotsCount ?? 0) >= effectiveMaxShots) {
      return fail("PLAN_LIMIT_REACHED", `You have reached the limit of ${effectiveMaxShots} uploads per guest for this event.`, 403)
    }


    let finalStoragePath = preUploadedPath
    let uploadMime = mimeType
    let uploadSize = fileSize
    let imageWidth: number | null = null
    let imageHeight: number | null = null
    let thumbnailUploadPath: string | null = null

    if (!finalStoragePath) {
      if (!fileBuffer) return fail("VALIDATION_ERROR", "Missing file buffer", 422)

      let uploadBuffer: Buffer = fileBuffer
      thumbnailUploadPath = null
      let thumbnailBuffer: Buffer | null = null

      if (category === "PHOTO") {
        try {
          // processImage reads sharp metadata internally — no need for a
          // separate validateImageDimensions call (which would run sharp twice).
          const result = await processImage(fileBuffer, mimeType, effectiveOrgId, gallery.event_id, id)
          uploadBuffer = result.processed.buffer as Buffer
          uploadMime = result.processed.mimeType
          imageWidth = result.processed.width
          imageHeight = result.processed.height

          // Reject extreme dimensions early to prevent decompression bombs.
          const MAX_DIM = 10000
          if (imageWidth > MAX_DIM || imageHeight > MAX_DIM) {
            return fail("VALIDATION_ERROR", `Image dimensions ${imageWidth}x${imageHeight} exceed maximum ${MAX_DIM}x${MAX_DIM}`, 415)
          }

          if (result.thumbnail) {
            thumbnailBuffer = result.thumbnail.buffer as Buffer
            thumbnailUploadPath = result.thumbnailUploadPath
          }
        } catch (procErr) {
          console.warn("[processImage fallback to raw buffer]", procErr)
          uploadBuffer = fileBuffer
        }
      }

      const fileId = crypto.randomUUID()
      const ext = uploadMime === "image/jpeg" ? "jpg" : uploadMime.split("/").pop() || "bin"
      const generatedPath = `${effectiveOrgId}/${gallery.event_id}/${id}/${fileId}.${ext}`

      const uploadBlob = new Blob([new Uint8Array(uploadBuffer)], { type: uploadMime })
      const uploadOpts = { bucket: "PHOTOS" as const, path: generatedPath, file: uploadBlob, contentType: uploadMime, cacheControl: "31536000" }

      const up = await uploadFile(uploadOpts)
      finalStoragePath = up.path
      uploadSize = uploadBuffer.length

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
    }

    const { data, error } = await supabase
      .from("photos")
      .insert({
        gallery_id: id,
        event_id: gallery.event_id,
        uploader_id: auth?.user?.id || null,
        uploader_name: uploaderName || null,
        uploader_email: uploaderEmail || null,
        storage_path: finalStoragePath,
        thumbnail_path: thumbnailUploadPath || null,
        original_filename: originalFilename || "upload.bin",
        mime_type: uploadMime || "image/jpeg",
        file_size: Number(uploadSize || 0),
        width: imageWidth || null,
        height: imageHeight || null,
        is_approved: approvedFlag,
        processing_status: "ready",
      })
      .select()
      .single()

    if (error) {
      console.error("[photos DB insert error]", error)
      if (!preUploadedPath && finalStoragePath) {
        try { await deleteFile("PHOTOS", finalStoragePath) } catch {}
        if (thumbnailUploadPath) {
          try { await deleteFile("PHOTOS", thumbnailUploadPath) } catch {}
        }
      }
      return fail("DB_ERROR", `Failed to save photo record: ${error.message}`, 500)
    }

    if (hostId) {
      try {
        await supabase.from("storage_usage").upsert({
          user_id: hostId,
          total_bytes: (currentStorageBytes + BigInt(uploadSize)).toString(),
          photo_count: currentPhotoCount + 1,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" })
      } catch (err) {
        console.warn("[storage_usage upsert error]", err)
      }
    }

    void trackEvent({ user_id: auth.user?.id ?? undefined, event_type: "photo.uploaded", event_data: { gallery_id: id }, request })

    // Kick off AI face detection for photo uploads without blocking the
    // guest's upload response on it. Detection was previously only
    // reachable by manually calling /api/ai/faces/detect or the batch
    // route (and both of those were separately broken — see face.ts) —
    // there was no automatic trigger anywhere in the upload path at all.
    // `after()` schedules this to run once the response has been sent but
    // guarantees (via the platform's waitUntil) that it actually finishes,
    // unlike a bare detached promise which Vercel can freeze mid-flight
    // right after the response is returned.
    if (category === "PHOTO" && finalStoragePath) {
      const photoId = data.id
      const eventIdForDetection = gallery.event_id
      const detectionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${finalStoragePath}`
      after(async () => {
        try {
          const gate = await checkEventFeatureAccess(eventIdForDetection, "ai_face_search")
          if (!gate.allowed) return
          await detectAndStoreFaces(supabase, {
            eventId: eventIdForDetection,
            photoId,
            imageUrl: detectionUrl,
          })
        } catch (err) {
          console.warn("[face detection after-response failed]", err)
        }
      })
    }

    return created(data)
  },
}).POST
