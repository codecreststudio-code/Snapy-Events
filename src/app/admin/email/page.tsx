import { adminDb } from "@/lib/supabase/admin"
import EmailDashboardClient from "./email-dashboard-client"

export const metadata = {
  title: "Email Management | Snapsy Admin",
}

export default async function AdminEmailPage() {
  const sb = await adminDb()

  const [{ data: templates }, { data: logs }, { data: settingsRow }] = await Promise.all([
    sb.from("email_templates").select("*").order("is_system", { ascending: false }).order("name"),
    sb.from("email_logs").select("*").order("created_at", { ascending: false }).limit(200),
    sb.from("platform_settings").select("value").eq("key", "email_settings").single(),
  ])

  // sender_email defaults to Resend's zero-setup sandbox address, not a
  // gmail.com address — Resend can only send "from" a domain verified at
  // resend.com/domains, which is impossible for a webmail domain like gmail.com.
  const emailSettings = settingsRow?.value ?? {
    sender_name: "Snapsy Event",
    sender_email: "onboarding@resend.dev",
    reply_to: "snapsyevent@gmail.com",
    support_email: "snapsyevent@gmail.com",
    contact_email: "snapsyevent@gmail.com",
    logo_url: "https://snapsy-events.vercel.app/logo_png.png",
    footer_text: "© Snapsy. All rights reserved.",
    signature: "",
    company_address: "",
    social_links: {},
  }

  return (
    <EmailDashboardClient
      initialTemplates={templates ?? []}
      initialLogs={logs ?? []}
      initialSettings={emailSettings as any}
    />
  )
}
