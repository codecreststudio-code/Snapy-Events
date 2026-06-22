"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Playfair_Display, Inter } from "next/font/google"
import {
  Calendar,
  Clock,
  ArrowRight,
  Search,
  BookOpen,
  Users,
  Sparkles,
  TrendingUp,
  Mail,
  Check,
  ChevronDown,
} from "lucide-react"
import { PublicNav } from "@/lib/components/layout/public-nav"
import { PublicFooter } from "@/lib/components/layout/public-footer"
import { Button } from "@/lib/components/ui/button"
import {
  BLOG_CATEGORIES,
  BLOG_POSTS,
  getFeaturedPost,
  getTrendingPosts,
  getLatestPosts,
} from "@/lib/blog/data"
import type { BlogPost } from "@/lib/types/blog"

const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" })
const inter = Inter({ subsets: ["latin"], display: "swap" })

// ─────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────

function ArticleCard({ post, index = 0 }: { post: BlogPost; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      className="group flex flex-col rounded-2xl border border-slate-100 bg-white overflow-hidden hover:shadow-xl hover:border-slate-200 transition-all duration-300"
    >
      <Link href={`/blog/${post.slug}`} className="block aspect-[16/9] overflow-hidden bg-slate-100">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-violet-300" />
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-5">
        {post.category && (
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="text-[10px] font-bold uppercase tracking-widest mb-2 hover:opacity-70 transition"
            style={{ color: post.category.color ?? "#7c3aed" }}
          >
            {post.category.emoji} {post.category.name}
          </Link>
        )}

        <Link href={`/blog/${post.slug}`}>
          <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 group-hover:text-violet-700 transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>

        <p className="text-xs text-slate-500 font-light leading-relaxed line-clamp-2 flex-1 mb-4">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
          <img
            src={post.author?.avatar_url}
            alt={post.author?.name}
            className="h-6 w-6 rounded-full object-cover"
          />
          <span className="text-[10px] text-slate-400">{post.author?.name}</span>
          <span className="text-[10px] text-slate-300">•</span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />{post.read_time_minutes} min read
          </span>
        </div>
      </div>
    </motion.article>
  )
}

function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="group grid md:grid-cols-2 gap-0 rounded-3xl border border-slate-200 bg-white overflow-hidden hover:shadow-2xl transition-all duration-500"
    >
      <Link href={`/blog/${post.slug}`} className="block overflow-hidden aspect-[4/3] md:aspect-auto">
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        )}
      </Link>

      <div className="p-8 md:p-12 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4">
          <span className="rounded-full bg-violet-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-widest">
            ✦ Featured
          </span>
          <span className="text-xs text-slate-400">{post.read_time_minutes} min read</span>
        </div>

        {post.category && (
          <Link href={`/blog/category/${post.category.slug}`}>
            <span
              className="text-xs font-bold uppercase tracking-wider mb-3 block hover:opacity-70"
              style={{ color: post.category.color ?? "#7c3aed" }}
            >
              {post.category.emoji} {post.category.name}
            </span>
          </Link>
        )}

        <Link href={`/blog/${post.slug}`}>
          <h2
            className={`text-2xl md:text-3xl font-normal tracking-tight text-slate-900 leading-tight mb-4 group-hover:text-violet-700 transition-colors ${playfair.className}`}
          >
            {post.title}
          </h2>
        </Link>

        <p className="text-sm text-slate-500 font-light leading-relaxed mb-6 line-clamp-3">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-3 mb-6">
          <img
            src={post.author?.avatar_url}
            alt={post.author?.name}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-violet-100"
          />
          <div>
            <p className="text-xs font-semibold text-slate-800">{post.author?.name}</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {post.published_at
                ? new Date(post.published_at).toLocaleDateString("en-IN", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : ""}
            </p>
          </div>
        </div>

        <Link href={`/blog/${post.slug}`}>
          <Button className="w-fit rounded-full bg-slate-950 text-white hover:bg-violet-700 transition-colors px-6">
            Read article <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.article>
  )
}

function TrendingItem({ post, rank }: { post: BlogPost; rank: number }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-3xl font-black text-slate-100 group-hover:text-violet-200 transition-colors leading-none w-8 shrink-0">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
          {post.title}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">{post.read_time_minutes} min read</p>
      </div>
    </Link>
  )
}

