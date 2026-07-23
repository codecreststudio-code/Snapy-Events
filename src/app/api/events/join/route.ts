import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { API_RATE_LIMITS } from "@/lib/constants"

// Public "I have a code" endpoint — resolves a host's short join_code
// (see migrations/0023_event_join_code.sql) to the event's slug so the
// guest-facing "Join an event" box can redirect to /event/[slug]. This is
// just an alternate front door to the exact same page a QR scan or shared
// link lands on: it does NOT bypass password protection or any other guest
// gate on that page — the frontend still lands on /event/[slug] and any
// password prompt that page shows today (or in the future) applies exactly
// the same way. It only saves the guest from typing/scanning the full URL.
//
// Codes are case-insensitive and normalized to uppercase (the charset in
// generate_join_code() is uppercase-only) so "k7xq9m" and "K7XQ9M" both work.
const bodySchema = z.object({
  code: z.string().trim().min(4).max(12),
})

export const POST = defineRoute<z.infer<typeof bodySchema>>({
  method: "POST",
  body: bodySchema,
  rateLimit: { key: "events:join", limit: API_RATE_LIMITS.JOIN_CODE, windowSeconds: 60 },
  handler: async ({ body }) => {
    const rawCode = body.code.trim()
    const code = rawCode.toUpperCase()
    const slugQuery = rawCode.toLowerCase()
    const supabase = await createServiceClient()

    // Try matching join_code first, then slug
    let { data: event, error } = await supabase
      .from("events")
      .select("slug, status, settings")
      .eq("join_code", code)
      .maybeSingle()

    if (!event) {
      const slugRes = await supabase
        .from("events")
        .select("slug, status, settings")
        .eq("slug", slugQuery)
        .maybeSingle()
      event = slugRes.data
      error = slugRes.error
    }

    if (error || !event || event.status !== "published") {
      return fail("NOT_FOUND", "That code doesn't match a live event. Double-check it and try again.", 404)
    }

    const settings = (event.settings ?? {}) as { password_protected?: boolean }
    return ok({
      slug: event.slug,
      password_protected: !!settings.password_protected,
    })
  },
}).POST
