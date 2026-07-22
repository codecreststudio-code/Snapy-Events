"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"
import { grantGuestSession } from "@/lib/security/guest-session"
import { rateLimit } from "@/lib/security/rate-limit"
import { API_RATE_LIMITS } from "@/lib/constants"
import { getClientIp } from "@/lib/security/client-ip"
import { sendPushNotification } from "@/lib/integrations/push"

// Codes use the same charset as generate_join_code() in
// supabase/migrations/0023_event_join_code.sql (excludes 0/O/1/I) — this is
// purely a normalize-before-compare step, not validation, since the real
// check is a straight string match against the stored join_code.
function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

export async function logGuestAccess(
  eventId: string,
  guestDetails: { name: string; email?: string; mobile?: string },
  joinCode?: string,
) {
  const supabase = await createClient()

  // Host-controlled hardening: when the host has turned on "Require join
  // code to enter" (settings.require_join_code, see Event Settings ->
  // Capsule Locks & Limits), a guest must supply the exact code shown on
  // the host's dashboard before check-in — and therefore before
  // grantGuestSession() ever runs — closes the gap where the join code was
  // previously just a cosmetic shortcut to the same slug URL anyone could
  // reach directly. Read with the request-scoped client (not service-role):
  // events are already publicly SELECT-able via RLS (the public event page
  // reads this same row anonymously), so this doesn't need elevated access.
  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select("join_code, settings, name, slug, host_id")
    .eq("id", eventId)
    .single()

  if (eventErr || !eventRow) {
    return { success: false, error: "This event could not be found." }
  }

  const settings = (eventRow.settings as Record<string, unknown> | null) ?? {}
  const requireJoinCode = settings.require_join_code === true

  if (requireJoinCode) {
    // Separate, tighter-windowed limit from /api/events/join's own
    // JOIN_CODE limit — this is the actual gate now, so it's the more
    // valuable brute-force target. Keyed by event+IP so guessing against
    // one event can't be laundered across others, and one slow guesser
    // can't exhaust another guest's attempts.
    const ip = getClientIp(await headers())
    const limit = await rateLimit({
      key: `guest-checkin:${eventId}:${ip}`,
      limit: API_RATE_LIMITS.GUEST_CHECKIN,
      windowSeconds: 600,
    })
    if (!limit.allowed) {
      return { success: false, error: "Too many attempts. Please wait a few minutes and try again." }
    }

    const storedCode = typeof eventRow.join_code === "string" ? normalizeCode(eventRow.join_code) : null
    const submittedCode = joinCode ? normalizeCode(joinCode) : null

    if (!storedCode || !submittedCode || submittedCode !== storedCode) {
      return { success: false, error: "That event code doesn't match. Double-check it with your host and try again." }
    }
  }

  // Generate a unique session token for this guest
  const sessionToken = uuidv4()

  const { error } = await supabase.from("photo_access").insert({
    event_id: eventId,
    session_token: sessionToken,
    guest_name: guestDetails.name,
    guest_email: guestDetails.email || null,
    permissions: { mobile: guestDetails.mobile || null },
    accessed_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Failed to log guest access:", error)
    return { success: false, error: error.message }
  }

  // This is the actual access grant. Previously nothing set a real,
  // server-verifiable credential here — sessionToken was generated and
  // returned to the client but never stored anywhere checkable, so every
  // route that should have required check-in (uploads, reactions, gallery
  // viewing) had no way to enforce it. This cookie is what upload/react API
  // routes and the gallery pages now check server-side. It is only ever
  // reached after the join-code check above passes (when required), so a
  // valid session is proof the guest supplied a correct code.
  await grantGuestSession(eventId)

  // Best-effort host notification — never blocks or fails the guest's own
  // check-in response. sendPushNotification writes the in-app notification
  // row and, if FIREBASE_SERVICE_ACCOUNT_KEY is configured, best-effort
  // pushes to the host's registered devices; see src/lib/integrations/push.ts.
  if (eventRow.host_id) {
    void sendPushNotification({
      userId: eventRow.host_id,
      type: "new_guest_joined",
      title: "New guest joined",
      body: `${guestDetails.name} just checked in to ${eventRow.name}.`,
      data: { url: `/dashboard/events/${eventRow.slug}` },
    })
  }

  return { success: true, sessionToken }
}
