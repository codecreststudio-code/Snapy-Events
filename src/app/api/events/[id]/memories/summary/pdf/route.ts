// src/app/api/events/[id]/memories/summary/pdf/route.ts
//
// Downloadable summary.pdf for the Event Summary card. Same ownership check
// as the JSON summary route; renders via jsPDF (see summary-pdf.ts) instead
// of a headless browser — keeps this on the "no extra backend services"
// side of the stack.

import { z } from "zod"
import { NextResponse } from "next/server"
import { defineRoute, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { getEventSummaryStats } from "@/lib/integrations/memories"
import { renderSummaryPdf } from "@/lib/integrations/summary-pdf"
import { logger } from "@/lib/logger"

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
      .select("id, name, host_id, event_date")
      .eq("id", eventId)
      .single()

    if (eventErr || !eventRow) return fail("NOT_FOUND", "Event not found", 404)
    if (eventRow.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    const stats = await getEventSummaryStats(supabase, eventId)

    let pdfBuffer: Buffer
    try {
      pdfBuffer = renderSummaryPdf({ eventName: eventRow.name || "Our Event", eventDate: eventRow.event_date, stats })
    } catch (err) {
      logger.error("memories/summary/pdf: render failed", { eventId, error: String(err) })
      return fail("PDF_RENDER_FAILED", "Could not generate the summary PDF. Please try again.", 500)
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(eventRow.name || "event").replace(/[^a-z0-9-_ ]/gi, "").trim() || "event"}-summary.pdf"`,
        "Cache-Control": "private, no-store",
      },
    })
  },
}).GET
