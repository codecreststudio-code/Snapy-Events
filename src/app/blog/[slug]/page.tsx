import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import BlogPostClient from "./client"
import { createClient } from "@/lib/supabase/server"
import type { BlogPost } from "@/lib/types/blog"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ slug: string }>
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient()
  const { data: post } = await supabase
    .from("blog_posts")
    .select(`
      *,
      author:blog_authors(id, name, slug, avatar_url, bio, twitter_url, linkedin_url),
      category:blog_categories(id, name, slug, emoji, color)
    `)
    .eq("slug", slug)
    .single()

  return post as unknown as BlogPost | null
}

async function getRelated(categoryId: string | null, excludeId: string) {
  const supabase = await createClient()
  let related: any[] = []

  if (categoryId) {
    const { data } = await supabase
      .from("blog_posts")
      .select(`
        id, title, slug, cover_image_url, read_time_minutes, status,
        category:blog_categories(id, name, slug, emoji, color)
      `)
      .eq("status", "published")
      .eq("category_id", categoryId)
      .neq("id", excludeId)
      .order("published_at", { ascending: false })
      .limit(3)
    related = data || []
  }

  if (related.length < 3) {
    const needed = 3 - related.length
    const excludeIds = [excludeId, ...related.map((r) => r.id)]
    
    let query = supabase
      .from("blog_posts")
      .select(`
        id, title, slug, cover_image_url, read_time_minutes, status,
        category:blog_categories(id, name, slug, emoji, color)
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(needed)
      
    if (excludeIds.length === 1) {
      query = query.neq("id", excludeId)
    } else {
      query = query.not("id", "in", `(${excludeIds.join(",")})`)
    }

    const { data } = await query
    if (data) related = [...related, ...data]
  }

  return related as unknown as BlogPost[]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post || post.status !== "published") return { title: "Article Not Found" }

  const title = post.seo_title ?? post.title
  const description = post.seo_description ?? post.excerpt ?? ""
  const ogImage = post.og_image_url ?? post.cover_image_url

  return {
    title: `${title} | Snapsy Blog`,
    description,
    openGraph: {
      title: post.og_title ?? title,
      description: post.og_description ?? description,
      type: "article",
      publishedTime: post.published_at,
      authors: post.author ? [post.author.name] : [],
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
    alternates: {
      canonical: post.canonical_url ?? `/blog/${post.slug}`,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post || post.status !== "published") notFound()

  const related = await getRelated(post.category?.id || null, post.id)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image_url,
    author: {
      "@type": "Person",
      name: post.author?.name,
    },
    publisher: {
      "@type": "Organization",
      name: "Snapsy",
      logo: {
        "@type": "ImageObject",
        url: "https://snapsy.app/logo.png",
      },
    },
    datePublished: post.published_at,
    dateModified: post.updated_at ?? post.published_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://snapsy.app/blog/${post.slug}`,
    },
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://snapsy.app" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://snapsy.app/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://snapsy.app/blog/${post.slug}` },
    ],
  }

  const safeJson = (obj: unknown) =>
    JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")

  // proxy.ts's CSP now requires script-src content to carry a nonce instead
  // of relying on 'unsafe-inline' — these two JSON-LD tags are the only
  // inline <script>s this page itself renders (BlogPostClient's own
  // dangerouslySetInnerHTML only ever writes into a <div>, not a <script>).
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: safeJson(breadcrumbLd) }}
      />
      <BlogPostClient post={post} related={related} />
    </>
  )
}
