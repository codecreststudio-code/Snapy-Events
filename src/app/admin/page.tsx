import { PageHeader } from "@/lib/components/layout/page-header"
import { StatCard } from "@/lib/components/layout/stat-card"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Dashboard" }

export default async function AdminHome() {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  
  const [orgs, events, txs, photos] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("amount, currency, status").in("status", ["success"]).gte("created_at", since),
    supabase.from("photos").select("id", { count: "exact", head: true }),
  ])

  const revenue = (txs.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0) / 100 // Convert paise to Rupees

  return (
    <main className="px-6 py-8 space-y-6">
      <PageHeader title="Admin Overview" description="Platform health and analytics for the last 30 days." />
      
      <div className="grid gap-6 md:grid-cols-4">
        <StatCard label="Total Organizations" value={orgs.count ?? 0} />
        <StatCard label="Total Events" value={events.count ?? 0} />
        <StatCard label="Photos Uploaded" value={photos.count ?? 0} />
        <StatCard label="Revenue Captured" value={`₹${revenue.toLocaleString()}`} />
      </div>

      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">Quick Shortcuts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/admin/users" className="block p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
            <span className="font-semibold text-slate-200 block">Manage Users</span>
            <span className="text-xs text-slate-500">Reset passwords, suspend, or delete users.</span>
          </a>
          <a href="/admin/events" className="block p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
            <span className="font-semibold text-slate-200 block">Review Events</span>
            <span className="text-xs text-slate-500">Monitor active and draft photo collections.</span>
          </a>
          <a href="/admin/subscriptions" className="block p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
            <span className="font-semibold text-slate-200 block">Plans & Settings</span>
            <span className="text-xs text-slate-500">Change pricing, customize limits, or check billing.</span>
          </a>
        </div>
      </div>
    </main>
  )
}
