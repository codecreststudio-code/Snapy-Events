import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Clock, ArrowRight, BookOpen } from "lucide-react"
import { PublicNav } from "@/lib/components/layout/public-nav"
import { PublicFooter } from "@/lib/components/layout/public-footer"
import { BLOG_AUTHORS, BLOG_POSTS, getPostsByAuthor } from "@/lib/blog/data"
import { Playfair_Display, Inter } from "next/font/google"
import type { BlogPost } from "@/lib/types/blog"

const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" })
const inter = Inter({ subsets: ["latin"], display: "swap" })

interface Props { params: Promise<{ author: string }> }

export async function generateStaticParams() {
  return BLOG_AUTHORS.map((a) => ({ author: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { author } = await params
  const a = BLOG_AUTHORS.find((x) => x.slug === author)
  if (!a) return { title: "Author Not Found" }
  return {
    title: `${a.name} | Snapsy Blog`,
    description: a.bio ?? `Articles by ${a.name} on the Snapsy Blog.`,
  }
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex gap-4 items-start py-4 border-b border-slate-100 last:border-0">
      <div className="h-16 w-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-5 w-5 text-slate-300" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {post.category && (
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: post.category.color ?? "#7c3aed" }}>
            {post.category.emoji} {post.category.name}
          </span>
        )}
        <h3 className="text-sm font-bold text-slate-900 leading-snug mt-1 group-hover:text-violet-700 transition-colors line-clamp-2">{post.title}</h3>
        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          <Clock className="h-3 w-3" />{post.read_time_minutes} min read
        </p>
      </div>
    </Link>
  )
}

export default async function AuthorPage({ params }: Props) {
  const { author } = await params
  const a = BLOG_AUTHORS.find((x) => x.slug === author)
  if (!a) notFound()
  const posts = getPostsByAuthor(author)

  return (
    <div className={`flex min-h-screen flex-col bg-white text-slate-900 ${inter.className}`}>
      <PublicNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white py-14 md:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center">
            <img src={a.avatar_url} alt={a.name} className="h-20 w-20 rounded-2xl object-cover mx-auto mb-5 ring-4 ring-white shadow-lg" />
            <div className="inline-block rounded-full bg-violet-50 border border-violet-100 px-3 py-1 text-xs font-bold text-violet-600 mb-3">AUTHOR</div>
            <h1 className={`text-3xl md:text-4xl font-normal tracking-tight text-slate-900 mb-3 ${playfair.className}`}>{a.name}</h1>
            <p className="text-slate-500 font-light max-w-lg mx-auto text-sm">{a.bio}</p>
            <p className="mt-4 text-xs text-slate-400">{posts.length} articles</p>
          </div>
        </section>

        {/* Articles */}
        <section className="container mx-auto max-w-2xl px-6 py-12">
          {posts.length > 0 ? (
            <div>{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
          ) : (
            <div className="py-24 text-center">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No articles yet.</p>
              <Link href="/blog" className="mt-4 inline-flex items-center gap-1 text-violet-600 text-sm font-semibold hover:text-violet-700">
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
