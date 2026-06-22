import { defineRoute, ok, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    const sb = await adminDb()
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const [txs, activeSubs, totalOrgs] = await Promise.all([
      sb
        .from("transactions")
        .select("id, amount, currency, status, created_at, razorpay_payment_id, razorpay_order_id, payment_method, organization_id, organization:organizations(name)")
        .order("created_at", { ascending: false }),
      sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("organizations").select("id", { count: "exact", head: true }),
    ])
    
    const successfulTxs = (txs.data ?? []).filter(t => t.status === "success")
    const revenue = successfulTxs.reduce((s, t) => s + (t.amount ?? 0), 0)
    const currency = (txs.data ?? [])[0]?.currency ?? "INR"
    
    return ok({
      window_days: 30,
      total_revenue: revenue,
      currency,
      transaction_count: successfulTxs.length,
      active_subscriptions: activeSubs.count ?? 0,
      total_organizations: totalOrgs.count ?? 0,
      transactions: txs.data ?? [],
    })
  },
}).GET

