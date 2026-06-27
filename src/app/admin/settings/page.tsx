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

  return <SettingsClient initialSettings={initialSettings} />
}
