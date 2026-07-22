import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/api/", "/checkout/", "/(auth)/", "/login", "/signup", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
