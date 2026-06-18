import { redirect } from "next/navigation"
import { getAuthContext } from "@/lib/auth/session"
import { AdminNav } from "@/lib/components/layout/admin-nav"
import { PageHeader } from "@/lib/components/layout/page-header"
import { StatCard } from "@/lib/components/layout/stat-card"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Admin" }

export default async function AdminHome() {
  const ctx = await getAuthContext()
  if (!ctx.isAdmin) redirect("/admin/login")
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const [orgs, events, txs, photos] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("amount, currency, status").in("status", ["success"]).gte("created_at", since),
    supabase.from("photos").select("id", { count: "exact", head: true }),
  ])
  const revenue = (txs.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0)
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 px-6 py-8">
        <PageHeader title="Admin overview" description="Last 30 days" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Organizations" value={orgs.count ?? 0} />
          <StatCard label="Events" value={events.count ?? 0} />
          <StatCard label="Photos" value={photos.count ?? 0} />
          <StatCard label="Revenue (₹)" value={revenue} />
        </div>
      </main>
    </div>
  )
}
