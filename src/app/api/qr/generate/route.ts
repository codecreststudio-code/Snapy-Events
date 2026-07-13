import { z } from "zod"
import { defineRoute, ok, fail, created } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { generateQrCode } from "@/lib/integrations/qr"

const body = z.object({ event_id: z.string().uuid(), name: z.string().optional() })

export const POST = defineRoute({
  method: "POST",
  body,
  requireAuth: true,
  audit: "qr.generated",
  handler: async ({ body, auth }) => {
    const supabase = await createClient()
    const { data: event } = await supabase
      .from("events")
      .select("host_id")
      .eq("id", body.event_id)
      .single()
    if (!event) return fail("NOT_FOUND", "Event not found", 404)
    if (event.host_id !== auth.user!.id) return fail("FORBIDDEN", "You do not own this event", 403)
    const code = generateQrCode()
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://snapsy-events.vercel.app"
    const redirect = `${base}/event/scan/${code}`
    const { data, error } = await supabase
      .from("qr_codes")
      .insert({ event_id: body.event_id, code, name: body.name ?? null, redirect_url: redirect })
      .select()
      .single()
    if (error) return fail("DB_ERROR", "Failed to create QR code", 400)
    return created(data)
  },
}).POST
