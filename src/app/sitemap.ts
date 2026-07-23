import type { MetadataRoute } from "next"
import { createServiceClient } from "@/lib/supabase/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/delete-data`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]

  let blogRoutes: MetadataRoute.Sitemap = []

  try {
    const supabase = await createServiceClient()
    const { data: posts } = await supabase
      .from("blog_posts")
      // blog_posts has no `published` boolean column — publication state is
      // tracked via the `status` enum (draft/published/scheduled/archived),
      // same as everywhere else in the app (see e.g. src/app/blog/[slug]/
      // page.tsx). The old `.eq("published", true)` here threw
      // "column blog_posts.published does not exist" (Postgres 42703) on
      // every single sitemap.xml request — caught by the try/catch below so
      // it never crashed the route, but it meant blogRoutes was silently
      // empty forever (no blog post ever made it into the sitemap) and spammed
      // the error logs on every crawl.
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .limit(500)

    if (posts && posts.length > 0) {
      blogRoutes = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : (post.published_at ? new Date(post.published_at) : new Date()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
    }
  } catch (error) {
    console.error("[sitemap] Failed to fetch blog posts:", error)
  }

  return [...staticRoutes, ...blogRoutes]
}
