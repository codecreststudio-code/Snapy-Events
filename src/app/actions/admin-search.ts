"use server"

import { createClient } from "@/lib/supabase/server"

export type GlobalSearchResult = {
  id: string
  title: string
  subtitle: string
  type: "module" | "user" | "organization" | "event" | "gallery" | "subscription" | "ticket"
  link: string
}

const ADMIN_MODULES = [
  { id: 'mod_dashboard', title: 'Dashboard', subtitle: 'Platform overview and metrics', type: 'module', link: '/admin', keywords: ['home', 'main', 'index', 'overview', 'stats'] },
  { id: 'mod_organizations', title: 'Organizations', subtitle: 'Manage workspaces', type: 'module', link: '/admin/organizations', keywords: ['workspaces', 'tenants', 'companies', 'teams', 'orgs'] },
  { id: 'mod_users', title: 'Users', subtitle: 'Manage platform users', type: 'module', link: '/admin/users', keywords: ['people', 'accounts', 'guests', 'hosts', 'members'] },
  { id: 'mod_events', title: 'Events', subtitle: 'Manage events', type: 'module', link: '/admin/events', keywords: ['parties', 'weddings', 'corporate', 'gatherings'] },
  { id: 'mod_photos', title: 'Photos', subtitle: 'Manage all photos', type: 'module', link: '/admin/photos', keywords: ['images', 'pictures', 'media', 'uploads'] },
  { id: 'mod_videos', title: 'Videos', subtitle: 'Manage video content', type: 'module', link: '/admin/videos', keywords: ['media', 'clips', 'recordings', 'movies'] },
  { id: 'mod_voice_notes', title: 'Voice Notes', subtitle: 'Manage audio recordings', type: 'module', link: '/admin/voice-notes', keywords: ['audio', 'recordings', 'sound', 'voice', 'notes'] },
  { id: 'mod_ai_face_search', title: 'AI Face Search', subtitle: 'Facial recognition engine', type: 'module', link: '/admin/ai-face-search', keywords: ['facial', 'recognition', 'find', 'match', 'ai', 'faces'] },
  { id: 'mod_galleries', title: 'Galleries', subtitle: 'Manage photo galleries', type: 'module', link: '/admin/galleries', keywords: ['albums', 'collections', 'folders'] },
  { id: 'mod_qr_codes', title: 'QR Codes', subtitle: 'Manage QR code assets', type: 'module', link: '/admin/qr-codes', keywords: ['scan', 'barcodes', 'links', 'codes'] },
  { id: 'mod_downloads', title: 'Downloads', subtitle: 'Manage digital downloads', type: 'module', link: '/admin/downloads', keywords: ['exports', 'archives', 'zip', 'files'] },
  { id: 'mod_subscriptions', title: 'Subscriptions', subtitle: 'Manage recurring billing', type: 'module', link: '/admin/subscriptions', keywords: ['billing', 'plans', 'recurring', 'stripe', 'money', 'subs'] },
  { id: 'mod_revenue', title: 'Revenue', subtitle: 'Financial overview', type: 'module', link: '/admin/revenue', keywords: ['money', 'income', 'earnings', 'finance', 'sales'] },
  { id: 'mod_payments', title: 'Payments', subtitle: 'Manage transactions', type: 'module', link: '/admin/payments', keywords: ['transactions', 'invoices', 'charges', 'refunds', 'pay'] },
  { id: 'mod_storage', title: 'Storage', subtitle: 'Manage file storage', type: 'module', link: '/admin/storage', keywords: ['files', 'buckets', 'space', 'usage', 'assets'] },
  { id: 'mod_analytics', title: 'Analytics', subtitle: 'Platform statistics', type: 'module', link: '/admin/analytics', keywords: ['stats', 'metrics', 'graphs', 'charts', 'data', 'reports'] },
  { id: 'mod_blog', title: 'Blog', subtitle: 'Manage blog posts', type: 'module', link: '/admin/blog', keywords: ['posts', 'articles', 'content', 'cms', 'news'] },
  { id: 'mod_marketing', title: 'Marketing', subtitle: 'Marketing campaigns', type: 'module', link: '/admin/marketing', keywords: ['campaigns', 'ads', 'promo', 'coupons', 'discounts'] },
  { id: 'mod_notifications', title: 'Notifications', subtitle: 'System alerts', type: 'module', link: '/admin/notifications', keywords: ['alerts', 'messages', 'inbox', 'updates'] },
  { id: 'mod_support_tickets', title: 'Support Tickets', subtitle: 'Customer support', type: 'module', link: '/admin/support-tickets', keywords: ['help', 'issues', 'bugs', 'contact', 'support'] },
  { id: 'mod_moderation', title: 'Moderation Queue', subtitle: 'Review content', type: 'module', link: '/admin/moderation', keywords: ['review', 'approve', 'reject', 'flagged', 'reports'] },
  { id: 'mod_audit_logs', title: 'Audit Logs', subtitle: 'System activity logs', type: 'module', link: '/admin/audit-logs', keywords: ['activity', 'history', 'tracking', 'security', 'logs'] },
  { id: 'mod_health', title: 'System Health', subtitle: 'Infrastructure status', type: 'module', link: '/admin/system-health', keywords: ['status', 'uptime', 'ping', 'infrastructure', 'health'] },
  { id: 'mod_settings', title: 'Settings', subtitle: 'Platform configuration', type: 'module', link: '/admin/settings', keywords: ['config', 'options', 'preferences', 'setup', 'system'] },
  { id: 'mod_billing', title: 'Billing', subtitle: 'Platform billing', type: 'module', link: '/admin/billing', keywords: ['invoices', 'cards', 'payment methods', 'stripe'] },
  { id: 'mod_roles', title: 'Roles & Permissions', subtitle: 'Access control', type: 'module', link: '/admin/admin-roles', keywords: ['rbac', 'access', 'permissions', 'admins', 'security', 'roles'] },
] as const;

