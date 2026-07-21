import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Clock, ArrowRight, BookOpen } from "lucide-react"
import { Playfair_Display, Inter } from "next/font/google"
import type { BlogPost } from "@/lib/types/blog"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" })
const inter = Inter({ subsets: ["latin"], display: "swap" })

interface Props { params: Promise<{ category: string }> }

async function getCategory(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("slug", slug)
    .single()
  return data
}

async function getCategoryPosts(categoryId: string): Promise<BlogPost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("blog_posts")
    .select(`
      id, title, slug, excerpt, cover_image_url, read_time_minutes, published_at, status,
      author:blog_authors(id, name, slug, avatar_url),
      category:blog_categories(id, name, slug, emoji, color)
    `)
    .eq("category_id", categoryId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
  return (data as unknown as BlogPost[]) ?? []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const cat = await getCategory(category)
  if (!cat) return { title: "Category Not Found" }
  return {
    title: `${cat.name} Articles | Snapsy Blog`,
    description: cat.description ?? `Browse all ${cat.name} articles on the Snapsy Blog.`,
  }
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col rounded-2xl border border-hairline-dark bg-surface-card overflow-hidden hover:border-mauve/40 transition-all duration-300">
      <div className="aspect-video overflow-hidden bg-white/5">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-white/30" />
          </div>
        )}
      </div>
      <div className="flex-1 p-5">
        <h3 className="text-sm font-bold text-white leading-snug mb-2 group-hover:text-mauve transition-colors line-clamp-2">{post.title}</h3>
        <p className="text-xs text-white/60 font-light leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
        <div className="flex items-center gap-2 pt-3 border-t border-hairline-dark">
          <img src={post.author?.avatar_url} alt={post.author?.name} className="h-5 w-5 rounded-full object-cover" />
          <span className="text-[10px] text-white/50">{post.author?.name}</span>
          <span className="text-[10px] text-white/30">•</span>
          <span className="text-[10px] text-white/50 flex items-center gap-1">
            <Clock className="h-3 w-3" />{post.read_time_minutes} min
          </span>
        </div>
      </div>
    </Link>
  )
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const cat = await getCategory(category)
  if (!cat) notFound()
  const posts = await getCategoryPosts(cat.id)

  return (
    <div className={`flex min-h-screen flex-col bg-surface-dark text-white ${inter.className}`}>
      <PublicNavbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-hairline-dark bg-surface-card py-14 md:py-20">
          <div className="container mx-auto max-w-5xl px-6 text-center">
            <div className="text-5xl mb-4">{cat.emoji}</div>
            <div className="inline-block rounded-full px-3 py-1 text-xs font-bold text-white mb-4" style={{ backgroundColor: cat.color ?? "#B28DAE" }}>
              CATEGORY
            </div>
            <h1 className={`text-4xl md:text-5xl font-light tracking-tight text-white mb-4 ${playfair.className}`}>{cat.name}</h1>
            <p className="text-white/60 font-light max-w-xl mx-auto">{cat.description}</p>
            <div className="mt-4 text-xs text-white/50">{posts.length} articles</div>
          </div>
        </section>

        {/* Articles */}
        <section className="container mx-auto max-w-5xl px-6 py-12">
          {posts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          ) : (
            <div className="py-24 text-center">
              <BookOpen className="h-10 w-10 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">No articles in this category yet.</p>
              <Link href="/blog" className="mt-4 inline-flex items-center gap-1 text-mauve text-sm font-semibold hover:underline">
                Browse all articles <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
