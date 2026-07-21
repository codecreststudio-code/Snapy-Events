// src/app/api/events/[id]/memories/summary/route.ts
//
// "Event Summary" — Snapsy Memories feature. One SQL aggregation call
// (get_event_summary_stats, 0028_snapsy_memories.sql), no AI. Mirrors the
// ownership-check pattern used by recap/generate/route.ts and
// memories/awards/route.ts.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { getEventSummaryStats, formatBytes, formatHour } from "@/lib/integrations/memories"

const paramsSchema = z.object({ id: z.string().uuid() })

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) return fail("VALIDATION_ERROR", "Invalid event ID", 422)
    const eventId = parsedParams.data.id

    const supabase = await createServiceClient()

    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, name, host_id, event_date, end_date, created_at")
      .eq("id", eventId)
      .single()

    if (eventErr || !eventRow) return fail("NOT_FOUND", "Event not found", 404)
    if (eventRow.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    const stats = await getEventSummaryStats(supabase, eventId)

    return ok({
      eventName: eventRow.name,
      ...stats,
      storageFormatted: formatBytes(stats.storageBytes),
      peakUploadTimeFormatted: formatHour(stats.peakUploadHour),
    })
  },
}).GET
