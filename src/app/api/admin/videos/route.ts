import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const listQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  eventId: z.string().uuid().optional(),
})

export const GET = defineRoute({
  method: "GET",
  query: listQuery,
  requireAuth: "admin",
  handler: async ({ query }) => {
    const sb = await adminDb()
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    let q = sb
      .from("photos")
      .select("id, storage_path, thumbnail_path, original_filename, mime_type, file_size, metadata, created_at, event:events(name, id), uploader:users(id, email, full_name)", { count: "exact" })
      .ilike("mime_type", "video/%")

    if (query.eventId) {
      q = q.eq("event_id", query.eventId)
    }

    const { data, count, error } = await q
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [], { pagination: paginate({ page: query.page, pageSize: query.pageSize, total: count ?? 0 }) })
  },
}).GET

export const DELETE = defineRoute({
  method: "DELETE",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const url = new URL(request.url)
    const videoIdsParam = url.searchParams.get("videoIds")
    if (!videoIdsParam) return fail("VALIDATION_ERROR", "videoIds query parameter is required (comma-separated)", 422)

    const videoIds = videoIdsParam.split(",")
    const sb = await adminDb()

    // 1. Fetch paths from DB to delete from Storage
    const { data: videos, error: fetchErr } = await sb
      .from("photos")
      .select("storage_path, thumbnail_path")
      .in("id", videoIds)

    if (fetchErr) return fail("DB_ERROR", fetchErr.message, 500)

    if (videos && videos.length > 0) {
      const pathsToDelete = videos.map(v => v.storage_path)
      const thumbPathsToDelete = videos.map(v => v.thumbnail_path).filter(Boolean) as string[]

      if (pathsToDelete.length > 0) {
        await sb.storage.from("photos").remove(pathsToDelete)
        await sb.storage.from("photos-public").remove(pathsToDelete)
      }
      if (thumbPathsToDelete.length > 0) {
        await sb.storage.from("photos").remove(thumbPathsToDelete)
        await sb.storage.from("photos-public").remove(thumbPathsToDelete)
      }
    }

    // 2. Delete from DB
    const { error: dbErr } = await sb
      .from("photos")
      .delete()
      .in("id", videoIds)

    if (dbErr) return fail("DB_ERROR", dbErr.message, 500)

    return ok({ success: true })
  },
}).DELETE
