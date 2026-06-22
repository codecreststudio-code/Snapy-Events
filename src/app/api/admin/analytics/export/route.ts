import { defineRoute, fail } from "@/lib/api/handler"
import { adminDb } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Reuse the bucket generator or price aggregates from route helper
function calculateGrowth(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

const escapeCsv = (val: any) => {
  const str = String(val ?? "").replace(/"/g, '""')
  return `"${str}"`
}

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "csv"
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getTime() - 30 * 24 * 3600 * 1000)

    const duration = endDate.getTime() - startDate.getTime()
    const prevEndDate = new Date(startDate.getTime())
    const prevStartDate = new Date(startDate.getTime() - duration)

    const sb = await adminDb()

    // Load metrics (same calculations as analytics route)
    const [
      currRevenueRes, prevRevenueRes,
      currOrgsRes, prevOrgsRes,
      currEventsRes, prevEventsRes,
      currPhotosRes, prevPhotosRes,
      currSearchesRes, prevSearchesRes,
      currStorageRes, prevStorageRes,
      allRevenueRes,
      allOrgsRes,
      allEventsRes,
      allPhotosRes,
      allSearchesRes,
      allStorageUsage
    ] = await Promise.all([
      sb.from("transactions").select("amount").eq("status", "success").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("transactions").select("amount").eq("status", "success").gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("organizations").select("id", { count: "exact" }).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("organizations").select("id", { count: "exact" }).gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("events").select("id", { count: "exact" }).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("events").select("id", { count: "exact" }).gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).or("mime_type.is.null,mime_type.ilike.image/%").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).or("mime_type.is.null,mime_type.ilike.image/%").gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("face_search_logs").select("id", { count: "exact" }).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("face_search_logs").select("id", { count: "exact" }).gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("photos").select("file_size").gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()),
      sb.from("photos").select("file_size").gte("created_at", prevStartDate.toISOString()).lte("created_at", prevEndDate.toISOString()),
      sb.from("transactions").select("amount").eq("status", "success").lte("created_at", endDate.toISOString()),
      sb.from("organizations").select("id", { count: "exact" }).lte("created_at", endDate.toISOString()),
      sb.from("events").select("id", { count: "exact" }).lte("created_at", endDate.toISOString()),
      sb.from("photos").select("id", { count: "exact" }).or("mime_type.is.null,mime_type.ilike.image/%").lte("created_at", endDate.toISOString()),
      sb.from("face_search_logs").select("id", { count: "exact" }).lte("created_at", endDate.toISOString()),
      sb.from("storage_usage").select("total_bytes")
    ])

    const currRevenueSum = (currRevenueRes.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100
    const prevRevenueSum = (prevRevenueRes.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100
    const currOrgsSum = currOrgsRes.count ?? 0
    const prevOrgsSum = prevOrgsRes.count ?? 0
    const currEventsSum = currEventsRes.count ?? 0
    const prevEventsSum = prevEventsRes.count ?? 0
    const currPhotosSum = currPhotosRes.count ?? 0
    const prevPhotosSum = prevPhotosRes.count ?? 0
    const currSearchesSum = currSearchesRes.count ?? 0
    const prevSearchesSum = prevSearchesRes.count ?? 0
    const currStorageSum = (currStorageRes.data || []).reduce((s, p) => s + Number(p.file_size || 0), 0)
    const prevStorageSum = (prevStorageRes.data || []).reduce((s, p) => s + Number(p.file_size || 0), 0)

    const revenueGrowth = calculateGrowth(currRevenueSum, prevRevenueSum)
    const orgsGrowth = calculateGrowth(currOrgsSum, prevOrgsSum)
    const eventsGrowth = calculateGrowth(currEventsSum, prevEventsSum)
    const photosGrowth = calculateGrowth(currPhotosSum, prevPhotosSum)
    const searchesGrowth = calculateGrowth(currSearchesSum, prevSearchesSum)
    const storageGrowth = calculateGrowth(currStorageSum, prevStorageSum)

    const totalRevenueCumulative = (allRevenueRes.data || []).reduce((s, t) => s + (t.amount || 0), 0) / 100
    const totalOrgsCumulative = allOrgsRes.count ?? 0
    const totalEventsCumulative = allEventsRes.count ?? 0
    const totalPhotosCumulative = allPhotosRes.count ?? 0
    const totalSearchesCumulative = allSearchesRes.count ?? 0
    const totalStorageCumulative = (allStorageUsage.data || []).reduce((s, su) => s + Number(su.total_bytes || 0), 0)

    // Load recent events
    const { data: eventsList } = await sb
      .from("events")
      .select("id, name, venue, status, created_at, organization_id, organization:organizations(name)")
      .order("created_at", { ascending: false })
      .limit(15)

    const richEvents = await Promise.all((eventsList || []).map(async (e: any) => {
      const [guestsCountRes, photosCountRes, videosCountRes, organizationRevenueRes] = await Promise.all([
        sb.from("photo_access").select("id", { count: "exact", head: true }).eq("event_id", e.id),
        sb.from("photos").select("id", { count: "exact", head: true }).eq("event_id", e.id).or("mime_type.is.null,mime_type.ilike.image/%"),
        sb.from("photos").select("id", { count: "exact", head: true }).eq("event_id", e.id).ilike("mime_type", "video/%"),
        sb.from("transactions").select("amount").eq("organization_id", e.organization_id || "").eq("status", "success")
      ])

      const orgRevenue = (organizationRevenueRes.data || []).reduce((sum, t) => sum + (t.amount || 0), 0) / 100

      return {
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

    // Load top performing lists
    const { data: orgsTopList } = await sb.from("organizations").select("id, name")
    const topOrgsRevenue = await Promise.all((orgsTopList || []).map(async (org) => {
      const { data: txs } = await sb.from("transactions").select("amount").eq("organization_id", org.id).eq("status", "success")
      const sum = (txs || []).reduce((s, t) => s + (t.amount || 0), 0) / 100
      return { name: org.name, revenue: sum }
    }))
    const sortedTopOrgs = topOrgsRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    const { data: successTxsList } = await sb.from("transactions").select("amount, notes").eq("status", "success")
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

    const { data: activeOrgsPlans } = await sb.from("organizations").select("plan")
    const planDistribution: Record<string, number> = { free: 0, starter: 0, standard: 0, premium: 0 }
    let totalActiveOrgs = 0;
    
    (activeOrgsPlans || []).forEach((o: any) => {
      if (o.plan in planDistribution) {
        planDistribution[o.plan]++
        totalActiveOrgs++
      }
    })

    // CSV format generation
    if (format === "csv") {
      let csvContent = ""
      csvContent += `"SNAPSY ENTERPRISE PLATFORM EXECUTIVE REPORT"\n`
      csvContent += `"Export Range","${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}"\n`
      csvContent += `"Generated On","${new Date().toLocaleString()}"\n\n`

      csvContent += `"KPI SUMMARY METRICS"\n`
      csvContent += `"Metric","Cumulative Total","Period Value","Previous Period Value","Growth Rate"\n`
      csvContent += `"Total Revenue","₹${totalRevenueCumulative}","₹${currRevenueSum}","₹${prevRevenueSum}","${revenueGrowth}%"\n`
      csvContent += `"Total Organizations","${totalOrgsCumulative}","${currOrgsSum}","${prevOrgsSum}","${orgsGrowth}%"\n`
      csvContent += `"Total Events","${totalEventsCumulative}","${currEventsSum}","${prevEventsSum}","${eventsGrowth}%"\n`
      csvContent += `"Total Photos","${totalPhotosCumulative}","${currPhotosSum}","${prevPhotosSum}","${photosGrowth}%"\n`
      csvContent += `"AI Searches","${totalSearchesCumulative}","${currSearchesSum}","${prevSearchesSum}","${searchesGrowth}%"\n`
      csvContent += `"Storage Size","${(totalStorageCumulative/(1024*1024*1024)).toFixed(2)} GB","${(currStorageSum/(1024*1024*1024)).toFixed(2)} GB","${(prevStorageSum/(1024*1024*1024)).toFixed(2)} GB","${storageGrowth}%"\n\n`

      csvContent += `"TOP PERFORMING ORGANIZATIONS"\n`
      csvContent += `"Organization Name","Attributed Total Revenue (INR)"\n`
      sortedTopOrgs.forEach(org => {
        csvContent += `${escapeCsv(org.name)},"₹${org.revenue}"\n`
      })
      csvContent += `\n`

      csvContent += `"ACTIVE PLANS DISTRIBUTION"\n`
      csvContent += `"Plan Tier","Total Subscribers"\n`
      Object.keys(planDistribution).forEach(p => {
        csvContent += `"${p.toUpperCase()}","${planDistribution[p]}"\n`
      })
      csvContent += `\n`

      csvContent += `"RECENT EVENTS DETAILED LEDGER"\n`
      csvContent += `"Event Name","Hosting Organization","Venue","Status","Created Date","Guests Count","Photos Count","Videos Count","Attributed Organization Revenue"\n`
      richEvents.forEach(evt => {
        csvContent += `${escapeCsv(evt.name)},${escapeCsv(evt.organization)},${escapeCsv(evt.venue)},"${evt.status}","${new Date(evt.created_at).toLocaleDateString()}",${evt.guestsCount},${evt.photosCount},${evt.videosCount},"₹${evt.revenue}"\n`
      })

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=snapsy-analytics-report-${Date.now()}.csv`,
        },
      })
    }

    // PDF Printable HTML format generation
    if (format === "pdf") {
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Snapsy Platform Executive Analytics Report</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #334155;
      background-color: #ffffff;
      margin: 0;
      padding: 40px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #7c3aed;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 10px;
    }
    .meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 5px;
      font-weight: 500;
    }
    .executive-summary {
      background-color: #f8fafc;
      border-left: 4px solid #7c3aed;
      padding: 15px 20px;
      border-radius: 4px;
      margin-bottom: 30px;
      font-size: 13px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 15px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 5px;
    }
    .grid {
      display: grid;
      grid-template-cols: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      background-color: #ffffff;
    }
    .card-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .card-value {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 5px;
    }
    .card-growth {
      font-size: 10px;
      font-weight: 700;
      margin-top: 5px;
    }
    .growth-positive { color: #16a34a; }
    .growth-negative { color: #dc2626; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 35px;
      font-size: 11px;
    }
    th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
      font-size: 9px;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    tr:hover {
      background-color: #f8fafc;
    }
    .text-right { text-align: right; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 700;
    }
    .badge-published { background-color: #d1fae5; color: #065f46; }
    .badge-draft { background-color: #f1f5f9; color: #334155; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div class="logo">Snapsy Events</div>
        <div class="title">Platform Executive Analytics & Operations Report</div>
        <div class="meta">REPORTING PERIOD: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} &nbsp;|&nbsp; GENERATED ON: ${new Date().toLocaleString()}</div>
      </div>
      <button class="no-print" onclick="window.print()" style="background-color: #7c3aed; color: #ffffff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer;">Print / Save as PDF</button>
    </div>
  </div>

  <div class="executive-summary">
    <strong>Executive Report Summary:</strong> During this reporting period, the Snapsy platform hosted a total of <strong>${currEventsSum}</strong> new events. The platform registered <strong>${currOrgsSum}</strong> new organization sign-ups, generating a total subscription billing amount of <strong>₹${currRevenueSum.toLocaleString()}</strong>. Media traffic was active with <strong>${currPhotosSum}</strong> photo and video uploads.
  </div>

  <div class="section-title">Key Performance Indicators</div>
  <div class="grid">
    <div class="card">
      <div class="card-label">Revenue Billing</div>
      <div class="card-value">₹${currRevenueSum.toLocaleString()}</div>
      <div class="card-growth ${revenueGrowth >= 0 ? 'growth-positive' : 'growth-negative'}">
        ${revenueGrowth >= 0 ? '▲' : '▼'} ${Math.abs(revenueGrowth)}% <span style="color:#64748b; font-weight:normal;">vs prev period</span>
      </div>
    </div>
    <div class="card">
      <div class="card-label font-bold">New Organizations</div>
      <div class="card-value">${currOrgsSum}</div>
      <div class="card-growth ${orgsGrowth >= 0 ? 'growth-positive' : 'growth-negative'}">
        ${orgsGrowth >= 0 ? '▲' : '▼'} ${Math.abs(orgsGrowth)}% <span style="color:#64748b; font-weight:normal;">vs prev period</span>
      </div>
    </div>
    <div class="card">
      <div class="card-label">New Events</div>
      <div class="card-value">${currEventsSum}</div>
      <div class="card-growth ${eventsGrowth >= 0 ? 'growth-positive' : 'growth-negative'}">
        ${eventsGrowth >= 0 ? '▲' : '▼'} ${Math.abs(eventsGrowth)}% <span style="color:#64748b; font-weight:normal;">vs prev period</span>
      </div>
    </div>
    <div class="card">
      <div class="card-label">Media Uploads</div>
      <div class="card-value">${currPhotosSum}</div>
      <div class="card-growth ${photosGrowth >= 0 ? 'growth-positive' : 'growth-negative'}">
        ${photosGrowth >= 0 ? '▲' : '▼'} ${Math.abs(photosGrowth)}% <span style="color:#64748b; font-weight:normal;">vs prev period</span>
      </div>
    </div>
    <div class="card">
      <div class="card-label">AI Searches</div>
      <div class="card-value">${currSearchesSum}</div>
      <div class="card-growth ${searchesGrowth >= 0 ? 'growth-positive' : 'growth-negative'}">
        ${searchesGrowth >= 0 ? '▲' : '▼'} ${Math.abs(searchesGrowth)}% <span style="color:#64748b; font-weight:normal;">vs prev period</span>
      </div>
    </div>
    <div class="card">
      <div class="card-label">Storage Growth</div>
      <div class="card-value">${(currStorageSum/(1024*1024*1024)).toFixed(2)} GB</div>
      <div class="card-growth ${storageGrowth >= 0 ? 'growth-positive' : 'growth-negative'}">
        ${storageGrowth >= 0 ? '▲' : '▼'} ${Math.abs(storageGrowth)}% <span style="color:#64748b; font-weight:normal;">vs prev period</span>
      </div>
    </div>
  </div>

  <div style="display: flex; gap: 30px;">
    <div style="flex: 1;">
      <div class="section-title">Top Organizations (Revenue)</div>
      <table>
        <thead>
          <tr>
            <th>Organization</th>
            <th class="text-right">Total Billing</th>
          </tr>
        </thead>
        <tbody>
          ${sortedTopOrgs.map(org => `
            <tr>
              <td><strong>${org.name}</strong></td>
              <td class="text-right">₹${org.revenue.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="flex: 1;">
      <div class="section-title">Active Plans Billing</div>
      <table>
        <thead>
          <tr>
            <th>Plan level</th>
            <th class="text-right">Active Orgs</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(planDistribution).map(plan => `
            <tr>
              <td style="text-transform: uppercase;"><strong>${plan}</strong></td>
              <td class="text-right">${planDistribution[plan]}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section-title">Revenue Splits Summary</div>
  <div style="display:flex; justify-content:space-around; background-color:#f8fafc; padding:20px; border-radius:8px; margin-bottom:30px; font-size:12px; border: 1px solid #e2e8f0;">
    <div><strong>Base Subscriptions Plan Revenue:</strong> ₹${planRevenue.toLocaleString()}</div>
    <div><strong>Add-on Quota Boosts Revenue:</strong> ₹${addonRevenue.toLocaleString()}</div>
    <div><strong>Net Platform Billing:</strong> ₹${(planRevenue + addonRevenue).toLocaleString()}</div>
  </div>

  <div class="section-title">Detailed Event Activity Ledger</div>
  <table>
    <thead>
      <tr>
        <th>Event Name</th>
        <th>Hosting Org</th>
        <th>Venue</th>
        <th>Status</th>
        <th>Created</th>
        <th>Guests</th>
        <th>Photos</th>
        <th>Videos</th>
        <th class="text-right">Org Billings</th>
      </tr>
    </thead>
    <tbody>
      ${richEvents.map(evt => `
        <tr>
          <td><strong>${evt.name}</strong></td>
          <td>${evt.organization}</td>
          <td>${evt.venue}</td>
          <td><span class="badge ${evt.status === 'published' ? 'badge-published' : 'badge-draft'}">${evt.status}</span></td>
          <td>${new Date(evt.created_at).toLocaleDateString()}</td>
          <td>${evt.guestsCount}</td>
          <td>${evt.photosCount}</td>
          <td>${evt.videosCount}</td>
          <td class="text-right">₹${evt.revenue.toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
      `
      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      })
    }

    return fail("INVALID_FORMAT", "Format must be csv or pdf", 400)
  },
}).GET
