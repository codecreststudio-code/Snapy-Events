import { createClient } from "@/lib/supabase/server"
import DashboardClient from "./dashboard-client"

export const metadata = { title: "Dashboard" }

export default async function AdminHome() {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  
  const [orgs, events, txs, photos, searches, storage, recentEvts, txsTrend, eventsTrend, photosTrend, usersTrend] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("amount, currency, status, created_at").in("status", ["success"]),
    supabase.from("photos").select("id", { count: "exact", head: true }),
    supabase.from("face_search_logs").select("id", { count: "exact", head: true }),
    supabase.from("storage_usage").select("total_bytes"),
    supabase.from("events").select("name, venue, status, event_date, organization:organizations(name)").order("created_at", { ascending: false }).limit(5),
    supabase.from("transactions").select("amount, created_at").eq("status", "success").gte("created_at", since),
    supabase.from("events").select("created_at").gte("created_at", since),
    supabase.from("photos").select("created_at").gte("created_at", since),
    supabase.from("users").select("created_at").gte("created_at", since),
  ])

  const revenueSum = (txs.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0) / 100 // Convert paise to Rupees
  const storageSum = (storage.data ?? []).reduce((s, st) => s + Number(st.total_bytes ?? 0), 0)

  // Helper to bucket trend data by date range
  function getTrendData(items: { created_at: string }[], keyExtractor?: (item: any) => number) {
    const buckets: Record<string, number> = {}
    
    // Create 5 interval buckets over the last 30 days
    for (let i = 4; i >= 0; i--) {
      const d = new Date(Date.now() - i * 6 * 24 * 3600 * 1000)
      const label = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
      buckets[label] = 0
    }
    
    const labels = Object.keys(buckets)

    items.forEach((item) => {
      const itemTime = new Date(item.created_at).getTime()
      const val = keyExtractor ? keyExtractor(item) : 1
      
      // Assign to the closest date bucket
      let closestLabel = labels[0]
      let minDiff = Infinity
      labels.forEach(label => {
        const bucketTime = new Date(label + ", " + new Date().getFullYear()).getTime()
        const diff = Math.abs(itemTime - bucketTime)
        if (diff < minDiff) {
          minDiff = diff
          closestLabel = label
        }
      })
      buckets[closestLabel] += val
    })

    return labels.map(label => ({ label, value: buckets[label] }))
  }

  // Assemble custom feed events based on recent actions
  const feed: any[] = []
  
  const recentOrgs = await supabase.from("organizations").select("name, created_at").order("created_at", { ascending: false }).limit(3)
  if (recentOrgs.data) {
    recentOrgs.data.forEach((o: any) => {
      feed.push({
        type: "org",
        message: `New organization '${o.name}' registered.`,
        time: new Date(o.created_at).toLocaleDateString(),
        rawTime: new Date(o.created_at).getTime(),
      })
    })
  }

  const recentTxs = await supabase.from("transactions").select("amount, created_at, organization:organizations(name)").in("status", ["success"]).order("created_at", { ascending: false }).limit(3)
  if (recentTxs.data) {
    recentTxs.data.forEach((t: any) => {
      feed.push({
        type: "payment",
        message: `Payment received of ₹${(t.amount/100).toLocaleString()} from '${t.organization?.name || "Member"}'.`,
        time: new Date(t.created_at).toLocaleDateString(),
        rawTime: new Date(t.created_at).getTime(),
      })
    })
  }

  feed.sort((a, b) => b.rawTime - a.rawTime)

  const initialData = {
    orgsCount: orgs.count ?? 0,
    eventsCount: events.count ?? 0,
    photosCount: photos.count ?? 0,
    searchesCount: searches.count ?? 0,
    revenueSum: revenueSum || 0,
    storageBytes: storageSum || 0,
    recentEvents: recentEvts.data ?? [],
    recentActivities: feed.map(f => ({ type: f.type, message: f.message, time: f.time })),
    revenueTrend: getTrendData(txsTrend.data ?? [], (t) => (t.amount || 0) / 100),
    eventsTrend: getTrendData(eventsTrend.data ?? []),
    photosTrend: getTrendData(photosTrend.data ?? []),
    usersTrend: getTrendData(usersTrend.data ?? []),
  }

  return <DashboardClient initialData={initialData} />
}