export async function searchAdminGlobal(query: string): Promise<GlobalSearchResult[]> {
  if (!query || query.length < 2) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  // Verify admin access
  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) return []

  const searchResults: GlobalSearchResult[] = []
  const q = `%${query}%`

  // 1. Search Static Modules
  const normalizedQuery = query.toLowerCase()
  const matchedModules = ADMIN_MODULES.filter(mod => {
    return (
      mod.title.toLowerCase().includes(normalizedQuery) ||
      mod.subtitle.toLowerCase().includes(normalizedQuery) ||
      mod.keywords.some(k => k.includes(normalizedQuery) || normalizedQuery.includes(k))
    )
  })
  
  matchedModules.forEach(mod => {
    searchResults.push({
      id: mod.id,
      title: mod.title,
      subtitle: mod.subtitle,
      type: "module",
      link: mod.link
    })
  })

  // 2. Search Database Records
  // We use Promise.allSettled to search tables concurrently without failing if a table doesn't exist
  const dbQueries = [
    // Users
    supabase.from("users").select("id, full_name, email").or(`full_name.ilike.${q},email.ilike.${q}`).limit(5),
    // Events
    supabase.from("events").select("id, name, slug").or(`name.ilike.${q},slug.ilike.${q}`).limit(5),
    // Galleries
    supabase.from("galleries").select("id, name").ilike("name", q).limit(5),
    // Photos
    supabase.from("photos").select("id, original_filename").ilike("original_filename", q).limit(5),
    // Subscriptions
    supabase.from("subscriptions").select("id, razorpay_subscription_id, status").or(`razorpay_subscription_id.ilike.${q},status.ilike.${q}`).limit(5),
    // QR Codes
    supabase.from("qr_codes").select("id, code, name").or(`code.ilike.${q},name.ilike.${q}`).limit(5)
  ]

  const results = await Promise.allSettled(dbQueries)

  // Users Result
  if (results[0].status === "fulfilled" && results[0].value.data) {
    const data = results[0].value.data as any[]
    data.forEach(u => searchResults.push({
      id: `user_${u.id}`, title: u.full_name || "Unknown Name", subtitle: u.email || "", type: "user", link: `/admin/users?highlight=${u.id}`
    }))
  }
  // Events Result
  if (results[1].status === "fulfilled" && results[1].value.data) {
    const data = results[1].value.data as any[]
    data.forEach(e => searchResults.push({
      id: `evt_${e.id}`, title: e.name, subtitle: `Slug: ${e.slug}`, type: "event", link: `/admin/events?highlight=${e.id}`
    }))
  }
  // Galleries Result
  if (results[2].status === "fulfilled" && results[2].value.data) {
    const data = results[2].value.data as any[]
    data.forEach(g => searchResults.push({
      id: `gal_${g.id}`, title: g.name, subtitle: `Gallery`, type: "gallery", link: `/admin/galleries?highlight=${g.id}`
    }))
  }
  // Photos Result
  if (results[3].status === "fulfilled" && results[3].value.data) {
    const data = results[3].value.data as any[]
    data.forEach(p => searchResults.push({
      id: `photo_${p.id}`, title: p.original_filename || "Photo", subtitle: `Photo ID: ${p.id.substring(0,8)}`, type: "module", link: `/admin/photos?highlight=${p.id}`
    }))
  }
  // Subscriptions Result
  if (results[4].status === "fulfilled" && results[4].value.data) {
    const data = results[4].value.data as any[]
    data.forEach(s => searchResults.push({
      id: `sub_${s.id}`, title: s.razorpay_subscription_id || "Subscription", subtitle: `Status: ${s.status}`, type: "subscription", link: `/admin/subscriptions?highlight=${s.id}`
    }))
  }
  // QR Codes Result
  if (results[5].status === "fulfilled" && results[5].value.data) {
    const data = results[5].value.data as any[]
    data.forEach(t => searchResults.push({
      id: `qr_${t.id}`, title: t.name || t.code, subtitle: `QR Code`, type: "module", link: `/admin/qr-codes?highlight=${t.id}`
    }))
  }

  return searchResults
}
