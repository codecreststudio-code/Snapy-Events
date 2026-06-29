import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"
import { z } from "zod"

const querySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
})

export const GET = defineRoute({
  method: "GET",
  query: querySchema,
  requireAuth: "admin",
  handler: async ({ query }) => {
    const sb = await adminDb()
    const windowDays = query.days
    const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000).toISOString()

    const [txsRes, activeSubs, totalUsers] = await Promise.all([
      sb
        .from("transactions")
        .select(
          "id, amount, currency, status, created_at, razorpay_payment_id, razorpay_order_id, payment_method, user_id, user:users(full_name)"
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
      sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("users").select("id", { count: "exact", head: true }),
    ])

    const allTxs = txsRes.data ?? []
    const successfulTxs = allTxs.filter((t) => t.status === "success")
    const revenue = successfulTxs.reduce((s, t) => s + (t.amount ?? 0), 0)
    const currency = allTxs[0]?.currency ?? "INR"

    // Build daily revenue buckets for the chart
    const buckets: Record<string, number> = {}
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(Date.now() - (windowDays - 1 - i) * 24 * 3600 * 1000)
      const key = d.toISOString().slice(0, 10) // "YYYY-MM-DD"
      buckets[key] = 0
    }
    for (const tx of successfulTxs) {
      const key = tx.created_at.slice(0, 10)
      if (key in buckets) buckets[key] += tx.amount ?? 0
    }
    const dailyRevenue = Object.entries(buckets).map(([date, amount]) => ({ date, amount }))

    return ok({
      window_days: windowDays,
      total_revenue: revenue,
      currency,
      transaction_count: successfulTxs.length,
      failed_count: allTxs.filter((t) => t.status === "failed").length,
      refunded_count: allTxs.filter((t) => t.status === "refunded").length,
      active_subscriptions: activeSubs.count ?? 0,
      total_users: totalUsers.count ?? 0,
      transactions: allTxs,
      daily_revenue: dailyRevenue,
    })
  },
}).GET
