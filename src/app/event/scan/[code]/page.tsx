import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { trackEvent } from "@/lib/analytics/track"
import { increment_qr_scan } from "@/lib/db/rpc"
import { redirect } from "next/navigation"

export async function generateMetadata({ params }: PageProps<"/event/scan/[code]">) {
  return { title: "Opening event…" }
}

export default async function ScanRedirectPage({ params }: PageProps<"/event/scan/[code]">) {
  const { code } = await params
  const supabase = await createServiceClient()
  const { data: qr } = await supabase.from("qr_codes").select("id, event_id, redirect_url, is_active, expires_at, event:events(slug, status)").eq("code", code).single()
  if (!qr || !qr.is_active || (qr.expires_at && new Date(qr.expires_at) < new Date())) notFound()
  const h = await headers()
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null
  const ua = h.get("user-agent") ?? null
  void increment_qr_scan({ qr_id: qr.id, ip, ua, country: h.get("x-vercel-ip-country"), city: h.get("x-vercel-ip-city"), device: ua?.includes("Mobile") ? "mobile" : "desktop", referrer: h.get("referer") }).catch(() => null)
  const event = qr.event as any
  const ev = Array.isArray(event) ? event[0] : event
  const isCustomUrl = qr.redirect_url && !qr.redirect_url.includes(`/event/scan/${code}`)

  if (isCustomUrl) {
    redirect(qr.redirect_url)
  } else if (ev) {
    redirect(`/event/${ev.slug}`)
  } else {
    redirect("/")
  }
}
