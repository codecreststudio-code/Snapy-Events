import { NextResponse } from "next/server"
import { getFeatureFlags } from "@/lib/platform-settings"

// Public, read-only. Lets client components on both the guest gallery and
// the host dashboard (neither of which can call the server-only
// getFeatureFlags() directly) know whether Admin > Feature Flags →
// "Automated Image Watermarking" is on, so they can render the watermark
// overlay over displayed media. Exposes nothing beyond this one boolean —
// the rest of platform_settings stays admin-only via RLS.
export async function GET() {
  const flags = await getFeatureFlags()
  return NextResponse.json(
    { enabled: flags.watermark_enabled },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  )
}
