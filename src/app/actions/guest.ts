"use server"

import { createClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"

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

  return { success: true, sessionToken }
}
