"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  BookOpen,
  TrendingUp,
  Users,
  Star,
  Clock,
  ArrowRight,
  Tag,
  Filter,
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/lib/blog/data"

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-amber-100 text-amber-700",
  archived: "bg-red-100 text-red-600",
}

export default function AdminBlogPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = BLOG_POSTS.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const published = BLOG_POSTS.filter((p) => p.status === "published").length
  const drafts = BLOG_POSTS.filter((p) => p.status === "draft").length
  const totalViews = BLOG_POSTS.reduce((sum, p) => sum + (p.view_count ?? 0), 0)
  const featured = BLOG_POSTS.filter((p) => p.is_featured).length

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Blog Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manage articles, categories, and your content strategy.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/blog" target="_blank">
              <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 gap-2">
                <Eye className="h-4 w-4" /> View Blog
              </Button>
            </Link>
            <Link href="/admin/blog/new">
              <Button className="rounded-xl bg-violet-600 text-white hover:bg-violet-700 gap-2">
                <Plus className="h-4 w-4" /> New Article
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: FileText, label: "Published", value: published, color: "text-green-600", bg: "bg-green-50" },
            { icon: BookOpen, label: "Drafts", value: drafts, color: "text-slate-600", bg: "bg-slate-100" },
            { icon: TrendingUp, label: "Total Views", value: totalViews.toLocaleString(), color: "text-violet-600", bg: "bg-violet-50" },
            { icon: Star, label: "Featured", value: featured, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
            >
              <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {["all", "published", "draft", "scheduled", "archived"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold capitalize transition-all ${
                  statusFilter === s
                    ? "bg-slate-950 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Articles table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {filtered.length} article{filtered.length !== 1 ? "s" : ""}
            </h2>
            <span className="text-xs text-slate-400">Click to edit</span>
          </div>

          <div className="divide-y divide-slate-50">
            {filtered.map((post) => (
              <div key={post.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
                {/* Cover thumbnail */}
                <div className="h-14 w-20 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <Link href={`/admin/blog/edit/${post.id}`} className="text-sm font-semibold text-slate-900 hover:text-violet-700 transition-colors line-clamp-1">
                      {post.title}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColors[post.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {post.status}
                    </span>
                    {post.is_featured && (
                      <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                        <Star className="h-2.5 w-2.5" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {post.category && (
                      <span className="text-[10px] font-semibold" style={{ color: post.category.color ?? "#7c3aed" }}>
                        {post.category.emoji} {post.category.name}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {post.view_count?.toLocaleString()} views
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {post.read_time_minutes} min
                    </span>
                    {post.published_at && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(post.published_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">by {post.author?.name}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/blog/${post.slug}`} target="_blank">
                    <button className="p-2 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                  </Link>
                  <Link href={`/admin/blog/edit/${post.id}`}>
                    <button className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </Link>
                  <button className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="py-20 text-center">
                <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No articles found</p>
                <Link href="/admin/blog/new" className="mt-3 inline-flex items-center gap-1 text-xs text-violet-600 font-semibold hover:text-violet-700">
                  Create your first article <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Category overview */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Tag className="h-4 w-4 text-violet-500" />
              Categories
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {BLOG_CATEGORIES.map((cat) => (
              <div
                key={cat.slug}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:border-slate-200 transition-colors"
              >
                <span className="text-xl">{cat.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{cat.name}</p>
                  <p className="text-[10px] text-slate-400">{cat.post_count} posts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
