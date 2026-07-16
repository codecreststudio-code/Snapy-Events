// src/lib/security/guest-session.ts
//
// Real, server-enforced guest access gate for a single event. Before this
// module existed, "checking in" (GuestCaptureModal) and the join-code flow
// (/api/events/join) were both purely cosmetic: the modal wrote to
// localStorage and called a server action that inserted an audit row but
// never issued any credential, and no API route ever checked for one. The
// practical effect was that ANY guest — check-in completed, popup dismissed,
// or a raw curl/devtools request with no UI at all — could upload photos,
// videos, voice notes, comments, and reactions to any event whose slug they
// had, whether or not the host intended the event to be private.
//
// This module issues a signed, httpOnly cookie scoped to one event once a
// guest completes check-in (see src/app/actions/guest.ts). Every route that
// lets a guest write data (upload, react/comment/voice-reply) — and every
// page that renders the actual gallery content — validates this cookie
// server-side. There is no way to get a valid cookie without completing
// check-in, so closing the popup without submitting leaves the guest with
// no working upload/view capability, enforced independent of what the
// client-side UI does or doesn't hide.
//
// Reuses CSRF_SECRET (already a required production secret — see
// src/lib/security/csrf.ts) rather than introducing a new env var. The HMAC
// input is purpose-prefixed ("guest_session:") so a token generated here can
// never be replayed as a valid CSRF token or vice versa.

import { cookies } from "next/headers"
import { createHmac } from "node:crypto"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

function secret(): string {
  const csrfSecret = process.env.CSRF_SECRET
  if (!csrfSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CSRF_SECRET environment variable is not set. This is a security configuration error.")
    }
    return "csrf-dev-secret-do-not-use-in-production"
  }
  return csrfSecret
}

function sign(eventId: string): string {
  return createHmac("sha256", secret()).update(`guest_session:${eventId}`).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let res = 0
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return res === 0
}

export function guestCookieName(eventId: string): string {
  return `snapsy_guest_session_${eventId}`
}

/** Call from a Server Action (e.g. after logGuestAccess succeeds) to grant this event. */
export async function grantGuestSession(eventId: string): Promise<void> {
  const store = await cookies()
  store.set(guestCookieName(eventId), sign(eventId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days — guests may return across a multi-day event
  })
}

/** Read-only check for use in Server Components (pages) — cookies() can be read but not set there. */
export async function hasGuestSessionSSR(eventId: string): Promise<boolean> {
  const store = await cookies()
  const token = store.get(guestCookieName(eventId))?.value
  if (!token) return false
  return safeEqual(token, sign(eventId))
}

/** Check for use inside API route handlers, which receive a NextRequest directly. */
export function hasGuestSessionFromRequest(request: NextRequest, eventId: string): boolean {
  const token = request.cookies.get(guestCookieName(eventId))?.value
  if (!token) return false
  return safeEqual(token, sign(eventId))
}

/**
 * True if the current request carries an authenticated Supabase session
 * belonging to this specific event's host. These upload/react routes all
 * use `requireAuth: false` (guests must be able to hit them anonymously
 * after check-in), so defineRoute's own `auth` context is always the
 * anonymous default here — it can't be used to detect "this caller is the
 * host." We check the real cookie-based session directly instead, and
 * require it to match this event's host_id (not just "some host is logged
 * in") so User B can't use their own login to skip check-in on User A's
 * event.
 */
export async function isEventHost(hostId: string | null | undefined): Promise<boolean> {
  if (!hostId) return false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return !!user && user.id === hostId
  } catch {
    return false
  }
}
