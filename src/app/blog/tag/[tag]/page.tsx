import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Clock, ArrowRight, BookOpen } from "lucide-react"
import { BLOG_TAGS, getPostsByTag } from "@/lib/blog/data"
import { Playfair_Display, Inter } from "next/font/google"
import type { BlogPost } from "@/lib/types/blog"

const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" })
const inter = Inter({ subsets: ["latin"], display: "swap" })

interface Props { params: Promise<{ tag: string }> }

export async function generateStaticParams() {
  return BLOG_TAGS.map((t) => ({ tag: t.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  const t = BLOG_TAGS.find((x) => x.slug === tag)
  if (!t) return { title: "Tag Not Found" }
  return {
    title: `#${t.name} Articles | Snapsy Blog`,
    description: `Browse all articles tagged with #${t.name} on the Snapsy Blog.`,
  }
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col rounded-2xl border border-hairline-dark bg-surface-card overflow-hidden hover:border-mauve/40 transition-all duration-300">
      <div className="aspect-video overflow-hidden bg-white/5">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-8 w-8 text-white/30" /></div>
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

export default async function TagPage({ params }: Props) {
  const { tag } = await params
  const t = BLOG_TAGS.find((x) => x.slug === tag)
  if (!t) notFound()
  const posts = getPostsByTag(tag)

  return (
    <div className={`flex min-h-screen flex-col bg-surface-dark text-white ${inter.className}`}>
      <PublicNavbar />
      <main className="flex-1">
        <section className="border-b border-hairline-dark bg-surface-card py-14 md:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <div className="inline-block rounded-full bg-mauve px-4 py-1 text-xs font-bold text-[#141110] mb-4">TAG</div>
            <h1 className={`text-3xl md:text-4xl font-light tracking-tight text-white mb-3 ${playfair.className}`}>
              #{t.name}
            </h1>
            <p className="text-white/60 font-light">{posts.length} articles tagged with #{t.name}</p>
          </div>
        </section>

        <section className="container mx-auto max-w-5xl px-6 py-12">
          {posts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          ) : (
            <div className="py-24 text-center">
              <BookOpen className="h-10 w-10 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">No articles with this tag yet.</p>
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
