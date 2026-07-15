import { getPlatformSettings } from "@/app/actions/admin-settings"
import { SettingsClient } from "./settings-client"

export const metadata = {
  title: "Platform Settings | Snapsy Admin",
}

export default async function AdminSettingsPage() {
  const { data, success } = await getPlatformSettings()
  
  const initialSettings = success && data ? data : {
    feature_flags: {
      payments_enabled: true,
      ai_search_enabled: true,
      live_wall_enabled: true,
      watermark_enabled: false,
      white_label_enabled: false
    },
    integration_keys: {
      razorpay_key: "",
      resend_key: ""
    },
    email_templates: {
      welcome_subject: "Welcome to Snapsy!",
      notify_subject: "New guest photo uploads available!"
    }
  }

  // Payment gateway / email keys are read from process.env at request time
  // (see src/lib/integrations/razorpay.ts and resend.ts), never from the
  // database. The old UI let admins type a "key" into this page and save it
  // to platform_settings.integration_keys, but nothing ever read that column
  // back out for actual API calls — it was a config field with no effect,
  // and typing a real secret into it meant it sat in the DB unused instead
  // of ever taking effect. Replaced with a simple configured/not-configured
  // status computed from the real env vars, so the page can't lie about
  // what's actually wired up.
  const integrationStatus = {
    razorpay_configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    resend_configured: Boolean(process.env.RESEND_API_KEY),
  }

  return <SettingsClient initialSettings={initialSettings} integrationStatus={integrationStatus} />
}
