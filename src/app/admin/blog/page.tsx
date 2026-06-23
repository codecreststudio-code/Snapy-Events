"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  BookOpen,
  TrendingUp,
  Star,
  Clock,
  ArrowRight,
  Tag,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Users,
  UserCheck,
  UserX,
  Mail,
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import type { BlogPost, BlogCategory } from "@/lib/types/blog"

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-amber-100 text-amber-700",
  archived: "bg-red-100 text-red-600",
}

interface DeleteDialogProps {
  post: BlogPost
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function DeleteDialog({ post, onConfirm, onCancel, loading }: DeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
      >
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Delete Article</h3>
            <p className="text-xs text-slate-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-6">
          Are you sure you want to delete <span className="font-semibold">&quot;{post.title}&quot;</span>? This will permanently remove the article from your blog.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Delete Article"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminBlogPage() {
  const [activeTab, setActiveTab] = useState<"posts" | "subscribers">("posts")
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const [total, setTotal] = useState(0)

  // Subscribers state
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [subscribersLoading, setSubscribersLoading] = useState(false)
  const [subscribersError, setSubscribersError] = useState<string | null>(null)
  const [subscribersSearch, setSubscribersSearch] = useState("")
  const [subscribersStatusFilter, setSubscribersStatusFilter] = useState("all")
  const [subscribingActionLoading, setSubscribingActionLoading] = useState<string | null>(null)

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)
      params.set("limit", "100")

