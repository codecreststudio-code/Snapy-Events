// src/app/api/events/[id]/memories/movie/url/route.ts
//
// Issues a signed Supabase Storage upload URL for a client-rendered Movie —
// same pattern as /api/photos/upload/url/route.ts, and for the same reason:
// Vercel Serverless Functions cap request bodies at 4.5MB, and even a short
// rendered movie is well past that. Routing the actual video bytes through a
// normal POST body/multipart upload here would 413 the same way the earlier
// version of this feature did. The browser PUTs directly to Supabase Storage
// with the token this route hands back; POST /memories/movie (this folder's
// sibling route) then only ever receives small JSON metadata to register the
// already-uploaded file.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { API_RATE_LIMITS } from "@/lib/constants"

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  mime_type: z.enum(["video/webm", "video/mp4"]).default("video/webm"),
})

export const POST = defineRoute<z.infer<typeof bodySchema>, unknown, { id: string }>({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  rateLimit: { key: "memories:movie:upload-url", limit: API_RATE_LIMITS.MOVIE_UPLOAD, windowSeconds: 300 },
  handler: async ({ body, params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()
    const { data: eventRow, error } = await supabase.from("events").select("id, host_id").eq("id", eventId).single()
    if (error || !eventRow) return fail("NOT_FOUND", "Event not found", 404)
    if (eventRow.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    const ext = body.mime_type === "video/mp4" ? "mp4" : "webm"
    const storagePath = `${eventRow.host_id}/${eventId}/movies/movie-${Date.now()}-${crypto.randomUUID()}.${ext}`

    const { data: signedData, error: signedErr } = await supabase.storage
      .from("photos")
      .createSignedUploadUrl(storagePath, { upsert: true })

    if (signedErr || !signedData) {
      return fail("STORAGE_ERROR", signedErr?.message || "Failed to create upload URL", 500)
    }

    return ok({ signedUrl: signedData.signedUrl, token: signedData.token, path: storagePath })
  },
}).POST