function NewsletterSignup() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await fetch("/api/blog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    } catch (_) {}
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-8 text-center"
      >
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <p className="font-semibold text-slate-800">You&apos;re subscribed!</p>
        <p className="text-xs text-slate-500">We&apos;ll send you the latest tips and guides.</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent bg-white"
      />
      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-950 text-white hover:bg-violet-700 transition-colors py-3 text-sm font-semibold"
      >
        {loading ? "Subscribing…" : "Subscribe Now →"}
      </Button>
      <ul className="space-y-1">
        {["Useful tips & guides", "Product updates", "No spam, ever"].map((item) => (
          <li key={item} className="flex items-center gap-2 text-[11px] text-slate-500">
            <Check className="h-3 w-3 text-green-500 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </form>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [visibleCount, setVisibleCount] = useState(6)

  const featured = getFeaturedPost()
  const trending = getTrendingPosts(5)

  const filteredPosts =
    activeCategory === "all"
      ? BLOG_POSTS.filter((p) => p.status === "published")
      : BLOG_POSTS.filter(
          (p) => p.status === "published" && p.category?.slug === activeCategory
        )

  const visiblePosts = filteredPosts.slice(0, visibleCount)

  return (
    <div className={`flex min-h-screen flex-col bg-white text-slate-900 ${inter.className}`}>
      <PublicNav />

      <main className="flex-1">

        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white border-b border-slate-100 py-16 md:py-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-violet-100/40 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-fuchsia-100/40 blur-3xl" />
          </div>

          <div className="container mx-auto max-w-7xl px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7 }}
              >
                <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-100 px-3 py-1 text-xs font-semibold text-violet-600 mb-6">
                  <Sparkles className="h-3.5 w-3.5" />
                  SNAPSY BLOG
                </div>

                <h1
                  className={`text-4xl md:text-6xl font-normal tracking-tight text-slate-900 leading-tight mb-4 ${playfair.className}`}
                >
                  Stories, tips & inspiration for{" "}
                  <span className="italic bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                    unforgettable
                  </span>{" "}
                  events
                </h1>

                <p className="text-base text-slate-500 font-light leading-relaxed mb-8 max-w-lg">
                  Practical guides, expert tips, and real stories to help you capture, share and relive every moment beautifully.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href="#latest">
                    <Button className="rounded-full bg-slate-950 text-white hover:bg-violet-700 px-6 transition-colors">
                      Explore Articles →
                    </Button>
                  </Link>
                  <button className="flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-colors">
                    <Mail className="h-4 w-4" />
                    Subscribe
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mt-10 pt-8 border-t border-slate-100">
                  {[
                    { icon: BookOpen, value: "50+", label: "Articles" },
                    { icon: Users, value: "10K+", label: "Readers" },
                    { icon: Sparkles, value: "25+", label: "Experts" },
                    { icon: TrendingUp, value: "100K+", label: "Moments Shared" },
                  ].map(({ icon: Icon, value, label }) => (
                    <div key={label} className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Icon className="h-4 w-4 text-violet-500" />
                      </div>
                      <p className="text-base font-extrabold text-slate-900">{value}</p>
                      <p className="text-[10px] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Hero images collage */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="hidden md:grid grid-cols-2 gap-3"
              >
                {BLOG_POSTS.slice(0, 4).map((post, i) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className={`block rounded-2xl overflow-hidden aspect-square group ${i === 0 ? "col-span-2 aspect-video" : ""}`}
                  >
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── CATEGORY PILL TABS ───────────────────────────── */}
        <section className="border-b border-slate-100 bg-white sticky top-[80px] z-30 shadow-sm shadow-slate-900/3">
          <div className="container mx-auto max-w-7xl px-6">
            <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory("all")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  activeCategory === "all"
                    ? "bg-slate-950 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                📚 All Posts
              </button>
              {BLOG_CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => { setActiveCategory(cat.slug); setVisibleCount(6) }}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    activeCategory === cat.slug
                      ? "text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                  style={
                    activeCategory === cat.slug
                      ? { backgroundColor: cat.color }
                      : {}
                  }
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT + SIDEBAR ───────────────────────── */}
        <section className="container mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="grid lg:grid-cols-[1fr_320px] gap-10">

            {/* LEFT COLUMN */}
            <div>
              {/* Featured Article */}
              {activeCategory === "all" && featured && (
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-900">Featured Article</h2>
                    <Link href="/blog" className="text-xs text-violet-600 font-semibold hover:text-violet-700 flex items-center gap-1">
                      View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <FeaturedCard post={featured} />
                </div>
              )}

              {/* Latest Articles grid */}
              <div id="latest">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeCategory === "all" ? "Latest Articles" : BLOG_CATEGORIES.find((c) => c.slug === activeCategory)?.name ?? "Articles"}
                  </h2>
                  <span className="text-xs text-slate-400">{filteredPosts.length} articles</span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                  {visiblePosts.map((post, i) => (
                    <ArticleCard key={post.id} post={post} index={i} />
                  ))}
                </div>

                {visibleCount < filteredPosts.length && (
                  <div className="text-center">
                    <button
                      onClick={() => setVisibleCount((v) => v + 6)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 transition-colors"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Load more articles
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <aside className="space-y-8">

              {/* Search */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Search Articles</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search tips, guides, inspiration..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Popular Topics */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Popular Topics</h3>
                <ul className="space-y-3">
                  {BLOG_CATEGORIES.slice(0, 5).map((cat) => (
                    <li key={cat.slug}>
                      <Link
                        href={`/blog/category/${cat.slug}`}
                        className="flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat.emoji}</span>
                          <span className="text-xs font-medium text-slate-700 group-hover:text-violet-700 transition-colors">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{cat.post_count} articles</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Newsletter */}
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-1">Stay inspired, always</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Get the latest tips, guides, and product updates straight to your inbox.
                </p>
                <NewsletterSignup />
              </div>

              {/* Trending */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                  Trending Articles
                </h3>
                <div>
                  {trending.map((post, i) => (
                    <TrendingItem key={post.id} post={post} rank={i + 1} />
                  ))}
                </div>
                <Link
                  href="/blog"
                  className="mt-4 inline-flex items-center gap-1 text-xs text-violet-600 font-semibold hover:text-violet-700"
                >
                  View all trending <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

            </aside>
          </div>
        </section>

        {/* ── CTA BANNER ───────────────────────────────────── */}
        <section className="bg-gradient-to-r from-slate-900 to-violet-950 py-16">
          <div className="container mx-auto max-w-7xl px-6">
            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-2">
                  FOR PHOTOGRAPHERS & PLANNERS
                </p>
                <h2 className={`text-2xl md:text-3xl font-normal text-white mb-3 ${playfair.className}`}>
                  Grow your business with <span className="italic text-violet-300">Snapsy</span>
                </h2>
                <p className="text-slate-400 text-sm">
                  Create stunning galleries, delight your clients, and collect more moments effortlessly.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup">
                  <Button className="rounded-full bg-white text-slate-900 hover:bg-violet-100 px-6 font-semibold transition-colors">
                    Start Free Today →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  )
}
