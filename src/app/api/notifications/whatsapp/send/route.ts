import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"
import { API_RATE_LIMITS } from "@/lib/constants"

const bodySchema = z.object({
  event_id: z.string().uuid(),
  phone_number: z.string().min(8),
  guest_name: z.string().optional(),
  template: z.enum(["upload_reminder", "gallery_unlocked", "qr_invite"]).default("upload_reminder"),
})

export const POST = defineRoute({
  method: "POST",
  body: bodySchema,
  requireAuth: true,
  // Queues a message to an attacker-suppliable phone_number on the host's
  // behalf — a compromised or malicious host account had no throttle here.
  rateLimit: { key: "whatsapp:send", limit: API_RATE_LIMITS.WHATSAPP_SEND, windowSeconds: 60 },
  audit: "whatsapp.alert.sent",
  handler: async ({ body, auth }) => {
    const supabase = await createServiceClient()
    const { data: event } = await supabase
      .from("events")
      .select("name, slug, host_id")
      .eq("id", body.event_id)
      .single()

    if (!event) return fail("NOT_FOUND", "Event not found", 404)
    if (event.host_id !== auth.user!.id) return fail("FORBIDDEN", "You do not own this event", 403)

    const gate = await checkEventFeatureAccess(body.event_id, "whatsapp_alerts")
    if (!gate.allowed) {
      return fail("FORBIDDEN", gate.reason || "WhatsApp notification alerts require a plan upgrade.", 403)
    }

    const guestName = body.guest_name || "Guest"
    const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"}/event/${event.slug}`

    // events has no `title` column (schema only defines `name` —
    // supabase/migrations/0001_init.sql:121); this route was reading an
    // undefined field into every outbound message, same bug class as the
    // download-zip route fixed alongside this one.
    let textMessage = `Hello ${guestName}! Photos from ${event.name} are live. Upload & view them here: ${galleryUrl}`
    if (body.template === "gallery_unlocked") {
      textMessage = `✨ Good news ${guestName}! The gallery for ${event.name} has unlocked! View all event memories now: ${galleryUrl}`
    }

    const { data, error } = await supabase.from("notification_queue").insert({
      type: "whatsapp",
      recipient: body.phone_number,
      payload: {
        template: body.template,
        event_title: event.name,
        message: textMessage,
        url: galleryUrl,
      },
      status: "pending",
      scheduled_for: new Date().toISOString(),
    }).select().single()

    if (error) return fail("DB_ERROR", "Failed to queue notification", 500)
    return ok({ success: true, notification_id: data.id, message: textMessage })
  },
}).POST
