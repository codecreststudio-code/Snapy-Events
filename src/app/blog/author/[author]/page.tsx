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

interface Props { params: Promise<{ author: string }> }

async function getAuthor(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("blog_authors")
    .select("*")
    .eq("slug", slug)
    .single()
  return data
}

async function getAuthorPosts(authorId: string): Promise<BlogPost[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("blog_posts")
    .select(`
      id, title, slug, excerpt, cover_image_url, read_time_minutes, published_at, status,
      author:blog_authors(id, name, slug, avatar_url),
      category:blog_categories(id, name, slug, emoji, color)
    `)
    .eq("author_id", authorId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
  return (data as unknown as BlogPost[]) ?? []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { author } = await params
  const a = await getAuthor(author)
  if (!a) return { title: "Author Not Found" }
  return {
    title: `${a.name} | Snapsy Blog`,
    description: a.bio ?? `Articles by ${a.name} on the Snapsy Blog.`,
  }
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex gap-4 items-start py-4 border-b border-hairline-dark last:border-0">
      <div className="h-16 w-24 rounded-xl overflow-hidden bg-ink/5 shrink-0">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-5 w-5 text-ink-tertiary" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {post.category && (
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: post.category.color ?? "#b8925a" }}>
            {post.category.emoji} {post.category.name}
          </span>
        )}
        <h3 className="text-sm font-bold text-ink leading-snug mt-1 group-hover:text-mauve transition-colors line-clamp-2">{post.title}</h3>
        <p className="text-[10px] text-ink-secondary mt-1 flex items-center gap-1">
          <Clock className="h-3 w-3" />{post.read_time_minutes} min read
        </p>
      </div>
    </Link>
  )
}

export default async function AuthorPage({ params }: Props) {
  const { author } = await params
  const a = await getAuthor(author)
  if (!a) notFound()
  const posts = await getAuthorPosts(a.id)

  return (
    <div className={`flex min-h-screen flex-col bg-surface-dark text-ink ${inter.className}`}>
      <PublicNavbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-hairline-dark bg-surface-card py-14 md:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            {a.avatar_url && (
              <img src={a.avatar_url} alt={a.name} className="h-20 w-20 rounded-2xl object-cover mx-auto mb-5 ring-4 ring-hairline-dark shadow-lg" />
            )}
            <div className="inline-block rounded-full bg-mauve/10 border border-mauve/20 px-3 py-1 text-xs font-bold text-mauve mb-3">AUTHOR</div>
            <h1 className={`text-3xl md:text-4xl font-light tracking-tight text-ink mb-3 ${playfair.className}`}>{a.name}</h1>
            <p className="text-ink-secondary font-light max-w-lg mx-auto text-sm">{a.bio}</p>
            <p className="mt-4 text-xs text-ink-secondary">{posts.length} articles</p>
          </div>
        </section>

        {/* Articles */}
        <section className="container mx-auto max-w-2xl px-6 py-12">
          {posts.length > 0 ? (
            <div>{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
          ) : (
            <div className="py-24 text-center">
              <BookOpen className="h-10 w-10 text-ink-tertiary mx-auto mb-4" />
              <p className="text-ink-secondary">No articles yet.</p>
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
