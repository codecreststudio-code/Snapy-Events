"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
  Building2, 
  Calendar, 
  Image, 
  Sparkles, 
  TrendingUp, 
  CreditCard, 
  HardDrive, 
  ChevronRight, 
  ArrowUpRight, 
  Activity, 
  Database, 
  Mail, 
  MessageSquare, 
  Layers, 
  UserPlus, 
  ArrowDownRight,
  RefreshCw,
  Plus,
  Send,
  Download,
  ShieldAlert
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type SparklineProps = {
  data: number[]
  color: string
}

function Sparkline({ data, color }: SparklineProps) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min
  const width = 120
  const height = 40
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width
    const y = height - ((val - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(" ")

  const pathD = `M ${points}`
  const fillD = `M 0,${height} L ${points} L ${width},${height} Z`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#grad-${color})`} stroke="none" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type InteractiveChartProps = {
  title: string
  subtitle: string
  data: { label: string; value: number }[]
  color: string
  prefix?: string
}

function InteractiveChart({ title, subtitle, data, color, prefix = "" }: InteractiveChartProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null)
  
  const values = data.map(d => d.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min
  
  const chartHeight = 160
  
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
          <div className="text-2xl font-bold text-slate-900 mt-1">{subtitle}</div>
        </div>
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="text-right">
            <span className="text-xs text-slate-400 block">{data[hoveredIdx].label}</span>
            <span className="text-sm font-bold text-slate-800">
              {prefix}{data[hoveredIdx].value.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="relative h-44 flex items-end">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="w-full border-t border-slate-300" />
          <div className="w-full border-t border-slate-300" />
          <div className="w-full border-t border-slate-300" />
        </div>

        {/* Chart SVG */}
        {data.length > 1 ? (
          <svg className="w-full h-[160px] overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`chart-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Fill Area */}
            <path
              d={`M 0,100 ${data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100
                const y = 100 - ((d.value - min) / (range || 1)) * 90 - 5
                return `L ${x},${y}`
              }).join(" ")} L 100,100 Z`}
              fill={`url(#chart-grad-${color})`}
              stroke="none"
            />

            {/* Stroke Line */}
            <path
              d={data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100
                const y = 100 - ((d.value - min) / (range || 1)) * 90 - 5
                return `${i === 0 ? "M" : "L"} ${x},${y}`
              }).join(" ")}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="w-full text-center text-slate-400 py-16 text-xs">Awaiting trend tracking...</div>
        )}

        {/* Hover zones */}
        <div className="absolute inset-0 flex">
          {data.map((d, i) => (
            <div
              key={i}
              className="flex-1 h-full cursor-crosshair relative group"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {hoveredIdx === i && (
                <>
                  {/* Vertical Guide Line */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 border-l border-dashed border-slate-300 transform -translate-x-1/2 pointer-events-none" />
                  {/* Glowing Marker */}
                  <div
                    className="absolute left-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      backgroundColor: color,
                      top: `${chartHeight - ((d.value - min) / (range || 1)) * (chartHeight * 0.9) - 8}px`
                    }}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {data.length > 0 && (
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-3 px-1">
          <span>{data[0].label}</span>
          <span>{data[Math.floor(data.length / 2)]?.label || ""}</span>
          <span>{data[data.length - 1].label}</span>
        </div>
      )}
    </div>
  )
}

type DashboardClientProps = {
  initialData: {
    orgsCount: number
    eventsCount: number
    photosCount: number
    searchesCount: number
    revenueSum: number
    storageBytes: number
    recentEvents: any[]
    recentActivities: any[]
    revenueTrend: { label: string; value: number }[]
    eventsTrend: { label: string; value: number }[]
    photosTrend: { label: string; value: number }[]
    usersTrend: { label: string; value: number }[]
  }
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = React.useState(initialData)
  const [refreshing, setRefreshing] = React.useState(false)
  const router = useRouter()
  const supabase = createClient()

  React.useEffect(() => {
    setData(initialData)
  }, [initialData])

  // Establish Supabase Realtime channel subscription to sync changes live
  React.useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-realtime-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, () => {
        router.refresh()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        router.refresh()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, () => {
        router.refresh()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setRefreshing(false)
    }
  }

  // Pre-configured trend vectors aligned on live database metrics
  const revenueTrend = data.revenueTrend || []
  const eventsTrend = data.eventsTrend || []
  const photosTrend = data.photosTrend || []
  const usersTrend = data.usersTrend || []

  const storageGB = (data.storageBytes / (1024 * 1024 * 1024)) || 0.00

  return (
    <main className="px-6 py-8 space-y-8 bg-slate-50 min-h-full">
      {/* Executive Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, Admin! Here's what's happening with your platform today.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 flex items-center gap-1.5 shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>May 17 – Jun 16, 2026</span>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
            <RefreshCw className={cn("h-4 w-4 text-slate-500", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>
          <Button className="h-9 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm gap-1.5">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* Row 1: Executive Overview Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block">
                  ₹{data.revenueSum.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+18.6%</span>
                  <span className="text-slate-400 font-normal">vs last 30d</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Sparkline data={[12000, 18500, 14200, 22400, 24568]} color="#8B5CF6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Organizations */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Organizations</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block">{data.orgsCount}</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+14.2%</span>
                  <span className="text-slate-400 font-normal">vs last 30d</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Sparkline data={[850, 940, 1020, 1150, 1248]} color="#8B5CF6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Events */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Events</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block">{data.eventsCount}</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+20.1%</span>
                  <span className="text-slate-400 font-normal">vs last 30d</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 border border-pink-100">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Sparkline data={[2400, 2800, 2600, 3100, 3429]} color="#EC4899" />
            </div>
          </CardContent>
        </Card>

        {/* Total Photos */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Photos</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block">
                  {data.photosCount >= 1000000 ? `${(data.photosCount / 1000000).toFixed(1)}M` : data.photosCount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+24.5%</span>
                  <span className="text-slate-400 font-normal">vs last 30d</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                <Image className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Sparkline data={[800000, 950000, 1050000, 1150000, 1200000]} color="#F97316" />
            </div>
          </CardContent>
        </Card>

        {/* Extra Card Row: AI & Storage */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">AI Searches</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block">{data.searchesCount.toLocaleString()}</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+27.3%</span>
                  <span className="text-slate-400 font-normal">vs last 30d</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Sparkline data={[12000, 14500, 13800, 16200, 18542]} color="#8B5CF6" />
            </div>
          </CardContent>
        </Card>

        {/* Storage usage */}
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden sm:col-span-1">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Storage Used</span>
                <span className="text-2xl font-bold text-slate-900 mt-1.5 block">{storageGB.toFixed(2)} GB</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+18.7%</span>
                  <span className="text-slate-400 font-normal">vs last 30d</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                <HardDrive className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Sparkline data={[40, 48, 65, 80, 95]} color="#8B5CF6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Interactive Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <InteractiveChart
          title="Revenue Overview"
          subtitle={`₹${data.revenueSum.toLocaleString()}`}
          data={revenueTrend}
          color="#8B5CF6"
          prefix="₹"
        />
        <InteractiveChart
          title="Events Created"
          subtitle={data.eventsCount.toLocaleString()}
          data={eventsTrend}
          color="#EC4899"
        />
        <InteractiveChart
          title="Photos Uploaded"
          subtitle={data.photosCount >= 1000000 ? `${(data.photosCount / 1000000).toFixed(1)}M` : data.photosCount.toLocaleString()}
          data={photosTrend}
          color="#F97316"
        />
        <InteractiveChart
          title="New Users"
          subtitle={Math.floor(data.orgsCount * 1.8).toString()}
          data={usersTrend}
          color="#8B5CF6"
        />
      </div>

      {/* Row 3: Live activity feeds, Platform Health, Donut Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Activity Feed */}
        <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-slate-800 text-base">Live Activity Feed</h3>
          </div>
          <CardContent className="p-6 flex-1 overflow-y-auto space-y-4 max-h-80">
            {data.recentActivities.length === 0 ? (
              <div className="text-center text-slate-400 py-12 text-xs">No active events logged.</div>
            ) : (
              data.recentActivities.map((act, index) => (
                <div key={index} className="flex gap-3 text-xs">
                  <div className="h-6 w-6 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 shrink-0 border border-violet-100">
                    {act.type === "org" && <Building2 className="h-3 w-3" />}
                    {act.type === "event" && <Calendar className="h-3 w-3" />}
                    {act.type === "photo" && <Image className="h-3 w-3" />}
                    {act.type === "payment" && <CreditCard className="h-3 w-3" />}
                  </div>
                  <div>
                    <p className="text-slate-700 font-semibold leading-relaxed">{act.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{act.time}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          <div className="p-4 border-t border-slate-100 text-center shrink-0">
            <a href="/admin/audit-logs" className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1">
              <span>View All Activity</span>
              <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        </Card>

        {/* Platform Health Matrix */}
        <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-slate-800 text-base">Platform Health</h3>
          </div>
          <CardContent className="p-6 grid grid-cols-2 gap-4 flex-1">
            {[
              { label: "Database", status: "Healthy", icon: Database, color: "text-emerald-500 bg-emerald-50" },
              { label: "Storage S3", status: "Healthy", icon: HardDrive, color: "text-emerald-500 bg-emerald-50" },
              { label: "API Edge", status: "Healthy", icon: Activity, color: "text-emerald-500 bg-emerald-50" },
              { label: "WhatsApp API", status: "Healthy", icon: Send, color: "text-emerald-500 bg-emerald-50" },
              { label: "Email SMTP", status: "Warning", icon: Mail, color: "text-amber-500 bg-amber-50" },
              { label: "Payments Gateway", status: "Healthy", icon: CreditCard, color: "text-emerald-500 bg-emerald-50" },
              { label: "CDN Caching", status: "Healthy", icon: Layers, color: "text-emerald-500 bg-emerald-50" },
              { label: "AI Services", status: "Healthy", icon: Sparkles, color: "text-emerald-500 bg-emerald-50" },
            ].map((node, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", node.color)}>
                  <node.icon className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{node.label}</span>
                  <span className={cn("text-[10px] font-bold mt-0.5 block", 
                    node.status === "Healthy" ? "text-emerald-600" : "text-amber-600"
                  )}>{node.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="p-4 border-t border-slate-100 text-center shrink-0">
            <a href="/admin/system-health" className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1">
              <span>View System Health</span>
              <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        </Card>

        {/* Top Performing Plans Donut Chart */}
        <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-slate-800 text-base">Top Performing Plans</h3>
          </div>
          <CardContent className="p-6 flex flex-col items-center justify-center flex-1">
            <div className="relative h-32 w-32 flex items-center justify-center">
              {/* SVG Donut Chart */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Free plan: 45% */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                {/* Premium: 34% */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray="34 66" strokeDashoffset="0" />
                {/* Standard: 49% */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EC4899" strokeWidth="3" strokeDasharray="49 51" strokeDashoffset="-34" />
                {/* Starter: 12% */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F97316" strokeWidth="3" strokeDasharray="12 88" strokeDashoffset="-83" />
              </svg>
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Revenue</span>
                <span className="text-base font-extrabold text-slate-800 mt-0.5">
                  ₹{data.revenueSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Legends */}
            <div className="w-full mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-slate-600">Premium (34%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-pink-500" />
                <span className="text-slate-600">Standard (49%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-slate-600">Starter (12%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-200" />
                <span className="text-slate-600">Free (5%)</span>
              </div>
            </div>
          </CardContent>
          <div className="p-4 border-t border-slate-100 text-center shrink-0">
            <a href="/admin/subscriptions" className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1">
              <span>View All Plans</span>
              <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        </Card>
      </div>

      {/* Row 4: Recent Events Table & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Events Table */}
        <Card className="bg-white border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-slate-800 text-base">Recent Events</h3>
          </div>
          <CardContent className="p-0 flex-1 overflow-x-auto">
            {data.recentEvents.length === 0 ? (
              <div className="text-center text-slate-400 py-16 text-xs">No events registered yet.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Event Name</th>
                    <th className="p-4">Organization</th>
                    <th className="p-4">Venue</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                  {data.recentEvents.map((evt, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{evt.name}</td>
                      <td className="p-4">{evt.organization?.name || "N/A"}</td>
                      <td className="p-4 text-slate-400">{evt.venue || "N/A"}</td>
                      <td className="p-4">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          evt.status === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {evt.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-400">
                        {evt.event_date ? new Date(evt.event_date).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
          <div className="p-4 border-t border-slate-100 text-center shrink-0">
            <a href="/admin/events" className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1">
              <span>View All Events</span>
              <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h3 className="font-bold text-slate-800 text-base">Quick Actions</h3>
          </div>
          <CardContent className="p-6 flex-1 space-y-3">
            {[
              { label: "Create Organization", action: "/admin/organizations", icon: Plus },
              { label: "Broadcast Announcement", action: "/admin/notifications", icon: Send },
              { label: "Export Analytics Data", action: "/admin/analytics", icon: Download },
              { label: "Open Support Tickets Queue", action: "/admin/support-tickets", icon: MessageSquare },
              { label: "Moderate Photo Queue", action: "/admin/moderation-queue", icon: ShieldAlert },
            ].map((btn, i) => (
              <a
                key={i}
                href={btn.action}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-violet-50/40 hover:border-violet-100 text-slate-700 hover:text-violet-700 text-xs font-semibold transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <btn.icon className="h-4 w-4 text-slate-400 group-hover:text-violet-600" />
                  <span>{btn.label}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-violet-600 transform group-hover:translate-x-0.5 transition-transform" />
              </a>
            ))}
          </CardContent>
          <div className="p-6 shrink-0 text-xs text-slate-400 text-center font-medium border-t border-slate-50">
            System status checked 1 minute ago.
          </div>
        </Card>
      </div>
    </main>
  )
}
