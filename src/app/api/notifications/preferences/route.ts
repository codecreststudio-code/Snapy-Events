import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

// Keep in sync with the DEFAULT in
// supabase/migrations/0039_notification_infrastructure.sql.
const DEFAULT_PREFERENCES: Record<string, boolean> = {
  comments: true,
  likes: true,
  uploads: true,
  reminders: true,
  marketing: false,
  ai_stories: true,
  highlights: true,
  announcements: true,
  new_guest: true,
  milestones: true,
}

// Partial patch of category -> on/off. Merged into the existing JSONB rather
// than replacing it wholesale, so unspecified categories are left alone.
const patchBodySchema = z.record(z.string(), z.boolean())

export const GET = defineRoute({
  method: "GET",
  requireAuth: true,
  handler: async ({ auth }) => {
    const supabase = await createClient()
    const userId = auth.user!.id

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) return fail("DB_ERROR", error.message, 500)

    // Brand-new user — create the default row instead of 404ing so the
    // caller always gets a usable preferences object.
    if (!data) {
      const { data: created, error: upsertError } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: userId, preferences: DEFAULT_PREFERENCES },
          { onConflict: "user_id" },
        )
        .select("preferences")
        .single()

      if (upsertError) return fail("DB_ERROR", upsertError.message, 500)
      return ok(created.preferences)
    }

    return ok(data.preferences)
  },
}).GET

export const PATCH = defineRoute<z.infer<typeof patchBodySchema>>({
  method: "PATCH",
  body: patchBodySchema,
  requireAuth: true,
  handler: async ({ body, auth }) => {
    const supabase = await createClient()
    const userId = auth.user!.id

    const { data: existing, error: fetchError } = await supabase
      .from("notification_preferences")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) return fail("DB_ERROR", fetchError.message, 500)

    const current = (existing?.preferences as Record<string, boolean> | undefined) ?? DEFAULT_PREFERENCES
    const merged = { ...current, ...body }

    const { data: updated, error: upsertError } = await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: userId, preferences: merged, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      )
      .select("preferences")
      .single()

    if (upsertError) return fail("DB_ERROR", upsertError.message, 500)
    return ok(updated.preferences)
  },
}).PATCH
