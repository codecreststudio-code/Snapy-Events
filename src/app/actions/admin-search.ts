"use server"

import { createClient } from "@/lib/supabase/server"

export type GlobalSearchResult = {
  id: string
  title: string
  subtitle: string
  type: "user" | "organization" | "event" | "gallery"
  link: string
}

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

  // Search Users
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email")
    .or(`full_name.ilike.${q},email.ilike.${q}`)
    .limit(5)
  
  if (users) {
    users.forEach(u => searchResults.push({
      id: `user_${u.id}`,
      title: u.full_name || "Unknown Name",
      subtitle: u.email || "",
      type: "user",
      link: `/admin/users?highlight=${u.id}`
    }))
  }

  // Search Organizations
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .or(`name.ilike.${q},slug.ilike.${q}`)
    .limit(5)
    
  if (orgs) {
    orgs.forEach(o => searchResults.push({
      id: `org_${o.id}`,
      title: o.name,
      subtitle: `Slug: ${o.slug}`,
      type: "organization",
      link: `/admin/organizations?highlight=${o.id}`
    }))
  }

  // Search Events
  const { data: events } = await supabase
    .from("events")
    .select("id, title, slug")
    .or(`title.ilike.${q},slug.ilike.${q}`)
    .limit(5)
    
  if (events) {
    events.forEach(e => searchResults.push({
      id: `evt_${e.id}`,
      title: e.title,
      subtitle: `Slug: ${e.slug}`,
      type: "event",
      link: `/admin/events?highlight=${e.id}`
    }))
  }

  return searchResults
}
