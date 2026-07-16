"use server"

import { createClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"
import { grantGuestSession } from "@/lib/security/guest-session"

export async function logGuestAccess(eventId: string, guestDetails: { name: string; email?: string; mobile?: string }) {
  const supabase = await createClient()

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
  // routes and the gallery pages now check server-side.
  await grantGuestSession(eventId)

  return { success: true, sessionToken }
}
