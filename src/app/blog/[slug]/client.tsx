"use client"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Playfair_Display, Inter } from "next/font/google"
import {
  Calendar,
  Clock,
  Share2,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Link2,
  Check,
  BookOpen,
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import type { BlogPost } from "@/lib/types/blog"

const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" })
const inter = Inter({ subsets: ["latin"], display: "swap" })

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function formatContent(content: string) {
  return content
    // h2
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-slate-900 mt-10 mb-4 tracking-tight">$1</h2>')
    // h3
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-slate-800 mt-7 mb-3">$1</h3>')
    // h4
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-slate-700 mt-5 mb-2">$1</h4>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="font-mono text-sm bg-slate-100 text-violet-700 px-1.5 py-0.5 rounded">$1</code>')
    // blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-violet-300 pl-5 py-2 my-5 text-slate-600 italic bg-violet-50/50 rounded-r-xl">$1</blockquote>')
    // hr
    .replace(/^---$/gm, '<hr class="border-slate-200 my-8">')
    // table rows (simple)
    .replace(/^\|(.+)\|$/gm, (match: string, row: string) => {
      const cells = row.split("|").map((c: string) => c.trim())
      const isHeader = row.includes("---")
      if (isHeader) return ""
      const tag = "td"
      return `<tr>${cells.map((c: string) => `<${tag} class="border border-slate-200 px-4 py-2 text-sm text-slate-700">${c}</${tag}>`).join("")}</tr>`
    })
    // wrap tables
    .replace(/((<tr>[\s\S]*?<\/tr>\n?)+)/g, '<div class="overflow-x-auto my-6"><table class="w-full border-collapse rounded-xl overflow-hidden border border-slate-200">$1</table></div>')
    // unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-700 text-sm leading-relaxed">$1</li>')
    // wrap consecutive <li> in <ul>
    .replace(/((<li[^>]*>[\s\S]*?<\/li>\n?)+)/g, '<ul class="space-y-1.5 my-4 pl-2">$1</ul>')
    // numbered list
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-700 text-sm leading-relaxed">$1</li>')
    // paragraphs (lines not starting with html tags)
    .replace(/^(?!<)(.+)$/gm, '<p class="text-slate-600 text-sm leading-relaxed my-3">$1</p>')
    // checkmarks ✅
    .replace(/✅/g, '<span class="text-green-500">✅</span>')
    .replace(/❌/g, '<span class="text-red-400">❌</span>')
}

// ─────────────────────────────────────────────────────────
// SHARE BUTTONS
// ─────────────────────────────────────────────────────────

function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== "undefined" ? window.location.href : `https://snapsy.app/blog/${slug}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 mr-1">Share:</span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-600 transition-colors"
        aria-label="Share on X (Twitter)"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
        aria-label="Share on LinkedIn"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <button
        onClick={handleCopy}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700 transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// NEWSLETTER (inline)
// ─────────────────────────────────────────────────────────

function InlineNewsletter() {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await fetch("/api/blog/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }) } catch (_) {}
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <Check className="h-4 w-4 text-green-600" />
        </div>
        <p className="text-sm text-slate-700 font-medium">You&apos;re subscribed! Great tips coming your way.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        required
        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 min-w-0"
      />
      <Button type="submit" className="rounded-xl bg-violet-600 text-white hover:bg-violet-700 px-5 shrink-0 text-sm">
        Subscribe
      </Button>
    </form>
  )
}

// ─────────────────────────────────────────────────────────
// RELATED CARD
// ─────────────────────────────────────────────────────────

function RelatedCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex gap-4 items-start py-3 border-b border-slate-100 last:border-0">
      <div className="h-14 w-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-slate-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">{post.title}</p>
        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          <Clock className="h-3 w-3" />{post.read_time_minutes} min
        </p>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN CLIENT COMPONENT
// ─────────────────────────────────────────────────────────

export default function BlogPostClient({ post, related }: { post: BlogPost; related: BlogPost[] }) {
  const [readingProgress, setReadingProgress] = useState(0)
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (post?.id) {
      fetch(`/api/blog/posts/${post.id}/view`, { method: "POST" }).catch(() => {})
    }
  }, [post?.id])

  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current
      if (!el) return
      const { top, height } = el.getBoundingClientRect()
      const progress = Math.min(100, Math.max(0, ((window.innerHeight - top) / height) * 100))
      setReadingProgress(progress)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className={`flex min-h-screen flex-col bg-white text-slate-900 ${inter.className}`}>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-slate-100">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <PublicNavbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {post.cover_image_url && (
            <div className="relative h-[55vh] min-h-[380px]">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
            </div>
          )}
        </section>

        {/* Article */}
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-[1fr_320px] gap-12 -mt-24 relative z-10">

            {/* Article body */}
            <article ref={articleRef}>
              {/* Article header card */}
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 mb-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                  <Link href="/" className="hover:text-violet-600 transition-colors">Home</Link>
                  <span>/</span>
                  <Link href="/blog" className="hover:text-violet-600 transition-colors">Blog</Link>
                  {post.category && (
                    <>
                      <span>/</span>
                      <Link href={`/blog/category/${post.category.slug}`} className="hover:text-violet-600 transition-colors">
                        {post.category.name}
                      </Link>
                    </>
                  )}
                </nav>

                {/* Category badge */}
                {post.category && (
                  <Link href={`/blog/category/${post.category.slug}`}>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white mb-4"
                      style={{ backgroundColor: post.category.color ?? "#7c3aed" }}
                    >
                      {post.category.emoji} {post.category.name}
                    </span>
                  </Link>
                )}

                <h1 className={`text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-slate-900 leading-tight mb-6 ${playfair.className}`}>
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p className="text-lg text-slate-500 font-light leading-relaxed mb-6 border-l-4 border-violet-200 pl-5">
                    {post.excerpt}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.author?.avatar_url}
                      alt={post.author?.name}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-violet-100"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{post.author?.name}</p>
                      <p className="text-[10px] text-slate-400">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {post.read_time_minutes} min read
                  </div>
                  <div className="ml-auto">
                    <ShareButtons title={post.title} slug={post.slug} />
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-12 prose-article"
                dangerouslySetInnerHTML={{ __html: formatContent(post.content || "") }}
              />

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/blog/tag/${tag.slug}`}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-violet-100 hover:text-violet-700 transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Author box */}
              {post.author && (
                <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-6 flex gap-5">
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.name}
                    className="h-16 w-16 rounded-2xl object-cover shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-1">About the author</p>
                    <Link href={`/blog/author/${post.author.slug}`} className="font-bold text-slate-900 hover:text-violet-700 transition-colors">
                      {post.author.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{post.author.bio}</p>
                  </div>
                </div>
              )}

              {/* Newsletter inline CTA */}
              <div className="mt-8 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📬</span>
                  <h3 className="font-bold text-slate-900 text-sm">Get more guides like this</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">Join 10,000+ event professionals getting tips, guides, and updates from Snapsy.</p>
                <InlineNewsletter />
              </div>

              {/* Navigation */}
              <div className="mt-8 flex justify-between">
                <Link href="/blog">
                  <button className="flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to blog
                  </button>
                </Link>
                <ShareButtons title={post.title} slug={post.slug} />
              </div>
            </article>

            {/* Sidebar */}
            <aside className="mt-0 space-y-6">
              {/* Related Articles */}
              {related.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sticky top-[100px]">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">You might also like</h3>
                  {related.map((r) => (
                    <RelatedCard key={r.id} post={r} />
                  ))}

                  <Link href="/blog" className="mt-4 inline-flex items-center gap-1 text-xs text-violet-600 font-semibold hover:text-violet-700">
                    Browse all articles <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

              {/* CTA */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-violet-950 p-6 text-white">
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">Try Snapsy Free</p>
                <h3 className={`text-xl font-normal mb-3 ${playfair.className}`}>
                  Ready to transform your events?
                </h3>
                <p className="text-slate-400 text-xs mb-4">
                  QR photo galleries, AI face search, and live photo walls — all in one platform.
                </p>
                <Link href="/signup">
                  <Button className="w-full rounded-xl bg-white text-slate-900 hover:bg-violet-100 text-sm font-semibold transition-colors">
                    Get Started Free →
                  </Button>
                </Link>
              </div>
            </aside>
          </div>

          {/* Related posts grid */}
          {related.length > 0 && (
            <section className="mt-16 mb-12">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Keep reading</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {related.map((r) => (
                  <motion.article
                    key={r.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="group rounded-2xl border border-slate-100 bg-white overflow-hidden hover:shadow-lg transition-all"
                  >
                    <Link href={`/blog/${r.slug}`} className="block aspect-video overflow-hidden bg-slate-100">
                      {r.cover_image_url && (
                        <img src={r.cover_image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                    </Link>
                    <div className="p-5">
                      {r.category && (
                        <span className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: r.category.color ?? "#7c3aed" }}>
                          {r.category.emoji} {r.category.name}
                        </span>
                      )}
                      <Link href={`/blog/${r.slug}`}>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-violet-700 transition-colors line-clamp-2">{r.title}</h3>
                      </Link>
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {r.read_time_minutes} min read
                      </p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
