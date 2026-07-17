// src/app/api/events/[id]/recap/generate/route.ts
//
// Generates the "recap video" — an auto-composed highlight reel with an
// animated stats intro — for an event, in one of two mood variants. This is
// a synchronous, long-running request (same pattern as
// src/app/api/events/[id]/download-zip/route.ts): there is no
// queue/worker infra in this codebase, so the client awaits the full
// response while ffmpeg composes the video server-side. See vercel.json,
// which sets `maxDuration: 300` for this route to match.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { generateRecapVideo, type RecapMood } from "@/lib/integrations/recap-video"
import { logger } from "@/lib/logger"
import { API_RATE_LIMITS } from "@/lib/constants"
import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({ mood: z.enum(["joyful", "sentimental"]) })

// Generic, sanitized message shown to hosts and persisted onto
// settings.recap_video.error — the raw err.message (ffmpeg stderr, /tmp
// paths, Supabase internals, etc.) is logged server-side via `logger.error`
// instead, keyed by `ref` below so a reported failure can still be traced.
const GENERIC_FAILURE_MESSAGE =
  "Recap generation failed. Please try again — if the problem continues, contact support."

export const POST = defineRoute<{ mood: RecapMood }, unknown, { id: string }>({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  rateLimit: { key: "recap:generate", limit: API_RATE_LIMITS.RECAP_GENERATE, windowSeconds: 180 },
  audit: "recap_video.generate",
  handler: async ({ body, params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id
    const { mood } = body

    const supabase = await createServiceClient()

    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, host_id, settings")
      .eq("id", eventId)
      .single()

    if (eventErr || !eventRow) return fail("NOT_FOUND", "Event not found", 404)
    if (eventRow.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    // Recap Video is a paid-plan-only feature (same gate list as
    // ai_face_search / print_ready_downloads in feature-gate.ts) — was
    // previously ungated here, so a free-plan host would only find out
    // after this (up to ~300s) render ran and failed at the very end.
    // Mirrors the gate check in
    // src/app/api/ai/faces/batch-process/route.ts.
    const gate = await checkEventFeatureAccess(eventId, "recap_video")
    if (!gate.allowed) {
      return fail("FORBIDDEN", gate.reason || "Recap Video is not available on this event's plan", 403)
    }

    // Guard against concurrent/duplicate renders: re-fetch settings
    // immediately before writing the "rendering" marker (rather than
    // trusting the read from the ownership check above) to keep the
    // read-then-write race window as narrow as possible. Not a true
    // atomic lock (would need a DB-level conditional update or advisory
    // lock for that) — just a straightforward re-check-before-write,
    // enough to close the common case of a double-click or replayed
    // request, consistent with the idempotency-via-check pattern this
    // codebase already uses for payment writes (see
    // src/app/api/payments/verify/route.ts's transactions-table check).
    const { data: freshEventRow, error: freshErr } = await supabase
      .from("events")
      .select("settings")
      .eq("id", eventId)
      .single()

    if (freshErr || !freshEventRow) return fail("NOT_FOUND", "Event not found", 404)

    const currentSettings = (freshEventRow.settings as Record<string, any>) || {}

    if (currentSettings.recap_video?.status === "rendering") {
      return fail("ALREADY_RENDERING", "A recap video is already being generated for this event.", 409)
    }

    // Mark the attempt as in-progress immediately — spread-merge onto
    // settings (never overwrite wholesale) so any other settings the host
    // has configured survive. This is written before the (potentially
    // multi-minute) render starts so that even if the client's own request
    // times out, the event record reflects an in-progress attempt rather
    // than silently reverting to whatever state it was in before.
    await supabase
      .from("events")
      .update({
        settings: {
          ...currentSettings,
          recap_video: { status: "rendering", mood, generated_at: null },
        },
      })
      .eq("id", eventId)

    try {
      const result = await generateRecapVideo({ eventId, mood, supabase })

      const recapVideoSettings = {
        status: "ready" as const,
        mood,
        video_url: result.videoUrl,
        generated_at: new Date().toISOString(),
        stats: result.stats,
      }

      const { error: updateErr } = await supabase
        .from("events")
        .update({
          settings: { ...currentSettings, recap_video: recapVideoSettings },
        })
        .eq("id", eventId)

      if (updateErr) {
        logger.error("recap generate: failed to persist ready state", { eventId, error: updateErr.message })
      }

      return ok({ recap_video: recapVideoSettings })
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err)
      // Short, non-sensitive reference so a host-reported failure can still
      // be traced back to the matching `logger.error` line below without
      // exposing raw internals (ffmpeg stderr, /tmp paths, Supabase errors)
      // in the HTTP response or persisted settings.
      const ref = `${eventId.slice(0, 8)}-${Date.now().toString(36)}`
      logger.error("recap generate: generation failed", { eventId, mood, ref, error: rawMessage })

      const userMessage = `${GENERIC_FAILURE_MESSAGE} (ref: ${ref})`

      const recapVideoSettings = {
        status: "failed" as const,
        mood,
        error: userMessage,
      }

      try {
        await supabase
          .from("events")
          .update({
            settings: { ...currentSettings, recap_video: recapVideoSettings },
          })
          .eq("id", eventId)
      } catch (persistErr) {
        logger.error("recap generate: failed to persist failed state", { eventId, error: String(persistErr) })
      }

      return fail("RECAP_GENERATION_FAILED", userMessage, 500)
    }
  },
}).POST
