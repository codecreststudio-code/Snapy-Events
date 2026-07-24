import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// Default values when nothing has been configured yet
const DEFAULTS = {
  social_links: {
    facebook: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    youtube: "",
    tiktok: "",
    whatsapp: "",
    telegram: "",
    pinterest: "",
    snapchat: "",
  },
  footer_credits: {
    built_by: "CodeCrest_Studio",
    built_by_url: "https://codecreststudio.vercel.app/",
    powered_by: "Snapsy Events",
  },
  custom_tags: [] as { label: string; url: string }[],
}

export async function GET() {
  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["social_links", "footer_credits", "custom_tags"])

    if (error) {
      console.error("[site-branding] GET DB Error:", error.message)
      // Return defaults on error so the footer never breaks
      return NextResponse.json(DEFAULTS, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      })
    }

    const settings = (data ?? []).reduce(
      (acc, row) => {
        acc[row.key as keyof typeof DEFAULTS] = row.value
        return acc
      },
      { ...DEFAULTS } as Record<string, any>,
    )

    // Merge defaults for any missing keys
    const result = {
      social_links: { ...DEFAULTS.social_links, ...(settings.social_links ?? {}) },
      footer_credits: { ...DEFAULTS.footer_credits, ...(settings.footer_credits ?? {}) },
      custom_tags: settings.custom_tags ?? DEFAULTS.custom_tags,
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch (err) {
    console.error("[site-branding] GET Error:", err)
    return NextResponse.json(DEFAULTS, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    })
  }
}
