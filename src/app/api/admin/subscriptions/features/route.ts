import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const DEFAULT_FEATURES = [
  { id: "ai_face_search", name: "AI Face Search Matching", description: "Selfie vector search for guest photos", type: "boolean", is_active: true },
  { id: "live_photo_wall", name: "Live Photo Wall Stream", description: "Real-time slideshow & projector presentation mode", type: "boolean", is_active: true },
  { id: "custom_reveal", name: "Custom Reveal Countdown", description: "Lock media capsules until a designated unlock time", type: "boolean", is_active: true },
  { id: "all_filters", name: "All Image Filters Enabled", description: "Unlock 8+ camera filters for guest capture", type: "boolean", is_active: true },
  { id: "video_uploads", name: "Video Uploads", description: "Allow guests to upload short video clips", type: "boolean", is_active: true },
  { id: "voice_notes", name: "Voice Notes & Audio", description: "Record audio greetings and voice wishes", type: "boolean", is_active: true },
  { id: "guest_reactions", name: "Guest Reactions & Guestbook", description: "Enable comments, likes, and guestbook posts", type: "boolean", is_active: true },
  { id: "print_ready_downloads", name: "Print-Ready Downloads", description: "High-res gallery zip downloads for printing", type: "boolean", is_active: true },
  { id: "whatsapp_alerts", name: "WhatsApp Notification Alerts", description: "Automated guest upload reminders via WhatsApp", type: "boolean", is_active: true },
  { id: "priority_support", name: "24/7 Priority Support", description: "Dedicated fast-track customer support", type: "boolean", is_active: true },
]

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("features")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return fail("DB_ERROR", error.message, 500)

    if (!data || data.length === 0) {
      try {
        const { data: seeded } = await sb.from("features").insert(DEFAULT_FEATURES).select()
        if (seeded) return ok(seeded)
      } catch {
        // ignore seed error and return DEFAULT_FEATURES
        return ok(DEFAULT_FEATURES)
      }
    }

    return ok(data ?? DEFAULT_FEATURES)
  },
}).GET

const createFeatureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(["boolean", "quota", "string"]).default("boolean"),
  is_active: z.boolean().default(true),
  is_beta: z.boolean().default(false),
})

export const POST = defineRoute({
  method: "POST",
  requireAuth: "admin",
  body: createFeatureSchema,
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("features")
      .insert({
        ...body,
      })
      .select()
      .single()

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST
