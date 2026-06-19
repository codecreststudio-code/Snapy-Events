import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { QrDisplay } from "./qr-display"

export const metadata = { title: "Event QR" }

export default async function EventQrPage({ params }: PageProps<"/event/[slug]/qr">) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: ev } = await supabase.from("events").select("id, name, slug").eq("slug", slug).eq("status", "published").single()
  if (!ev) notFound()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://snapy-events.vercel.app"
  const url = `${base}/event/scan/${ev.slug}`
  return <QrDisplay eventName={ev.name} url={url} />
}
