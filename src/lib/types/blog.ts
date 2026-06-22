// ============================================================
// Blog System Types
// ============================================================

export interface BlogCategory {
  id: string
  name: string
  slug: string
  description?: string
  emoji?: string
  color?: string
  post_count?: number
}

export interface BlogTag {
  id: string
  name: string
  slug: string
}

export interface BlogAuthor {
  id: string
  name: string
  slug: string
  bio?: string
  avatar_url?: string
  twitter_url?: string
  linkedin_url?: string
  website_url?: string
  post_count?: number
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  cover_image_url?: string
  status: "draft" | "published" | "scheduled" | "archived"
  author?: BlogAuthor
  category?: BlogCategory
  tags?: BlogTag[]
  seo_title?: string
  seo_description?: string
  og_title?: string
  og_description?: string
  og_image_url?: string
  canonical_url?: string
  read_time_minutes?: number
  is_featured?: boolean
  is_trending?: boolean
  view_count?: number
  published_at?: string
  created_at?: string
  updated_at?: string
}

export interface BlogSubscriber {
  id: string
  email: string
  name?: string
  status: "active" | "unsubscribed" | "bounced"
  source?: string
  subscribed_at?: string
}

export interface BlogListResponse {
  posts: BlogPost[]
  total: number
  page: number
  limit: number
}