      const res = await fetch(`/api/blog/posts?${params}`)
      if (!res.ok) throw new Error("Failed to load posts")
      const json = await res.json()
      setPosts(json.posts ?? [])
      setTotal(json.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/blog/categories")
      const json = await res.json()
      setCategories(json.categories ?? [])
    } catch (_) {}
  }, [])

  const fetchSubscribers = useCallback(async () => {
    setSubscribersLoading(true)
    setSubscribersError(null)
    try {
      const res = await fetch("/api/blog/subscribe")
      if (!res.ok) throw new Error("Failed to load subscribers")
      const json = await res.json()
      setSubscribers(json.subscribers ?? [])
    } catch (e: unknown) {
      setSubscribersError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setSubscribersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/blog/posts/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Delete failed")
      }
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
      showToast("success", `"${deleteTarget.title}" has been deleted.`)
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Delete failed")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: "active" | "unsubscribed" | "bounced") => {
    setSubscribingActionLoading(id)
    try {
      const res = await fetch(`/api/blog/subscribe/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Update failed")
      }
      setSubscribers((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, status: newStatus, unsubscribed_at: newStatus === "unsubscribed" ? new Date().toISOString() : null } : sub))
      )
      showToast("success", `Subscriber status updated to ${newStatus}`)
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Update failed")
    } finally {
      setSubscribingActionLoading(null)
    }
  }

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) return
    setSubscribingActionLoading(id)
    try {
      const res = await fetch(`/api/blog/subscribe/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Delete failed")
      }
      setSubscribers((prev) => prev.filter((sub) => sub.id !== id))
      showToast("success", `Subscriber ${email} deleted successfully.`)
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Delete failed")
    } finally {
      setSubscribingActionLoading(null)
    }
  }

  const published = posts.filter((p) => p.status === "published").length
  const drafts = posts.filter((p) => p.status === "draft").length
  const totalViews = posts.reduce((sum, p) => sum + (p.view_count ?? 0), 0)
  const featured = posts.filter((p) => p.is_featured).length

  // Filter subscribers
  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesSearch =
      sub.email.toLowerCase().includes(subscribersSearch.toLowerCase()) ||
      (sub.name && sub.name.toLowerCase().includes(subscribersSearch.toLowerCase()))
    const matchesStatus =
      subscribersStatusFilter === "all" || sub.status === subscribersStatusFilter
    return matchesSearch && matchesStatus
  })

  const activeSubs = subscribers.filter((s) => s.status === "active").length
  const unsubscribedSubs = subscribers.filter((s) => s.status === "unsubscribed").length
  const bouncedSubs = subscribers.filter((s) => s.status === "bounced").length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Delete Dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            post={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-6 left-1/2 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Blog Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === "posts"
                ? (loading ? "Loading…" : `${total} total articles · connected to live database`)
                : (subscribersLoading ? "Loading…" : `${subscribers.length} total subscribers · connected to live database`)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={activeTab === "posts" ? fetchPosts : fetchSubscribers}
              disabled={activeTab === "posts" ? loading : subscribersLoading}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-violet-600 hover:border-violet-300 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${(activeTab === "posts" ? loading : subscribersLoading) ? "animate-spin" : ""}`} />
            </button>
            <Link href="/blog" target="_blank">
              <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 gap-2">
                <Eye className="h-4 w-4" /> View Blog
              </Button>
            </Link>
            {activeTab === "posts" && (
              <Link href="/admin/blog/new">
                <Button className="rounded-xl bg-violet-600 text-white hover:bg-violet-700 gap-2">
                  <Plus className="h-4 w-4" /> New Article
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 mb-8">
          <button
            onClick={() => setActiveTab("posts")}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "posts"
                ? "border-violet-600 text-violet-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Articles
          </button>
          <button
            onClick={() => setActiveTab("subscribers")}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "subscribers"
                ? "border-violet-600 text-violet-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Newsletter Subscribers ({subscribersLoading ? "—" : subscribers.length})
          </button>
        </div>

        {/* Stats */}
        {activeTab === "posts" ? (
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
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-2xl font-extrabold text-slate-900">{loading ? "—" : value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Users, label: "Total Subscribers", value: subscribers.length, color: "text-violet-600", bg: "bg-violet-50" },
              { icon: UserCheck, label: "Active", value: activeSubs, color: "text-green-600", bg: "bg-green-50" },
              { icon: UserX, label: "Unsubscribed", value: unsubscribedSubs, color: "text-slate-600", bg: "bg-slate-100" },
              { icon: AlertCircle, label: "Bounced", value: bouncedSubs, color: "text-red-600", bg: "bg-red-50" },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
              >
                <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-2xl font-extrabold text-slate-900">{subscribersLoading ? "—" : value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === "posts" ? (
          <>
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
              <div className="flex gap-2 flex-wrap">
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

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Failed to load articles</p>
                  <p className="text-xs text-red-500">{error}</p>
                </div>
                <button
                  onClick={fetchPosts}
                  className="ml-auto text-xs text-red-600 font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Articles table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">
                  {loading ? "Loading…" : `${posts.length} article${posts.length !== 1 ? "s" : ""}`}
                </h2>
                <span className="text-xs text-slate-400">Live data from database</span>
              </div>

              {loading ? (
                <div className="divide-y divide-slate-50">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-4 px-6 py-4 animate-pulse">
                      <div className="h-14 w-20 rounded-lg bg-slate-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {posts.map((post) => (
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
                            <Eye className="h-3 w-3" /> {(post.view_count ?? 0).toLocaleString()} views
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {post.read_time_minutes} min
                          </span>
                          {post.published_at && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(post.published_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">by {post.author?.name ?? "Unknown"}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/blog/${post.slug}`} target="_blank">
                          <button className="p-2 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors" title="View live">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        <Link href={`/admin/blog/edit/${post.id}`}>
                          <button className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(post)}
                          className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!loading && posts.length === 0 && (
                    <div className="py-20 text-center">
                      <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">No articles found</p>
                      <Link href="/admin/blog/new" className="mt-3 inline-flex items-center gap-1 text-xs text-violet-600 font-semibold hover:text-violet-700">
                        Create your first article <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category overview */}
            {categories.length > 0 && (
              <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-violet-500" />
                    Categories
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {categories.map((cat) => (
                    <div
                      key={cat.slug}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:border-slate-200 transition-colors"
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{cat.name}</p>
                        <p className="text-[10px] text-slate-400">{cat.post_count ?? 0} posts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Subscribers Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search subscribers by email or name..."
                  value={subscribersSearch}
                  onChange={(e) => setSubscribersSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {["all", "active", "unsubscribed", "bounced"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSubscribersStatusFilter(s)}
                    className={`rounded-xl px-4 py-2.5 text-xs font-semibold capitalize transition-all ${
                      subscribersStatusFilter === s
                        ? "bg-slate-950 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Subscribers Error State */}
            {subscribersError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Failed to load subscribers</p>
                  <p className="text-xs text-red-500">{subscribersError}</p>
                </div>
                <button
                  onClick={fetchSubscribers}
                  className="ml-auto text-xs text-red-600 font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Subscribers list */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">
                  {subscribersLoading ? "Loading…" : `${filteredSubscribers.length} subscriber${filteredSubscribers.length !== 1 ? "s" : ""}`}
                </h2>
                <span className="text-xs text-slate-400">Live subscriber database</span>
              </div>

              {subscribersLoading ? (
                <div className="divide-y divide-slate-50">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-4 px-6 py-4 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-1/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredSubscribers.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                          <Mail className="h-4 w-4 text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={`mailto:${sub.email}`}
                              className="text-sm font-semibold text-slate-900 hover:text-violet-700 transition-colors truncate"
                            >
                              {sub.email}
                            </a>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              sub.status === "active"
                                ? "bg-green-100 text-green-700"
                                : sub.status === "unsubscribed"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-red-100 text-red-600"
                            }`}>
                              {sub.status}
                            </span>
                            <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                              {sub.source || "blog"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                            {sub.name && (
                              <span>Name: <strong className="text-slate-600 font-medium">{sub.name}</strong></span>
                            )}
                            <span>Joined: {new Date(sub.subscribed_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            {sub.unsubscribed_at && (
                              <span className="text-red-500">Unsubscribed: {new Date(sub.unsubscribed_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {sub.status === "active" ? (
                          <button
                            onClick={() => handleUpdateStatus(sub.id, "unsubscribed")}
                            disabled={subscribingActionLoading === sub.id}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Unsubscribe
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(sub.id, "active")}
                            disabled={subscribingActionLoading === sub.id}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold border border-green-200 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            Re-activate
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                          disabled={subscribingActionLoading === sub.id}
                          className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete Subscriber"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredSubscribers.length === 0 && (
                    <div className="py-20 text-center">
                      <Mail className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">No subscribers found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
