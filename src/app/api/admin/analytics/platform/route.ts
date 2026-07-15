import { defineRoute, ok } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getTime() - 30 * 24 * 3600 * 1000)

    const sb = await adminDb()

    // 1. Daily Active Users Trend
    const { data: usersData } = await sb
      .from("users")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
    const userTrendBuckets: { label: string; value: number }[] = []
    
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 3600 * 1000)
      userTrendBuckets.push({
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: 0
      })
    }
    
    (usersData || []).forEach(u => {
      const d = new Date(u.created_at)
      const idx = Math.floor((d.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
      if (idx >= 0 && idx < userTrendBuckets.length) {
        userTrendBuckets[idx].value += 1
      }
    })

    // 2. Conversion Funnel
    // We will estimate from events in analytics_events + core tables
    const [qrScansRes, photosRes, aiSearchesRes, pageVisitsRes] = await Promise.all([
      sb.from("qr_codes").select("scan_count").gte("created_at", startDate.toISOString()),
      sb.from("photos").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()),
      sb.from("face_search_logs").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString()),
      sb.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", startDate.toISOString())
    ])

    const qrScans = (qrScansRes.data || []).reduce((sum, q) => sum + (q.scan_count || 0), 0)
    const photoUploads = photosRes.count || 0
    const aiSearches = aiSearchesRes.count || 0
    // Real tracked page visits from analytics_events. Every QR scan is also a
    // visit, so the true visit count can't be lower than qrScans — but we no
    // longer pad it with an arbitrary made-up number when analytics is thin.
    const totalVisits = Math.max(pageVisitsRes.count || 0, qrScans)

    const funnel = [
      { step: "Visitor Landings", val: totalVisits, percent: "100%", size: "w-full bg-violet-100 text-violet-750" },
      { step: "Event QR Scans", val: qrScans, percent: totalVisits ? Math.round((qrScans / totalVisits) * 100) + "%" : "0%", size: `w-[${totalVisits ? Math.round((qrScans / totalVisits) * 100) : 0}%] bg-violet-200 text-violet-750` },
      { step: "Photo Uploaded", val: photoUploads, percent: qrScans ? Math.round((photoUploads / qrScans) * 100) + "%" : "0%", size: `w-[${qrScans ? Math.round((photoUploads / qrScans) * 100) : 0}%] bg-violet-300 text-violet-700` },
      { step: "AI Search Completed", val: aiSearches, percent: photoUploads ? Math.round((aiSearches / photoUploads) * 100) + "%" : "0%", size: `w-[${photoUploads ? Math.round((aiSearches / photoUploads) * 100) : 0}%] bg-violet-400 text-white` },
    ]

    // 3. Device Types Distribution (using user_agent from analytics_events)
    const { data: analyticsEvents } = await sb
      .from("analytics_events")
      .select("user_agent")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    const devices = { iOS: 0, Android: 0, Windows: 0, Mac: 0, Other: 0 }
    let deviceTotal = 0;
    (analyticsEvents || []).forEach(e => {
      const ua = (e.user_agent || "").toLowerCase()
      if (!ua) return
      deviceTotal++
      if (ua.includes("iphone") || ua.includes("ipad")) devices.iOS++
      else if (ua.includes("android")) devices.Android++
      else if (ua.includes("windows")) devices.Windows++
      else if (ua.includes("macintosh") || ua.includes("mac os")) devices.Mac++
      else devices.Other++
    })
    
    // No fabricated fallback — if no user_agent data has been captured yet,
    // report an honest empty state instead of made-up percentages.
    const deviceDistribution = deviceTotal === 0 ? [] : [
      { type: "iOS Safari/Chrome", percent: Math.round((devices.iOS / deviceTotal) * 100) + "%", count: devices.iOS },
      { type: "Android Chrome", percent: Math.round((devices.Android / deviceTotal) * 100) + "%", count: devices.Android },
      { type: "Desktop Mac/PC", percent: Math.round(((devices.Windows + devices.Mac) / deviceTotal) * 100) + "%", count: devices.Windows + devices.Mac },
      { type: "Others", percent: Math.round((devices.Other / deviceTotal) * 100) + "%", count: devices.Other },
    ]

    // 4. Acquisition Referrers — we only actually track QR-code scans as a
    // traffic source right now (no UTM/referrer capture exists yet), so
    // "Organic"/"Social" splits are not reported rather than guessed.
    const referrers = qrScans === 0 ? [] : [
      { source: "Direct (QR Code Scans)", percent: "100%", visits: qrScans },
    ]

    // 5. Top Features Utilized
    const [zipsRes] = await Promise.all([
      sb.from("audit_logs").select("id", { count: "exact" }).eq("action", "gallery.download")
    ])
    
    const zipDownloads = zipsRes.count || 0
    const totalFeatures = aiSearches + photoUploads + zipDownloads || 1

    const features = [
      { feature: "AI Selfie Search", matches: `${aiSearches} hits`, load: aiSearches / totalFeatures },
      { feature: "Photo Uploads", matches: `${photoUploads} uploads`, load: photoUploads / totalFeatures },
      { feature: "Bulk Photo Zip Download", matches: `${zipDownloads} downloads`, load: zipDownloads / totalFeatures },
    ]

    return ok({
      userTrend: userTrendBuckets,
      funnel,
      deviceDistribution,
      referrers,
      features
    })
  }
}).GET
