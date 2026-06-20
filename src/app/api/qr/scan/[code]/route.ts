import { z } from "zod"
import { defineRoute, ok, fail, redirect } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

const params = z.object({ code: z.string().min(4) })

export const GET = defineRoute<unknown, unknown, { code: string }>({
  method: "GET",
  rateLimit: { key: "qr:scan", limit: 600, windowSeconds: 60 },
  handler: async ({ params, request }) => {
    const { code } = params
    const supabase = await createServiceClient()
    const { data: qr, error } = await supabase
      .from("qr_codes")
      .select("id, event_id, redirect_url, is_active, expires_at, event:events(slug, status)")
      .eq("code", code)
      .single()

    if (error || !qr) {
      // Fallback check for event slug
      const { data: ev } = await supabase
        .from("events")
        .select("slug, status")
        .eq("slug", code)
        .single()
      
      if (ev && ev.status === "published") {
        return redirect(`/event/${ev.slug}`, 302)
      }
      return fail("NOT_FOUND", "QR code or event not found", 404)
    }
    if (!qr.is_active) return fail("GONE", "QR code is inactive", 410)
    if (qr.expires_at && new Date(qr.expires_at) < new Date()) return fail("GONE", "QR code expired", 410)

    const h = await headers()
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null
    const ua = h.get("user-agent") ?? null

    try {
      await supabase.rpc("increment_qr_scan", {
        qr_uuid: qr.id,
        scan_ip: ip,
        scan_ua: ua,
        scan_country: h.get("x-vercel-ip-country"),
        scan_city: h.get("x-vercel-ip-city"),
        scan_device: ua?.includes("Mobile") ? "mobile" : "desktop",
        scan_referrer: h.get("referer"),
      })
    } catch {
      // ignore
    }

    const event = qr.event as any
    const ev = Array.isArray(event) ? event[0] : event
    const isCustomUrl = qr.redirect_url && !qr.redirect_url.includes(`/event/scan/${code}`)

    if (isCustomUrl) {
      return redirect(qr.redirect_url, 302)
    } else if (ev) {
      return redirect(`/event/${ev.slug}`, 302)
    } else {
      return fail("NOT_FOUND", "Destination not found", 404)
    }
  },
}).GET
