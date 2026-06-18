import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const params = z.object({ id: z.string().uuid() })
const query = z.object({ days: z.coerce.number().min(1).max(365).default(30) })

export const GET = defineRoute<unknown, z.infer<typeof query>, { id: string }>({
  method: "GET",
  query,
  requireAuth: true,
  handler: async ({ params, query, auth }) => {
    const { id } = params
    const supabase = await createClient()
    const since = new Date(Date.now() - query.days * 24 * 3600 * 1000).toISOString()
    const [{ data: views }, { data: uploads }, { count: photoCount }, { count: scanCount }] = await Promise.all([
      supabase.from("analytics_events").select("created_at").eq("event_type", "event.view").eq("organization_id", auth.organization!.id).gte("created_at", since),
      supabase.from("photos").select("id", { count: "exact" }).eq("event_id", id),
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", id),
      supabase.from("qr_scans").select("id", { count: "exact", head: true }).eq("event_id", id),
    ])
    return ok({ views: views?.length ?? 0, uploads: uploads?.length ?? 0, photoCount: photoCount ?? 0, scanCount: scanCount ?? 0 })
  },
}).GET
