"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
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
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { BLOG_CATEGORIES, BLOG_TAGS, BLOG_AUTHORS } from "@/lib/blog/data"

const CONTENT_BLOCKS = [
  "## Heading 2",
  "### Heading 3",
  "A paragraph of text.",
  "> A blockquote",
  "- List item 1\n- List item 2\n- List item 3",
  "**Bold text** and *italic text*",
  "| Column 1 | Column 2 |\n|---|---|\n| Value | Value |",
]

export default function AdminBlogEditorPage() {
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
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDesc, setSeoDesc] = useState("")
  const [seoOpen, setSeoOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const autoSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

  const handleTitleChange = (v: string) => {
    setTitle(v)
    setSlug(autoSlug(v))
    if (!seoTitle) setSeoTitle(v)
  }

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
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    // In production, this would call POST /api/blog/posts
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <Link href="/admin/blog">
          <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </button>
        </Link>
        <div className="flex-1 truncate">
          <span className="text-sm text-slate-400">{title || "Untitled Article"}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
          <Button
            onClick={handleSave}
            className={`rounded-xl gap-2 text-sm px-5 transition-all ${saved ? "bg-green-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700"}`}
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">

          {/* Main editor */}
          <div className="space-y-5">
            {/* Title */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article title..."
                className="w-full text-2xl font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none resize-none bg-transparent"
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">Slug:</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="text-xs text-violet-600 border-none outline-none bg-transparent flex-1 font-mono"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Excerpt / Summary</label>
                <button
                  onClick={() => handleAiAssist("excerpt")}
                  disabled={aiLoading || !title}
                  className="flex items-center gap-1 text-xs text-violet-600 font-semibold hover:text-violet-700 disabled:opacity-40"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {aiLoading ? "Generating…" : "AI Generate"}
                </button>
              </div>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A brief description of the article (shown in cards and search results)..."
                rows={3}
                className="w-full text-sm text-slate-700 placeholder:text-slate-300 border-none outline-none resize-none bg-transparent leading-relaxed"
              />
            </div>

            {/* Content editor */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Content</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAiAssist("outline")}
                    disabled={aiLoading || !title}
                    className="flex items-center gap-1 text-xs text-violet-600 font-semibold hover:text-violet-700 disabled:opacity-40"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {aiLoading ? "Generating…" : "Generate Outline"}
                  </button>
                </div>
              </div>

              {/* Quick insert blocks */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-100">
                {["H2", "H3", "Quote", "List", "Bold", "Table"].map((block, i) => (
                  <button
                    key={block}
                    onClick={() => setContent((prev) => prev + "\n\n" + CONTENT_BLOCKS[i])}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors font-medium"
                  >
                    {block}
                  </button>
                ))}
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article content here using Markdown...&#10;&#10;## Heading&#10;&#10;Paragraph text...&#10;&#10;- List item"
                rows={28}
                className="w-full text-sm text-slate-700 placeholder:text-slate-300 border border-slate-100 rounded-xl p-4 outline-none resize-none bg-slate-50/50 leading-relaxed focus:ring-2 focus:ring-violet-200 font-mono"
              />
              <p className="text-xs text-slate-400 mt-2">{content.length} characters · {content.split(/\s+/).filter(Boolean).length} words</p>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">

            {/* AI Assistant */}
            <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl border border-violet-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-violet-600" />
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
                    className="w-full text-left rounded-xl bg-white border border-violet-100 px-3 py-2.5 text-xs text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-colors disabled:opacity-40 font-medium"
                  >
                    {aiLoading ? "Generating…" : label}
                  </button>
                ))}
              </div>
            </div>

            {/* Article Settings */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-500" />
                Article Settings
              </h3>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  >
                    <option value="">Select category…</option>
                    {BLOG_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Author */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Author</label>
                  <select
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  >
                    <option value="">Select author…</option>
                    {BLOG_AUTHORS.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Read time */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Read Time (minutes)</label>
                  <input
                    type="number"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    min="1"
                    max="60"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>

                {/* Cover image URL */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Cover Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 min-w-0"
                    />
                    <button className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:text-violet-600 hover:border-violet-300 transition-colors">
                      <ImageIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-300"
                    />
                    <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500" /> Featured article
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isTrending}
                      onChange={(e) => setIsTrending(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-300"
                    />
                    <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-violet-500" /> Trending
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-500" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {BLOG_TAGS.map((tag) => (
                  <button
                    key={tag.id}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* SEO Settings */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setSeoOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <h3 className="text-sm font-bold text-slate-800">SEO Settings</h3>
                {seoOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>

              {seoOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-5 pb-5 space-y-4 border-t border-slate-100"
                >
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600">SEO Title</label>
                      <button
                        onClick={() => handleAiAssist("seo_title")}
                        disabled={aiLoading || !title}
                        className="text-[10px] text-violet-600 font-semibold hover:text-violet-700 disabled:opacity-40"
                      >
                        AI Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="SEO optimised title..."
                      maxLength={70}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                    <p className={`text-[10px] mt-1 ${seoTitle.length > 60 ? "text-amber-500" : "text-slate-400"}`}>
                      {seoTitle.length}/70 characters
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600">Meta Description</label>
                      <button
                        onClick={() => handleAiAssist("seo_description")}
                        disabled={aiLoading || !title}
                        className="text-[10px] text-violet-600 font-semibold hover:text-violet-700 disabled:opacity-40"
                      >
                        AI Generate
                      </button>
                    </div>
                    <textarea
                      value={seoDesc}
                      onChange={(e) => setSeoDesc(e.target.value)}
                      placeholder="Meta description for search engines..."
                      maxLength={165}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                    />
                    <p className={`text-[10px] mt-1 ${seoDesc.length > 155 ? "text-amber-500" : "text-slate-400"}`}>
                      {seoDesc.length}/165 characters
                    </p>
                  </div>

                  {/* SERP Preview */}
                  {(seoTitle || title) && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">SERP Preview</p>
                      <p className="text-sm text-blue-700 font-medium truncate">{seoTitle || title} | Snapsy Blog</p>
                      <p className="text-[10px] text-green-700">snapsy.app/blog/{slug || "your-article-slug"}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{seoDesc || excerpt}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Publish */}
            <Button
              onClick={handleSave}
              className={`w-full rounded-xl py-3 text-sm font-semibold gap-2 transition-all ${
                saved
                  ? "bg-green-600 text-white"
                  : status === "published"
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "bg-slate-950 text-white hover:bg-slate-800"
              }`}
            >
              <Save className="h-4 w-4" />
              {saved ? "Saved!" : status === "published" ? "Publish Article" : "Save as Draft"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
