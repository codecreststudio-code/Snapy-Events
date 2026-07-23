"use client"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Playfair_Display, Inter } from "next/font/google"
import {
  Calendar,
  Clock,
  ArrowRight,
  Search,
  BookOpen,
  Sparkles,
  TrendingUp,
  Mail,
  Check,
  ChevronDown,
  Loader2,
  Users
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import type { BlogPost, BlogCategory } from "@/lib/types/blog"

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
      className="group flex flex-col rounded-2xl border border-hairline-dark bg-surface-card overflow-hidden hover:border-mauve/40 transition-all duration-300"
    >
      <Link href={`/blog/${post.slug}`} className="block aspect-[16/9] overflow-hidden bg-ink/5">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-mauve/15 to-mauve-strong/10 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-mauve/60" />
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-5">
        {post.category && (
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="text-[10px] font-bold uppercase tracking-widest mb-2 hover:opacity-70 transition"
            style={{ color: post.category.color ?? "#b8925a" }}
          >
            {post.category.emoji} {post.category.name}
          </Link>
        )}

        <Link href={`/blog/${post.slug}`}>
          <h3 className="text-sm font-bold text-ink leading-snug mb-2 group-hover:text-mauve transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>

        <p className="text-xs text-ink-secondary font-light leading-relaxed line-clamp-2 flex-1 mb-4">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-3 pt-3 border-t border-hairline-dark">
          <img
            src={post.author?.avatar_url}
            alt={post.author?.name}
            className="h-6 w-6 rounded-full object-cover"
          />
          <span className="text-[10px] text-ink-secondary">{post.author?.name}</span>
          <span className="text-[10px] text-ink-tertiary">•</span>
          <span className="text-[10px] text-ink-secondary flex items-center gap-1">
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
      className="group grid md:grid-cols-2 gap-0 rounded-3xl border border-hairline-dark bg-surface-card overflow-hidden hover:border-mauve/40 transition-all duration-500"
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
          <span className="rounded-full bg-mauve px-3 py-1 text-[10px] font-bold text-[#faf6ed] uppercase tracking-widest">
            ✦ Featured
          </span>
          <span className="text-xs text-ink-secondary">{post.read_time_minutes} min read</span>
        </div>

        {post.category && (
          <Link href={`/blog/category/${post.category.slug}`}>
            <span
              className="text-xs font-bold uppercase tracking-wider mb-3 block hover:opacity-70"
              style={{ color: post.category.color ?? "#b8925a" }}
            >
              {post.category.emoji} {post.category.name}
            </span>
          </Link>
        )}

        <Link href={`/blog/${post.slug}`}>
          <h2
            className={`text-2xl md:text-3xl font-light tracking-tight text-ink leading-tight mb-4 group-hover:text-mauve transition-colors ${playfair.className}`}
          >
            {post.title}
          </h2>
        </Link>

        <p className="text-sm text-ink-secondary font-light leading-relaxed mb-6 line-clamp-3">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-3 mb-6">
          <img
            src={post.author?.avatar_url}
            alt={post.author?.name}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-mauve/20"
          />
          <div>
            <p className="text-xs font-semibold text-ink">{post.author?.name}</p>
            <p className="text-[10px] text-ink-secondary flex items-center gap-1">
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
          <Button className="w-fit rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold transition-all px-6">
            Read article <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.article>
  )
}

