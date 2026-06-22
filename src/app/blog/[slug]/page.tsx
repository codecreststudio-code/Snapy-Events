import type { Metadata } from "next"
import { notFound } from "next/navigation"
import BlogPostClient from "./client"
import { BLOG_POSTS, getPostBySlug, getRelatedPosts } from "@/lib/blog/data"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return BLOG_POSTS.filter((p) => p.status === "published").map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: "Article Not Found" }

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
  const post = getPostBySlug(slug)
  if (!post || post.status !== "published") notFound()

  const related = getRelatedPosts(post, 3)

  // JSON-LD Article schema
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <BlogPostClient post={post} related={related} />
    </>
  )
}
