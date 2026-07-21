// src/app/api/events/[id]/memories/awards/route.ts
//
// "Guest Awards" — Snapsy Memories feature. Pure SQL aggregation over the
// existing photos table (see get_guest_awards in
// supabase/migrations/0028_snapsy_memories.sql), no AI/model calls. Uses the
// service-role client (like recap/generate/route.ts) since the RPC function
// is only granted to service_role, then manually verifies event ownership —
// the same pattern used there, since this bypasses RLS.
//
// Once the event-completion automation (memories-automation.ts) has run,
// settings.memories_snapshot.guest_awards holds a frozen copy taken at the
// moment the event finished — we prefer that over a fresh RPC call so a
// stray late upload (e.g. a guest who still has the link open) can't change
// who "won" after the event is over. Before finalization (or for events that
// predate this feature), we fall back to the live computation exactly as
// before.

import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { getGuestAwardRows, deriveGuestAwards, type GuestAward } from "@/lib/integrations/memories"

const paramsSchema = z.object({ id: z.string().uuid() })

export type { GuestAward }

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
      .select("id, host_id, settings")
      .eq("id", eventId)
      .single()

    if (eventErr || !eventRow) return fail("NOT_FOUND", "Event not found", 404)
    if (eventRow.host_id !== auth.user!.id) {
      return fail("FORBIDDEN", "You don't have access to this event", 403)
    }

    const settings = (eventRow.settings as Record<string, unknown> | null) ?? {}
    const snapshot = settings.memories_snapshot as { guest_awards?: GuestAward[]; guest_count?: number } | undefined
    if (snapshot?.guest_awards) {
      return ok({ awards: snapshot.guest_awards, guestCount: snapshot.guest_count ?? snapshot.guest_awards.length, finalized: true })
    }

    const rows = await getGuestAwardRows(supabase, eventId)
    const { awards, guestCount } = deriveGuestAwards(rows)
    return ok({ awards, guestCount, finalized: false })
  },
}).GET