function TrendingItem({ post, rank }: { post: BlogPost; rank: number }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex items-start gap-4 py-3 border-b border-hairline-dark last:border-0">
      <span className="text-3xl font-black text-ink/10 group-hover:text-mauve/40 transition-colors leading-none w-8 shrink-0">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-ink leading-snug line-clamp-2 group-hover:text-mauve transition-colors">
          {post.title}
        </p>
        <p className="text-[10px] text-ink-secondary mt-1">{post.read_time_minutes} min read</p>
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
        <div className="h-12 w-12 rounded-full bg-green-500/15 flex items-center justify-center">
          <Check className="h-6 w-6 text-green-400" />
        </div>
        <p className="font-semibold text-ink">You&apos;re subscribed!</p>
        <p className="text-xs text-ink-secondary">We&apos;ll send you the latest tips and guides.</p>
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
        className="w-full rounded-xl border border-hairline-dark px-4 py-3 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 focus:border-transparent bg-mauve/5"
      />
      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-mauve hover:bg-mauve-strong text-[#faf6ed] transition-all py-3 text-sm font-semibold"
      >
        {loading ? "Subscribing…" : "Subscribe Now →"}
      </Button>
      <ul className="space-y-1">
        {["Useful tips & guides", "Product updates", "No spam, ever"].map((item) => (
          <li key={item} className="flex items-center gap-2 text-[11px] text-ink-secondary">
            <Check className="h-3 w-3 text-green-400 shrink-0" />
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
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: "published", limit: "100" })
      const res = await fetch(`/api/blog/posts?${params}`)
      const json = await res.json()
      setPosts(json.posts ?? [])
    } catch (_) {}
    setLoading(false)
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/blog/categories")
      const json = await res.json()
      setCategories(json.categories ?? [])
    } catch (_) {}
  }, [])

  useEffect(() => {
    fetchData()
    fetchCategories()
  }, [fetchData, fetchCategories])

  // Derive counts from the loaded posts array (never from DB post_count which can be stale)
  const getCount = (slug: string) => posts.filter((p) => p.category?.slug === slug).length

  const filteredPosts = posts.filter((p) => {
    const matchCategory = activeCategory === "all" || p.category?.slug === activeCategory
    const matchSearch = !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.excerpt ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const featured = posts.find((p) => p.is_featured) ?? null
  const trending = posts.filter((p) => p.is_trending).slice(0, 5)
  const totalViews = posts.reduce((sum, p) => sum + (p.view_count ?? 0), 0)
  const visiblePosts = filteredPosts.slice(0, visibleCount)

  return (
    <div className={`flex min-h-screen flex-col bg-surface-dark text-ink ${inter.className}`}>
      <PublicNavbar />

      <main className="flex-1">

        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-surface-dark border-b border-hairline-dark py-16 md:py-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-mauve/10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-mauve-strong/10 blur-3xl" />
          </div>

          <div className="container mx-auto max-w-7xl px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7 }}
              >
                <div className="inline-flex items-center gap-1.5 rounded-full bg-mauve/10 border border-mauve/20 px-3 py-1 text-xs font-semibold text-mauve mb-6">
                  <Sparkles className="h-3.5 w-3.5" />
                  SNAPSY BLOG
                </div>

                <h1
                  className={`text-4xl md:text-6xl font-light tracking-tight text-ink leading-tight mb-4 ${playfair.className}`}
                >
                  Stories, tips & inspiration for{" "}
                  <span className="italic bg-gradient-to-r from-mauve to-mauve-strong bg-clip-text text-transparent">
                    unforgettable
                  </span>{" "}
                  events
                </h1>

                <p className="text-base text-ink-secondary font-light leading-relaxed mb-8 max-w-lg">
                  Practical guides, expert tips, and real stories to help you capture, share and relive every moment beautifully.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href="#latest">
                    <Button className="rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold px-6 transition-all shadow-lg shadow-mauve/10">
                      Explore Articles →
                    </Button>
                  </Link>
                  <button className="flex items-center gap-2 rounded-full border border-hairline-dark px-5 py-2.5 text-sm font-medium text-ink-secondary hover:bg-mauve/5 hover:text-ink transition-colors">
                    <Mail className="h-4 w-4" />
                    Subscribe
                  </button>
                </div>

                {/* Stats — live from DB */}
                <div className="grid grid-cols-4 gap-4 mt-10 pt-8 border-t border-hairline-dark">
                  {[
                    { icon: BookOpen, value: loading ? "…" : `${posts.length}`, label: "Articles" },
                    { icon: TrendingUp, value: loading ? "…" : `${trending.length}`, label: "Trending" },
                    { icon: Sparkles, value: loading ? "…" : `${categories.length}`, label: "Topics" },
                    { icon: Users, value: loading ? "…" : totalViews > 0 ? `${(totalViews / 1000).toFixed(0)}K+` : "0", label: "Total Views" },
                  ].map(({ icon: Icon, value, label }) => (
                    <div key={label} className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Icon className="h-4 w-4 text-mauve" />
                      </div>
                      <p className="text-base font-extrabold text-ink">{value}</p>
                      <p className="text-[10px] text-ink-secondary">{label}</p>
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
                {posts.slice(0, 4).map((post, i) => (
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

        {/* ── CATEGORY FILTER BAR ───────────────────────────── */}
        <section className="sticky top-[72px] z-30 bg-surface-dark/80 backdrop-blur-xl border-b border-hairline-dark">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6">
            <div className="relative flex items-center gap-1.5 py-3 overflow-x-auto scrollbar-hide">
              {/* All Posts */}
              <motion.button
                onClick={() => { setActiveCategory("all"); setVisibleCount(6); }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                  activeCategory === "all"
                    ? "bg-mauve text-[#faf6ed] shadow-lg shadow-mauve/20"
                    : "text-ink-secondary hover:text-ink hover:bg-mauve/5"
                }`}
              >
                <span className="text-sm leading-none">📚</span>
                <span>All Posts</span>
                {!loading && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${
                    activeCategory === "all" ? "bg-[#faf6ed]/10 text-[#faf6ed]" : "bg-ink/10 text-ink-secondary"
                  }`}>
                    {posts.length}
                  </span>
                )}
              </motion.button>

              {/* Divider */}
              <div className="h-6 w-px bg-hairline-dark shrink-0 mx-0.5" />

              {/* Category buttons */}
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-9 rounded-xl bg-ink/5 animate-pulse shrink-0" style={{ width: `${80 + i * 12}px` }} />
                  ))
                : categories.map((cat) => {
                    const count = posts.filter((p) => p.category?.slug === cat.slug).length
                    const isActive = activeCategory === cat.slug
                    return (
                      <motion.button
                        key={cat.slug}
                        onClick={() => { setActiveCategory(cat.slug); setVisibleCount(6); }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                          isActive ? "text-white shadow-lg" : "text-ink-secondary hover:text-ink hover:bg-mauve/5"
                        }`}
                        style={isActive ? { backgroundColor: cat.color, boxShadow: `0 4px 14px ${cat.color}40` } : {}}
                      >
                        <span className="text-sm leading-none">{cat.emoji}</span>
                        <span>{cat.name}</span>
                        {count > 0 && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${
                            isActive ? "bg-white/25 text-white" : "bg-ink/10 text-ink-secondary"
                          }`}>
                            {count}
                          </span>
                        )}
                      </motion.button>
                    )
                  })
              }
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT + SIDEBAR ───────────────────────── */}
        <section className="container mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="grid lg:grid-cols-[1fr_320px] gap-10">

            {/* LEFT COLUMN */}
            <div>
              {/* Loading skeleton */}
              {loading && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-hairline-dark bg-surface-card overflow-hidden animate-pulse">
                      <div className="aspect-video bg-ink/5" />
                      <div className="p-5 space-y-2">
                        <div className="h-3 bg-ink/5 rounded w-1/3" />
                        <div className="h-4 bg-ink/5 rounded w-full" />
                        <div className="h-3 bg-ink/5 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Featured Article */}
              {!loading && activeCategory === "all" && featured && (
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-ink">Featured Article</h2>
                    <Link href="/blog" className="text-xs text-mauve font-semibold hover:underline flex items-center gap-1">
                      View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <FeaturedCard post={featured} />
                </div>
              )}

              {/* Latest Articles grid */}
              <div id="latest">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-ink">
                    {searchQuery
                      ? `Results for "${searchQuery}"`
                      : activeCategory === "all"
                      ? "Latest Articles"
                      : categories.find((c) => c.slug === activeCategory)?.name ?? "Articles"}
                  </h2>
                  <span className="text-xs text-ink-secondary">
                    {loading ? "Loading…" : `${filteredPosts.length} article${filteredPosts.length !== 1 ? "s" : ""}`}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                  {visiblePosts.map((post, i) => (
                    <ArticleCard key={post.id} post={post} index={i} />
                  ))}
                </div>

                {!loading && visibleCount < filteredPosts.length && (
                  <div className="text-center">
                    <button
                      onClick={() => setVisibleCount((v) => v + 6)}
                      className="inline-flex items-center gap-2 rounded-full border border-hairline-dark px-6 py-3 text-sm font-medium text-ink-secondary hover:bg-mauve/5 hover:text-ink transition-colors"
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

              {/* Search — wired to live filter */}
              <div className="rounded-2xl border border-hairline-dark bg-surface-card p-5">
                <h3 className="text-sm font-bold text-ink mb-4">Search Articles</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(6); }}
                    placeholder="Search tips, guides, inspiration..."
                    className="w-full rounded-xl border border-hairline-dark bg-mauve/5 pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 focus:border-transparent"
                  />
                </div>
                {searchQuery && (
                  <p className="text-xs text-ink-secondary mt-2">
                    {filteredPosts.length} result{filteredPosts.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
                  </p>
                )}
              </div>

              {/* Popular Topics — counts derived from loaded posts */}
              <div className="rounded-2xl border border-hairline-dark bg-surface-card p-5">
                <h3 className="text-sm font-bold text-ink mb-4">Popular Topics</h3>
                {loading ? (
                  <ul className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded bg-ink/5" />
                          <div className="h-3 w-28 rounded bg-ink/5" />
                        </div>
                        <div className="h-3 w-14 rounded bg-ink/5" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-3">
                    {categories
                      .map((cat) => ({ ...cat, liveCount: getCount(cat.slug) }))
                      .sort((a, b) => b.liveCount - a.liveCount)
                      .slice(0, 5)
                      .map((cat) => (
                        <li key={cat.slug}>
                          <button
                            onClick={() => { setActiveCategory(cat.slug); setVisibleCount(6); setSearchQuery(""); }}
                            className="flex items-center justify-between group w-full text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{cat.emoji}</span>
                              <span className="text-xs font-medium text-ink-secondary group-hover:text-mauve transition-colors">
                                {cat.name}
                              </span>
                            </div>
                            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                              cat.liveCount > 0 ? "bg-mauve/15 text-mauve" : "text-ink-tertiary"
                            }`}>
                              {cat.liveCount} article{cat.liveCount !== 1 ? "s" : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Newsletter */}
              <div className="rounded-2xl border border-mauve/20 bg-gradient-to-br from-mauve/10 to-mauve-strong/5 p-5">
                <h3 className="text-sm font-bold text-ink mb-1">Stay inspired, always</h3>
                <p className="text-xs text-ink-secondary mb-4">
                  Get the latest tips, guides, and product updates straight to your inbox.
                </p>
                <NewsletterSignup />
              </div>

              {/* Trending — live from DB is_trending flag */}
              <div className="rounded-2xl border border-hairline-dark bg-surface-card p-5">
                <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-mauve" />
                  Trending Articles
                </h3>
                <div>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-3 py-3 border-b border-hairline-dark last:border-0 animate-pulse">
                        <div className="h-6 w-6 rounded-lg bg-ink/5 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-ink/5 rounded w-full" />
                          <div className="h-2.5 bg-ink/5 rounded w-1/2" />
                        </div>
                      </div>
                    ))
                  ) : trending.length > 0 ? (
                    trending.map((post, i) => (
                      <TrendingItem key={post.id} post={post} rank={i + 1} />
                    ))
                  ) : (
                    <p className="text-xs text-ink-secondary py-3">No trending articles yet.</p>
                  )}
                </div>
                {!loading && trending.length > 0 && (
                  <button
                    onClick={() => { setActiveCategory("all"); setSearchQuery(""); setVisibleCount(6); }}
                    className="mt-4 inline-flex items-center gap-1 text-xs text-mauve font-semibold hover:underline"
                  >
                    View all articles <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

            </aside>
          </div>
        </section>

        {/* ── CTA BANNER ───────────────────────────────────── */}
        <section className="bg-gradient-to-r from-surface-card to-surface-card-elevated py-16 border-y border-hairline-dark">
          <div className="container mx-auto max-w-7xl px-6">
            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <p className="text-xs font-semibold text-mauve uppercase tracking-widest mb-2">
                  FOR PHOTOGRAPHERS & PLANNERS
                </p>
                <h2 className={`text-2xl md:text-3xl font-light text-ink mb-3 ${playfair.className}`}>
                  Grow your business with <span className="italic text-mauve">Snapsy</span>
                </h2>
                <p className="text-ink-secondary text-sm">
                  Create stunning galleries, delight your clients, and collect more moments effortlessly.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup">
                  <Button className="rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] px-6 font-semibold transition-all shadow-lg shadow-mauve/10">
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
