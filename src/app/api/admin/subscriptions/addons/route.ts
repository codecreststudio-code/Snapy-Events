import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

const DEFAULT_ADDONS = [
  {
    name: "Guest Boost (+5 Guests)",
    description: "+5 guest invitations per event",
    price_inr: 199,
    price_usd: 3,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard", "premium"],
    is_active: true,
    category: "guest_boost",
    value: 5,
  },
  {
    name: "Guest Boost (+25 Guests)",
    description: "+25 guest invitations per event",
    price_inr: 399,
    price_usd: 5,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard", "premium"],
    is_active: true,
    category: "guest_boost",
    value: 25,
  },
  {
    name: "Shots Boost (+5 Shots/Guest)",
    description: "+5 additional photos per guest limit",
    price_inr: 99,
    price_usd: 1,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard", "premium"],
    is_active: true,
    category: "shot_boost",
    value: 5,
  },
  {
    name: "Shots Boost (+10 Shots/Guest)",
    description: "+10 additional photos per guest limit",
    price_inr: 179,
    price_usd: 2,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard", "premium"],
    is_active: true,
    category: "shot_boost",
    value: 10,
  },
  {
    name: "Shots Boost (+25 Shots/Guest)",
    description: "+25 additional photos per guest limit",
    price_inr: 249,
    price_usd: 3,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard", "premium"],
    is_active: true,
    category: "shot_boost",
    value: 25,
  },
  {
    name: "Photo Limit Boost (+10/Guest)",
    description: "Raise the per-guest photo cap to 10",
    price_inr: 99,
    price_usd: 2,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard", "premium"],
    is_active: true,
    category: "photo_limit_boost",
    value: 10,
  },
  {
    name: "Photo Limit Boost (+25/Guest)",
    description: "Raise the per-guest photo cap to 25",
    price_inr: 179,
    price_usd: 3,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard", "premium"],
    is_active: true,
    category: "photo_limit_boost",
    value: 25,
  },
  {
    name: "Photo Limit Boost (+50/Guest)",
    description: "Raise the per-guest photo cap to 50",
    price_inr: 249,
    price_usd: 4,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard", "premium"],
    is_active: true,
    category: "photo_limit_boost",
    value: 50,
  },
  {
    name: "Photo Limit Boost (Unlimited/Guest)",
    description: "Unlimited photos per guest",
    price_inr: 599,
    price_usd: 8,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard", "premium"],
    is_active: true,
    category: "photo_limit_boost",
    value: -1,
  },
  {
    name: "Video Uploads Unlock",
    description: "Enables guest video uploads for events on plans that don't already include it",
    price_inr: 599,
    price_usd: 8,
    billing_type: "one_time",
    compatible_plans: ["starter"],
    is_active: true,
    category: "video_addon",
    value: 1,
  },
  {
    name: "Voice Notes Unlock",
    description: "Enables guest voice notes for events on plans that don't already include it",
    price_inr: 399,
    price_usd: 5,
    billing_type: "one_time",
    compatible_plans: ["starter", "standard"],
    is_active: true,
    category: "voice_addon",
    value: 1,
  },
]

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("addons")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return fail("DB_ERROR", error.message, 500)

    // Auto-seed default guest and shot boost add-ons if table is empty
    if (!data || data.length === 0) {
      try {
        const { data: seeded, error: seedErr } = await sb
          .from("addons")
          .insert(DEFAULT_ADDONS)
          .select()

        if (!seedErr && seeded) {
          return ok(seeded)
        }
      } catch {
        // ignore seeding failure and return empty array
      }
    }

    return ok(data)
  },
}).GET

const createAddonSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price_inr: z.number().min(0),
  price_usd: z.number().min(0),
  billing_type: z.enum(["one_time", "monthly", "yearly", "lifetime"]).default("one_time"),
  compatible_plans: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  category: z.enum(["guest_boost", "shot_boost", "photo_limit_boost", "video_addon", "voice_addon"]).nullable().optional(),
  value: z.number().nullable().optional(),
})

export const POST = defineRoute({
  method: "POST",
  requireAuth: "admin",
  body: createAddonSchema,
  handler: async ({ body }) => {
    const sb = await adminDb()
    const { data, error } = await sb
      .from("addons")
      .insert({
        ...body,
      })
      .select()
      .single()

    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST
