import { defineRoute, ok } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"
import { DEFAULT_GUEST_BOOSTS, DEFAULT_SHOT_BOOSTS } from "@/lib/constants"

// Helper to partition dates by dynamic intervals (hour, day, week, month)
function generateTrendBuckets(startDate: Date, endDate: Date) {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const buckets: { start: Date; end: Date; label: string }[] = []

  if (diffDays <= 1) {
    // Group by 4-hour intervals
    for (let i = 0; i < 24; i += 4) {
      const start = new Date(startDate.getTime())
      start.setHours(i, 0, 0, 0)
      const end = new Date(startDate.getTime())
      end.setHours(i + 4, 0, 0, 0)
      const label = `${i.toString().padStart(2, "0")}:00`
      buckets.push({ start, end, label })
    }
  } else if (diffDays <= 7) {
    // Group by days
    for (let i = 0; i < diffDays; i++) {
      const start = new Date(startDate.getTime() + i * 24 * 3600 * 1000)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start.getTime() + 24 * 3600 * 1000)
      const label = start.toLocaleDateString("en-US", { weekday: "short" })
      buckets.push({ start, end, label })
    }
  } else if (diffDays <= 31) {
    // Group into 5 clean buckets
    const intervalDays = Math.ceil(diffDays / 5)
    for (let i = 0; i < 5; i++) {
      const start = new Date(startDate.getTime() + i * intervalDays * 24 * 3600 * 1000)
      const end = new Date(startDate.getTime() + (i + 1) * intervalDays * 24 * 3600 * 1000)
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      buckets.push({ start, end, label })
    }
  } else {
    // Group into 6 clean buckets
    const intervalDays = Math.ceil(diffDays / 6)
    for (let i = 0; i < 6; i++) {
      const start = new Date(startDate.getTime() + i * intervalDays * 24 * 3600 * 1000)
      const end = new Date(startDate.getTime() + (i + 1) * intervalDays * 24 * 3600 * 1000)
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      buckets.push({ start, end, label })
    }
  }

  return buckets
}

function calculateGrowth(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getTime() - 30 * 24 * 3600 * 1000) // Default last 30 days

    const duration = endDate.getTime() - startDate.getTime()
    const prevEndDate = new Date(startDate.getTime())
    const prevStartDate = new Date(startDate.getTime() - duration)

    const sb = await adminDb()

    // 1. Fetch Current & Previous totals for KPI Growth Calculations
    const [
      currRevenueRes, prevRevenueRes,
      currOrgsRes, prevOrgsRes,
      currEventsRes, prevEventsRes,
      currPhotosRes, prevPhotosRes,
      currVideosRes, prevVideosRes,
      currVoiceNotesRes, prevVoiceNotesRes,
      currSearchesRes, prevSearchesRes,
      currStorageRes, prevStorageRes,
      currUsersRes, prevUsersRes
    ] = await Promise.all([
      sb.from("transactions").select("amount").eq("status", "success").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("transactions").select("amount").eq("status", "success").gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("organizations").select("id", { count: "exact" }).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("organizations").select("id", { count: "exact" }).gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("events").select("id", { count: "exact" }).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("events").select("id", { count: "exact" }).gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).or("mime_type.is.null,mime_type.ilike.image/%").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).or("mime_type.is.null,mime_type.ilike.image/%").gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).ilike("mime_type", "video/%").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).ilike("mime_type", "video/%").gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).ilike("mime_type", "audio/%").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).ilike("mime_type", "audio/%").gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("face_search_logs").select("id", { count: "exact" }).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("face_search_logs").select("id", { count: "exact" }).gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("photos").select("file_size").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("photos").select("file_size").gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("users").select("id", { count: "exact" }).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("users").select("id", { count: "exact" }).gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString())
    ])

    // KPI current sums
    const currRevenueSum = (currRevenueRes.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100
    const prevRevenueSum = (prevRevenueRes.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100
    const currOrgsSum = currOrgsRes.count ?? 0
    const prevOrgsSum = prevOrgsRes.count ?? 0
    const currEventsSum = currEventsRes.count ?? 0
    const prevEventsSum = prevEventsRes.count ?? 0
    const currPhotosSum = currPhotosRes.count ?? 0
    const prevPhotosSum = prevPhotosRes.count ?? 0
    const currVideosSum = currVideosRes.count ?? 0
    const prevVideosSum = prevVideosRes.count ?? 0
    const currVoiceNotesSum = currVoiceNotesRes.count ?? 0
    const prevVoiceNotesSum = prevVoiceNotesRes.count ?? 0
    const currSearchesSum = currSearchesRes.count ?? 0
    const prevSearchesSum = prevSearchesRes.count ?? 0
    const currStorageSum = (currStorageRes.data || []).reduce((s, p) => s + Number(p.file_size || 0), 0)
    const prevStorageSum = (prevStorageRes.data || []).reduce((s, p) => s + Number(p.file_size || 0), 0)
    const currUsersSum = currUsersRes.count ?? 0
    const prevUsersSum = prevUsersRes.count ?? 0

    // Calculate growth percentages
    const revenueGrowth = calculateGrowth(currRevenueSum, prevRevenueSum)
    const orgsGrowth = calculateGrowth(currOrgsSum, prevOrgsSum)
    const eventsGrowth = calculateGrowth(currEventsSum, prevEventsSum)
    const photosGrowth = calculateGrowth(currPhotosSum, prevPhotosSum)
    const videosGrowth = calculateGrowth(currVideosSum, prevVideosSum)
    const voiceNotesGrowth = calculateGrowth(currVoiceNotesSum, prevVoiceNotesSum)
    const searchesGrowth = calculateGrowth(currSearchesSum, prevSearchesSum)
    const storageGrowth = calculateGrowth(currStorageSum, prevStorageSum)
    const usersGrowth = calculateGrowth(currUsersSum, prevUsersSum)

    // 2. Fetch Cumulative absolute totals to display on Cards
    const [
      allRevenueRes,
      allOrgsRes,
      allEventsRes,
      allPhotosRes,
      allVideosRes,
      allVoiceNotesRes,
      allSearchesRes,
      allStorageUsage,
      allUsersRes
    ] = await Promise.all([
      sb.from("transactions").select("amount").eq("status", "success").lte("created_at", endDate.toISOString()),
      sb.from("organizations").select("id", { count: "exact" }).lte("created_at", endDate.toISOString()),
      sb.from("events").select("id", { count: "exact" }).lte("created_at", endDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).or("mime_type.is.null,mime_type.ilike.image/%").lte("created_at", endDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).ilike("mime_type", "video/%").lte("created_at", endDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).ilike("mime_type", "audio/%").lte("created_at", endDate.toISOString()),
      sb.from("face_search_logs").select("id", { count: "exact" }).lte("created_at", endDate.toISOString()),
      sb.from("storage_usage").select("total_bytes"),
      sb.from("users").select("id", { count: "exact" }).lte("created_at", endDate.toISOString())
    ])

    const totalRevenueCumulative = (allRevenueRes.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100
    const totalOrgsCumulative = allOrgsRes.count ?? 0
    const totalEventsCumulative = allEventsRes.count ?? 0
    const totalPhotosCumulative = allPhotosRes.count ?? 0
    const totalVideosCumulative = allVideosRes.count ?? 0
    const totalVoiceNotesCumulative = allVoiceNotesRes.count ?? 0
    const totalSearchesCumulative = allSearchesRes.count ?? 0
    const totalStorageCumulative = (allStorageUsage.data || []).reduce((s, su) => s + Number(su.total_bytes || 0), 0)
    const totalUsersCumulative = allUsersRes.count ?? 0

    // 3. Fetch detailed datasets to group into buckets for trends
    const [
      txsTrendData,
      eventsTrendData,
      photosTrendData,
      usersTrendData
    ] = await Promise.all([
      sb.from("transactions").select("amount, created_at").eq("status", "success").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("events").select("created_at").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("photos").select("created_at").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("users").select("created_at").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
    ])

    // Generate buckets
    const buckets = generateTrendBuckets(startDate, endDate)
    const revenueTrend = buckets.map(b => ({ label: b.label, value: 0 }))
    const eventsTrend = buckets.map(b => ({ label: b.label, value: 0 }))
    const photosTrend = buckets.map(b => ({ label: b.label, value: 0 }))
    const usersTrend = buckets.map(b => ({ label: b.label, value: 0 }))

    // Fill buckets
    const matchBucketIndex = (timeStr: string) => {
      const t = new Date(timeStr).getTime()
      return buckets.findIndex(b => t >= b.start.getTime() && t < b.end.getTime())
    };

    (txsTrendData.data || []).forEach(tx => {
      const idx = matchBucketIndex(tx.created_at)
      if (idx !== -1) revenueTrend[idx].value += (tx.amount || 0) / 100
    });

    (eventsTrendData.data || []).forEach(ev => {
      const idx = matchBucketIndex(ev.created_at)
      if (idx !== -1) eventsTrend[idx].value++
    });

    (photosTrendData.data || []).forEach(ph => {
      const idx = matchBucketIndex(ph.created_at)
      if (idx !== -1) photosTrend[idx].value++
    });

    (usersTrendData.data || []).forEach(usr => {
      const idx = matchBucketIndex(usr.created_at)
      if (idx !== -1) usersTrend[idx].value++
    })

    // 4. AI Searches Analytics
    const { data: currSearchLogs } = await sb
      .from("face_search_logs")
      .select("result_count, search_duration_ms, threshold_used")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    const totalSearchesLogs = currSearchLogs?.length || 0
    const successfulMatches = currSearchLogs?.filter(l => (l.result_count ?? 0) > 0).length || 0
    const failedSearches = totalSearchesLogs - successfulMatches
    const totalDuration = currSearchLogs?.reduce((sum, l) => sum + (l.search_duration_ms || 0), 0) || 0
    const avgDuration = totalSearchesLogs > 0 ? Math.round(totalDuration / totalSearchesLogs) : 0
    const totalThreshold = currSearchLogs?.reduce((sum, l) => sum + (l.threshold_used || 0), 0) || 0
    const avgConfidence = totalSearchesLogs > 0 ? Number((totalThreshold / totalSearchesLogs).toFixed(2)) : 0

    // 5. Recent Events with rich stats (guest counts, media uploads, revenue)
    const { data: eventsList } = await sb
      .from("events")
      .select("id, name, venue, status, created_at, organization_id, organization:organizations(name)")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(10)

    const richEvents = await Promise.all((eventsList || []).map(async (e: any) => {
      const [guestsCountRes, photosCountRes, videosCountRes, organizationRevenueRes] = await Promise.all([
        sb.from("photo_access").select("id", { count: "exact", head: true }).eq("event_id", e.id).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
        sb.from("photos").select("id", { count: "exact", head: true }).eq("event_id", e.id).or("mime_type.is.null,mime_type.ilike.image/%").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
        sb.from("photos").select("id", { count: "exact", head: true }).eq("event_id", e.id).ilike("mime_type", "video/%").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
        sb.from("transactions").select("amount").eq("organization_id", e.organization_id || "").eq("status", "success").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
      ])

      const orgRevenue = (organizationRevenueRes.data || []).reduce((sum, t) => sum + (t.amount || 0), 0) / 100

      return {
        id: e.id,
        name: e.name,
        venue: e.venue || "N/A",
        status: e.status,
        created_at: e.created_at,
        organization: e.organization?.name || "N/A",
        guestsCount: guestsCountRes.count ?? 0,
        photosCount: photosCountRes.count ?? 0,
        videosCount: videosCountRes.count ?? 0,
        revenue: orgRevenue
      }
    }))

    // 6. Live activity feed generated dynamically from actual DB updates
    const [recentOrgs, recentEventsList, recentPhotos, recentSuccessTxs] = await Promise.all([
      sb.from("organizations").select("name, created_at").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()).order("created_at", { ascending: false }).limit(10),
      sb.from("events").select("name, created_at").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()).order("created_at", { ascending: false }).limit(10),
      sb.from("photos").select("mime_type, created_at, uploader_name").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()).order("created_at", { ascending: false }).limit(10),
      sb.from("transactions").select("amount, created_at, organization:organizations(name)").eq("status", "success").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()).order("created_at", { ascending: false }).limit(10),
    ])

    const dynamicFeed: any[] = []
    
    if (recentOrgs.data) {
      recentOrgs.data.forEach(o => {
        dynamicFeed.push({
          type: "org",
          message: `New organization '${o.name}' registered.`,
          time: new Date(o.created_at).toLocaleDateString(),
          rawTime: new Date(o.created_at).getTime(),
        })
      })
    }

    if (recentEventsList.data) {
      recentEventsList.data.forEach(ev => {
        dynamicFeed.push({
          type: "event",
          message: `New event '${ev.name}' was created.`,
          time: new Date(ev.created_at).toLocaleDateString(),
          rawTime: new Date(ev.created_at).getTime(),
        })
      })
    }

    if (recentPhotos.data) {
      recentPhotos.data.forEach(ph => {
        const isVid = ph.mime_type && ph.mime_type.startsWith("video/")
        const isAudio = ph.mime_type && ph.mime_type.startsWith("audio/")
        let mediaType = "photo"
        if (isVid) mediaType = "video"
        else if (isAudio) mediaType = "voice note"
        
        dynamicFeed.push({
          type: "photo",
          message: `${ph.uploader_name || "Guest"} uploaded a new ${mediaType}.`,
          time: new Date(ph.created_at).toLocaleDateString(),
          rawTime: new Date(ph.created_at).getTime(),
        })
      })
    }

    if (recentSuccessTxs.data) {
      recentSuccessTxs.data.forEach(t => {
        dynamicFeed.push({
          type: "payment",
          message: `Payment of ₹${(t.amount/100).toLocaleString()} received from '${(t.organization as any)?.name || 'Member'}'.`,
          time: new Date(t.created_at).toLocaleDateString(),
          rawTime: new Date(t.created_at).getTime(),
        })
      })
    }

    dynamicFeed.sort((a, b) => b.rawTime - a.rawTime)
    const activeFeed = dynamicFeed.slice(0, 10).map(f => ({ type: f.type, message: f.message, time: f.time }))

    // 7. Advanced Analytics (Top Organization revenue, plans, etc.)
    const { data: orgsTopList } = await sb.from("organizations").select("id, name")
    const topOrgsRevenue = await Promise.all((orgsTopList || []).map(async (org) => {
      const { data: txs } = await sb.from("transactions").select("amount").eq("organization_id", org.id).eq("status", "success").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
      const sum = (txs || []).reduce((s, t) => s + (t.amount || 0), 0) / 100
      return { name: org.name, revenue: sum }
    }))
    const sortedTopOrgs = topOrgsRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    const { data: topEventsList } = await sb.from("events").select("id, name, organization:organizations(name)").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
    const topEventsMedia = await Promise.all((topEventsList || []).map(async (ev) => {
      const { count } = await sb.from("photos").select("id", { count: "exact", head: true }).eq("event_id", ev.id).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
      return { name: ev.name, org: (ev.organization as any)?.name || "N/A", count: count ?? 0 }
    }))
    const sortedTopEvents = topEventsMedia.sort((a, b) => b.count - a.count).slice(0, 5)

    // Attributing top revenue sources
    const { data: successTxsList } = await sb.from("transactions").select("amount, notes").eq("status", "success").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
    let planRevenue = 0;
    let addonRevenue = 0;
    
    (successTxsList || []).forEach((t: any) => {
      const amt = (t.amount || 0) / 100
      const notes = (t.notes as Record<string, any>) || {}
      const hasAddons = notes.guest_boost || notes.shots_boost
      
      if (hasAddons) {
        let addonCost = 0
        const gb = parseInt(notes.guest_boost || "0")
        const sb = parseInt(notes.shots_boost || "0")
        
        if (gb === 10) addonCost += 199
        else if (gb === 25) addonCost += 399
        else if (gb === 50) addonCost += 699
        else if (gb === 100) addonCost += 1199
        
        if (sb === 5) addonCost += 99
        else if (sb === 10) addonCost += 179
        else if (sb === 15) addonCost += 249
        
        const attributedAddon = Math.min(amt, addonCost)
        addonRevenue += attributedAddon
        planRevenue += (amt - attributedAddon)
      } else {
        planRevenue += amt
      }
    })

    // Plan count distributions
    const { data: activeOrgsPlans } = await sb.from("organizations").select("plan").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString())
    const planDistribution: Record<string, number> = { free: 0, starter: 0, standard: 0, premium: 0 }
    let totalActiveOrgs = 0;
    
    (activeOrgsPlans || []).forEach((o: any) => {
      if (o.plan in planDistribution) {
        planDistribution[o.plan]++
        totalActiveOrgs++
      }
    })

    const finalPlanPerc = Object.keys(planDistribution).reduce((acc: any, p) => {
      acc[p] = totalActiveOrgs > 0 ? Math.round((planDistribution[p] / totalActiveOrgs) * 100) : 0
      return acc
    }, {})

    return ok({
      metrics: {
        revenue: { total: totalRevenueCumulative, current: currRevenueSum, previous: prevRevenueSum, growth: revenueGrowth },
        orgs: { total: totalOrgsCumulative, current: currOrgsSum, previous: prevOrgsSum, growth: orgsGrowth },
        events: { total: totalEventsCumulative, current: currEventsSum, previous: prevEventsSum, growth: eventsGrowth },
        photos: { total: totalPhotosCumulative, current: currPhotosSum, previous: prevPhotosSum, growth: photosGrowth },
        videos: { total: totalVideosCumulative, current: currVideosSum, previous: prevVideosSum, growth: videosGrowth },
        voiceNotes: { total: totalVoiceNotesCumulative, current: currVoiceNotesSum, previous: prevVoiceNotesSum, growth: voiceNotesGrowth },
        searches: { total: totalSearchesCumulative, current: currSearchesSum, previous: prevSearchesSum, growth: searchesGrowth },
        storage: { total: totalStorageCumulative, current: currStorageSum, previous: prevStorageSum, growth: storageGrowth },
        users: { total: totalUsersCumulative, current: currUsersSum, previous: prevUsersSum, growth: usersGrowth }
      },
      trends: {
        revenue: revenueTrend,
        events: eventsTrend,
        photos: photosTrend,
        users: usersTrend
      },
      aiSearchStats: {
        total: totalSearchesLogs,
        successful: successfulMatches,
        failed: failedSearches,
        avgDurationMs: avgDuration,
        avgConfidence: avgConfidence
      },
      recentEvents: richEvents,
      activityFeed: activeFeed,
      topLists: {
        organizations: sortedTopOrgs,
        events: sortedTopEvents,
        plans: finalPlanPerc,
        revenueSources: { plans: planRevenue, addons: addonRevenue }
      }
    })
  },
}).GET
