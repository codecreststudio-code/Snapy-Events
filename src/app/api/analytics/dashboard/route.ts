import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const query = z.object({ days: z.coerce.number().min(1).max(365).default(30) })

export const GET = defineRoute({
  method: "GET",
  query,
  requireAuth: true,
  handler: async ({ query, auth }) => {
    const supabase = await createClient()
    const since = new Date(Date.now() - query.days * 24 * 3600 * 1000).toISOString()
    const [{ data: events }, { data: photos }, { data: storage }] = await Promise.all([
      supabase.from("events").select("id, name, status, view_count, upload_count").eq("user_id", auth.user!.id),
      supabase.from("photos").select("id, created_at").eq("user_id", auth.user!.id).gte("created_at", since),
      supabase.from("storage_usage").select("*").eq("user_id", auth.user!.id).single(),
    ])
    if (!events) return fail("DB_ERROR", "Could not load events", 500)
    const totalEvents = events.length
    const totalViews = events.reduce((s, e) => s + (e.view_count ?? 0), 0)
    const totalUploads = events.reduce((s, e) => s + (e.upload_count ?? 0), 0)
    return ok({
      range_days: query.days,
      total_events: totalEvents,
      published_events: events.filter((e) => e.status === "published").length,
      total_views: totalViews,
      total_uploads: totalUploads,
      photos_in_window: photos?.length ?? 0,
      storage: storage ?? { total_bytes: 0, photo_count: 0 },
    })
  },
}).GET
