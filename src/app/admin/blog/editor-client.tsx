"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Save,
  Eye,
  Wand2,
  Image as ImageIcon,
  Tag,
  Settings2,
  Star,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  X,
  Settings
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import type { BlogCategory, BlogAuthor, BlogPost } from "@/lib/types/blog"

const CONTENT_BLOCKS = [
  "## Heading 2",
  "### Heading 3",
  "A paragraph of text.",
  "> A blockquote",
  "- List item 1\n- List item 2\n- List item 3",
  "**Bold text** and *italic text*",
  "| Column 1 | Column 2 |\n|---|---|\n| Value | Value |",
]

type SaveState = "idle" | "saving" | "saved" | "error"

export default function AdminBlogEditorPage({ postId }: { postId?: string }) {
  const router = useRouter()
  const isEditing = !!postId

  // Form state
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [status, setStatus] = useState("draft")
  const [categoryId, setCategoryId] = useState("")
  const [authorId, setAuthorId] = useState("")
  const [isFeatured, setIsFeatured] = useState(false)
  const [isTrending, setIsTrending] = useState(false)
  const [readTime, setReadTime] = useState("5")
  const [coverImageUrl, setCoverImageUrl] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDesc, setSeoDesc] = useState("")
  const [seoOpen, setSeoOpen] = useState(false)

  // Async state
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [aiLoading, setAiLoading] = useState(false)
  const [loadingPost, setLoadingPost] = useState(isEditing)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [authors, setAuthors] = useState<BlogAuthor[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Cover image uploading state
  const [uploadingImage, setUploadingImage] = useState(false)

  // Inline Category modal states
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatSlug, setNewCatSlug] = useState("")
  const [newCatEmoji, setNewCatEmoji] = useState("📝")
  const [newCatColor, setNewCatColor] = useState("#7c3aed")
  const [newCatDesc, setNewCatDesc] = useState("")
  const [newCatLoading, setNewCatLoading] = useState(false)

  // Inline Author modal states
  const [showNewAuthorModal, setShowNewAuthorModal] = useState(false)
  const [newAuthName, setNewAuthName] = useState("")
  const [newAuthSlug, setNewAuthSlug] = useState("")
  const [newAuthBio, setNewAuthBio] = useState("")
  const [newAuthAvatar, setNewAuthAvatar] = useState("")
  const [newAuthLoading, setNewAuthLoading] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setErrorMsg(null)

    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/blog/upload", {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(errBody.error || "Upload failed")
      }
      const json = await res.json()
      setCoverImageUrl(json.data?.url || json.url)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCatNameChange = (name: string) => {
    setNewCatName(name)
    setNewCatSlug(autoSlug(name))
  }

  const handleAuthNameChange = (name: string) => {
    setNewAuthName(name)
    setNewAuthSlug(autoSlug(name))
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName || !newCatSlug) return
    setNewCatLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName,
          slug: newCatSlug,
          emoji: newCatEmoji,
          color: newCatColor,
          description: newCatDesc || null
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create category")
      
      const created = json.category
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryId(created.id)
      setShowNewCategoryModal(false)
      setNewCatName("")
      setNewCatSlug("")
      setNewCatEmoji("📝")
      setNewCatColor("#7c3aed")
      setNewCatDesc("")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create category")
    } finally {
      setNewCatLoading(false)
    }
  }

  const handleCreateAuthor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAuthName || !newAuthSlug) return
    setNewAuthLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/blog/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAuthName,
          slug: newAuthSlug,
          bio: newAuthBio || null,
          avatar_url: newAuthAvatar || null
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create author")
      
      const created = json.author
      setAuthors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setAuthorId(created.id)
      setShowNewAuthorModal(false)
      setNewAuthName("")
      setNewAuthSlug("")
      setNewAuthBio("")
      setNewAuthAvatar("")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create author")
    } finally {
      setNewAuthLoading(false)
    }
  }

  const autoSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!isEditing) setSlug(autoSlug(v))
    if (!seoTitle) setSeoTitle(v)
  }

  // Load categories & authors
  const fetchMeta = useCallback(async () => {
    const [catRes, authRes] = await Promise.all([
      fetch("/api/blog/categories"),
      fetch("/api/blog/authors"),
    ])
    const catJson = await catRes.json()
    const authJson = await authRes.json()
    setCategories(catJson.categories ?? [])
    setAuthors(authJson.authors ?? [])
  }, [])

  // Load existing post when editing
  const loadPost = useCallback(async () => {
    if (!postId) return
    setLoadingPost(true)
    try {
      const res = await fetch(`/api/blog/posts/${postId}`)
      if (!res.ok) throw new Error("Post not found")
      const json = await res.json()
      const p: BlogPost = json.post
      setTitle(p.title)
      setSlug(p.slug)
      setExcerpt(p.excerpt ?? "")
      setContent(p.content ?? "")
      setStatus(p.status)
      setCategoryId(p.category?.id ?? "")
      setAuthorId(p.author?.id ?? "")
      setIsFeatured(p.is_featured ?? false)
      setIsTrending(p.is_trending ?? false)
      setReadTime(String(p.read_time_minutes ?? 5))
      setCoverImageUrl(p.cover_image_url ?? "")
      setSeoTitle(p.seo_title ?? "")
      setSeoDesc(p.seo_description ?? "")
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to load post")
    } finally {
      setLoadingPost(false)
    }
  }, [postId])

  useEffect(() => {
    fetchMeta()
    if (isEditing) loadPost()
  }, [fetchMeta, loadPost, isEditing])

  const handleAiAssist = async (type: string) => {
    if (!title) return
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai/blog-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, excerpt }),
      })
      const data = await res.json()
      if (data.result) {
        if (type === "seo_title") setSeoTitle(data.result)
        if (type === "seo_description") setSeoDesc(data.result)
        if (type === "excerpt") setExcerpt(data.result)
        if (type === "outline") setContent((prev) => prev + "\n\n" + data.result)
      }
    } catch (_) {}
    setAiLoading(false)
  }

  const handleSave = async () => {
    if (!title || !slug) {
      setErrorMsg("Title and slug are required")
      return
    }
    setSaveState("saving")
    setErrorMsg(null)

    const payload = {
      title, slug, excerpt, content,
      cover_image_url: coverImageUrl || null,
      status,
      category_id: categoryId || null,
      author_id: authorId || null,
      is_featured: isFeatured,
      is_trending: isTrending,
      read_time_minutes: parseInt(readTime, 10),
      seo_title: seoTitle || null,
      seo_description: seoDesc || null,
    }

    try {
      let res: Response
      if (isEditing) {
        res = await fetch(`/api/blog/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/blog/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Save failed")

      setSaveState("saved")
      // If creating new, redirect to edit page with the new ID
      if (!isEditing && json.post?.id) {
        router.push(`/admin/blog/edit/${json.post.id}`)
      }
      setTimeout(() => setSaveState("idle"), 3000)
    } catch (e: unknown) {
      setSaveState("error")
      setErrorMsg(e instanceof Error ? e.message : "Save failed")
      setTimeout(() => setSaveState("idle"), 3000)
    }
  }

  const handleDelete = async () => {
    if (!postId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/blog/posts/${postId}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Delete failed")
      }
      router.push("/admin/blog")
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Delete failed")
      setDeleteLoading(false)
      setDeleteConfirm(false)
    }
  }

  if (loadingPost) {
    return (
      <div className="min-h-screen bg-white/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-mauve mx-auto mb-3" />
          <p className="text-sm text-white/50">Loading article…</p>
        </div>
      </div>
    )
  }

  const saveBtnClass = {
    idle: status === "published" ? "bg-mauve text-[#141110] hover:bg-mauve-strong" : "bg-surface-dark text-white hover:bg-surface-card-elevated",
    saving: "bg-white/40 text-white cursor-not-allowed",
    saved: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
  }[saveState]

  const saveBtnLabel = {
    idle: status === "published" ? "Publish Article" : "Save as Draft",
    saving: "Saving…",
    saved: "Saved!",
    error: "Failed – Retry",
  }[saveState]

  return (
    <div className="min-h-screen bg-white/5">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-surface-card border-b border-hairline-dark px-6 py-3 flex items-center gap-4">
        <Link href="/admin/blog">
          <button className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </button>
        </Link>
        <div className="flex-1 truncate">
          <span className="text-sm text-white/40">{title || "Untitled Article"}</span>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <>
              <Link href={`/blog/${slug}`} target="_blank">
                <button className="flex items-center gap-1.5 text-xs text-white/50 hover:text-mauve transition-colors border border-hairline-dark rounded-lg px-3 py-2">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
              </Link>
              {deleteConfirm ? (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-red-400 font-medium">Confirm delete?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="text-xs font-bold text-red-400 hover:text-red-800"
                  >
                    {deleteLoading ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button onClick={() => setDeleteConfirm(false)} className="text-xs text-white/50 hover:text-white/70">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-400 border border-red-500/20 hover:border-red-300 rounded-lg px-3 py-2 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </>
          )}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-hairline-dark px-3 py-2 text-xs text-white/70 focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-surface-card"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
          <Button
            onClick={handleSave}
            disabled={saveState === "saving"}
            className={`rounded-xl gap-2 text-sm px-5 transition-all ${saveBtnClass}`}
          >
            {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saveBtnLabel}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-400">
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      )}

      {saveState === "saved" && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <p className="text-sm text-emerald-400 font-medium">Article saved successfully</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">

          {/* Main editor */}
          <div className="space-y-5">
            {/* Title */}
            <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm p-6">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article title..."
                className="w-full text-2xl font-bold text-white placeholder:text-white/30 border-none outline-none resize-none bg-transparent"
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-white/40">Slug:</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="text-xs text-mauve border-none outline-none bg-transparent flex-1 font-mono"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Excerpt / Summary</label>
                <button
                  onClick={() => handleAiAssist("excerpt")}
                  disabled={aiLoading || !title}
                  className="flex items-center gap-1 text-xs text-mauve font-semibold hover:text-mauve disabled:opacity-40"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {aiLoading ? "Generating…" : "AI Generate"}
                </button>
              </div>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A brief description of the article..."
                rows={3}
                className="w-full text-sm text-white/70 placeholder:text-white/30 border-none outline-none resize-none bg-transparent leading-relaxed"
              />
            </div>

            {/* Content editor */}
            <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Content (Markdown)</label>
                <button
                  onClick={() => handleAiAssist("outline")}
                  disabled={aiLoading || !title}
                  className="flex items-center gap-1 text-xs text-mauve font-semibold hover:text-mauve disabled:opacity-40"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {aiLoading ? "Generating…" : "Generate Outline"}
                </button>
              </div>

              {/* Quick insert blocks */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-hairline-dark">
                {["H2", "H3", "Quote", "List", "Bold", "Table"].map((block, i) => (
                  <button
                    key={block}
                    onClick={() => setContent((prev) => prev + "\n\n" + CONTENT_BLOCKS[i])}
                    className="rounded-lg border border-hairline-dark px-3 py-1.5 text-xs text-white/60 hover:border-mauve/30 hover:text-mauve hover:bg-mauve/10 transition-colors font-medium"
                  >
                    {block}
                  </button>
                ))}
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"Write your article content here using Markdown...\n\n## Heading\n\nParagraph text...\n\n- List item"}
                rows={28}
                className="w-full text-sm text-white/70 placeholder:text-white/30 border border-hairline-dark rounded-xl p-4 outline-none resize-none bg-white/5 leading-relaxed focus:ring-2 focus:ring-mauve/20 font-mono"
              />
              <p className="text-xs text-white/40 mt-2">{content.length} characters · {content.split(/\s+/).filter(Boolean).length} words</p>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">

            {/* AI Assistant */}
            <div className="bg-gradient-to-br from-mauve/10 to-fuchsia-50 rounded-2xl border border-mauve/20 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-mauve" />
                AI Content Assistant
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Generate SEO Title", type: "seo_title" },
                  { label: "Generate Meta Description", type: "seo_description" },
                  { label: "Generate Excerpt", type: "excerpt" },
                  { label: "Generate Article Outline", type: "outline" },
                ].map(({ label, type }) => (
                  <button
                    key={type}
                    onClick={() => handleAiAssist(type)}
                    disabled={aiLoading || !title}
                    className="w-full text-left rounded-xl bg-surface-card border border-mauve/20 px-3 py-2.5 text-xs text-white/70 hover:border-mauve/30 hover:bg-mauve/10 transition-colors disabled:opacity-40 font-medium"
                  >
                    {aiLoading ? "Generating…" : label}
                  </button>
                ))}
              </div>
            </div>

            {/* Article Settings */}
            <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm p-5">
              <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-white/50" />
                Article Settings
              </h3>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1.5">Category</label>
                  <div className="flex gap-2">
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="flex-1 rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-surface-card min-w-0"
                    >
                      <option value="">Select category…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryModal(true)}
                      className="rounded-xl border border-hairline-dark p-2.5 text-white/50 hover:text-mauve hover:border-mauve/30 transition-colors shrink-0"
                      title="Add category"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Author */}
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1.5">Author</label>
                  <div className="flex gap-2">
                    <select
                      value={authorId}
                      onChange={(e) => setAuthorId(e.target.value)}
                      className="flex-1 rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-surface-card min-w-0"
                    >
                      <option value="">Select author…</option>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewAuthorModal(true)}
                      className="rounded-xl border border-hairline-dark p-2.5 text-white/50 hover:text-mauve hover:border-mauve/30 transition-colors shrink-0"
                      title="Add author"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Read time */}
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1.5">Read Time (minutes)</label>
                  <input
                    type="number"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    min="1" max="60"
                    className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-mauve/30"
                  />
                </div>

                {/* Cover image URL */}
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1.5">Cover Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-mauve/30 min-w-0"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      id="cover-image-file-input"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById("cover-image-file-input")?.click()}
                      disabled={uploadingImage}
                      className="rounded-xl border border-hairline-dark p-2.5 text-white/50 hover:text-mauve hover:border-mauve/30 transition-colors shrink-0 disabled:opacity-40 flex items-center justify-center"
                      title="Upload file"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin text-mauve" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {coverImageUrl && (
                    <img src={coverImageUrl} alt="Cover preview" className="mt-2 rounded-xl h-24 w-full object-cover border border-hairline-dark" />
                  )}
                </div>

                {/* Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-hairline-dark">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="h-4 w-4 rounded border-hairline-dark text-mauve focus:ring-mauve/30"
                    />
                    <span className="text-xs font-medium text-white/70 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500" /> Featured article
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTrending}
                      onChange={(e) => setIsTrending(e.target.checked)}
                      className="h-4 w-4 rounded border-hairline-dark text-mauve focus:ring-mauve/30"
                    />
                    <span className="text-xs font-medium text-white/70 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-mauve" /> Trending
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Tags placeholder */}
            <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm p-5">
              <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-white/50" />
                Tags
              </h3>
              <p className="text-xs text-white/40">Tag management coming soon — tags are stored with the post.</p>
            </div>

            {/* SEO Settings */}
            <div className="bg-surface-card rounded-2xl border border-hairline-dark shadow-sm overflow-hidden">
              <button
                onClick={() => setSeoOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
              >
                <h3 className="text-sm font-bold text-white/80">SEO Settings</h3>
                {seoOpen ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
              </button>

              {seoOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-5 pb-5 space-y-4 border-t border-hairline-dark"
                >
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-white/60">SEO Title</label>
                      <button onClick={() => handleAiAssist("seo_title")} disabled={aiLoading || !title} className="text-[10px] text-mauve font-semibold hover:text-mauve disabled:opacity-40">
                        AI Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="SEO optimised title..."
                      maxLength={70}
                      className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-mauve/30"
                    />
                    <p className={`text-[10px] mt-1 ${seoTitle.length > 60 ? "text-amber-500" : "text-white/40"}`}>
                      {seoTitle.length}/70 characters
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-white/60">Meta Description</label>
                      <button onClick={() => handleAiAssist("seo_description")} disabled={aiLoading || !title} className="text-[10px] text-mauve font-semibold hover:text-mauve disabled:opacity-40">
                        AI Generate
                      </button>
                    </div>
                    <textarea
                      value={seoDesc}
                      onChange={(e) => setSeoDesc(e.target.value)}
                      placeholder="Meta description for search engines..."
                      maxLength={165}
                      rows={3}
                      className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-mauve/30 resize-none"
                    />
                    <p className={`text-[10px] mt-1 ${seoDesc.length > 155 ? "text-amber-500" : "text-white/40"}`}>
                      {seoDesc.length}/165 characters
                    </p>
                  </div>

                  {/* SERP Preview */}
                  {(seoTitle || title) && (
                    <div className="rounded-xl border border-hairline-dark bg-white/5 p-3">
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">SERP Preview</p>
                      <p className="text-sm text-mauve font-medium truncate">{seoTitle || title} | Snapsy Blog</p>
                      <p className="text-[10px] text-emerald-400">snapsy.app/blog/{slug || "your-article-slug"}</p>
                      <p className="text-xs text-white/50 mt-1 line-clamp-2 leading-relaxed">{seoDesc || excerpt}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Publish */}
            <Button
              onClick={handleSave}
              disabled={saveState === "saving"}
              className={`w-full rounded-xl py-3 text-sm font-semibold gap-2 transition-all ${saveBtnClass}`}
            >
              {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saveBtnLabel}
            </Button>
          </div>
        </div>
      </div>

      {/* Category Creation Modal */}
      <AnimatePresence>
        {showNewCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewCategoryModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface-card rounded-2xl shadow-xl p-6 max-w-md w-full z-10"
            >
              <button onClick={() => setShowNewCategoryModal(false)} className="absolute top-4 right-4 text-white/40 hover:text-white/60">
                <X className="h-5 w-5" />
              </button>
              <h3 className="font-bold text-white text-lg mb-4">Add New Category</h3>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => handleCatNameChange(e.target.value)}
                    placeholder="e.g. Technology"
                    className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-surface-card"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    placeholder="technology"
                    className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/80 font-mono focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-surface-card"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-white/60 block mb-1">Emoji</label>
                    <input
                      type="text"
                      value={newCatEmoji}
                      onChange={(e) => setNewCatEmoji(e.target.value)}
                      placeholder="📝"
                      className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-surface-card"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/60 block mb-1">Color</label>
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-full h-[38px] p-1 rounded-xl border border-hairline-dark cursor-pointer focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1">Description</label>
                  <textarea
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Brief description of the category..."
                    rows={2}
                    className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-mauve/30 resize-none bg-surface-card"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryModal(false)}
                    className="flex-1 rounded-xl border border-hairline-dark px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={newCatLoading}
                    className="flex-1 rounded-xl bg-mauve px-4 py-2.5 text-sm font-semibold text-[#141110] hover:bg-mauve-strong transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {newCatLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Author Creation Modal */}
      <AnimatePresence>
        {showNewAuthorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewAuthorModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface-card rounded-2xl shadow-xl p-6 max-w-md w-full z-10"
            >
              <button onClick={() => setShowNewAuthorModal(false)} className="absolute top-4 right-4 text-white/40 hover:text-white/60">
                <X className="h-5 w-5" />
              </button>
              <h3 className="font-bold text-white text-lg mb-4">Add New Author</h3>
              <form onSubmit={handleCreateAuthor} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1">Author Name *</label>
                  <input
                    type="text"
                    required
                    value={newAuthName}
                    onChange={(e) => handleAuthNameChange(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-surface-card"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={newAuthSlug}
                    onChange={(e) => setNewAuthSlug(e.target.value)}
                    placeholder="jane-doe"
                    className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/80 font-mono focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-surface-card"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1">Avatar URL</label>
                  <input
                    type="url"
                    value={newAuthAvatar}
                    onChange={(e) => setNewAuthAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-mauve/30 bg-surface-card"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-1">Bio</label>
                  <textarea
                    value={newAuthBio}
                    onChange={(e) => setNewAuthBio(e.target.value)}
                    placeholder="Author biography..."
                    rows={2}
                    className="w-full rounded-xl border border-hairline-dark px-3 py-2.5 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-mauve/30 resize-none bg-surface-card"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewAuthorModal(false)}
                    className="flex-1 rounded-xl border border-hairline-dark px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={newAuthLoading}
                    className="flex-1 rounded-xl bg-mauve px-4 py-2.5 text-sm font-semibold text-[#141110] hover:bg-mauve-strong transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {newAuthLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
