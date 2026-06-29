import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const t0 = Date.now()

    try {
      const sb = await adminDb()

      // Parallel health checks against real DB tables
      const [subRes, userRes, eventRes, txRes] = await Promise.all([
        sb.from("subscriptions").select("id", { count: "exact", head: true }),
        sb.from("users").select("id", { count: "exact", head: true }),
        sb.from("events").select("id", { count: "exact", head: true }),
        sb.from("transactions").select("id", { count: "exact", head: true }),
      ])

      const dbLatency = Date.now() - t0

      const dbHealthy = !subRes.error && !userRes.error && !eventRes.error && !txRes.error

      return ok({
        db_latency_ms: dbLatency,
        db_healthy: dbHealthy,
        db_error: subRes.error?.message || userRes.error?.message || null,
        record_counts: {
          subscriptions: subRes.count ?? 0,
          users: userRes.count ?? 0,
          events: eventRes.count ?? 0,
          transactions: txRes.count ?? 0,
        },
        checked_at: new Date().toISOString(),
      })
    } catch (err: any) {
      return ok({
        db_latency_ms: Date.now() - t0,
        db_healthy: false,
        db_error: err.message,
        record_counts: { subscriptions: 0, users: 0, events: 0, transactions: 0 },
        checked_at: new Date().toISOString(),
      })
    }
  },
}).GET
