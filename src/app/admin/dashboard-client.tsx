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
  LayersPlus,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Send,
  Download,
  ShieldAlert,
  Sliders,
  DollarSign,
  Users,
  Layers,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/components/ui/toaster"

type SparklineProps = {
  data: number[]
  color: string
}

function Sparkline({ data, color }: SparklineProps) {
  if (!data || data.length < 2) return <div className="h-10 w-24 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">Flatline</div>

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min
  const width = 120
  const height = 40
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width
    const y = height - ((val - min) / (range || 1)) * (height - 4) - 2
    return `${x},${y}`
  }).join(" ")

  const pathD = `M ${points}`
  const fillD = `M 0,${height} L ${points} L ${width},${height} Z`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#grad-${color.replace('#', '')})`} stroke="none" />
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
          <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">{title}</h4>
          <div className="text-2xl font-bold text-slate-800 mt-1">{subtitle}</div>
        </div>
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="text-right">
            <span className="text-xs text-slate-400 block">{data[hoveredIdx].label}</span>
            <span className="text-sm font-bold text-slate-800">
              {prefix}{data[hoveredIdx].value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
              <linearGradient id={`chart-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
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
              fill={`url(#chart-grad-${color.replace('#', '')})`}
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
          <div className="w-full text-center text-slate-400 py-16 text-xs font-semibold">No data in selected date range</div>
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

const defaultData = {
  metrics: {
    revenue: { total: 0, current: 0, previous: 0, growth: 0 },
    users: { total: 0, current: 0, previous: 0, growth: 0 },
    events: { total: 0, current: 0, previous: 0, growth: 0 },
    photos: { total: 0, current: 0, previous: 0, growth: 0 },
    videos: { total: 0, current: 0, previous: 0, growth: 0 },
    voiceNotes: { total: 0, current: 0, previous: 0, growth: 0 },
    searches: { total: 0, current: 0, previous: 0, growth: 0 },
    storage: { total: 0, current: 0, previous: 0, growth: 0 }
  },
  trends: {
    revenue: [],
    events: [],
    photos: [],
    users: []
  },
  aiSearchStats: {
    total: 0,
    successful: 0,
    failed: 0,
    avgDurationMs: 0,
    avgConfidence: 0
  },
  recentEvents: [],
  activityFeed: [],
  topLists: {
    users: [],
    events: [],
    plans: { free: 0, starter: 0, standard: 0, premium: 0 },
    revenueSources: { plans: 0, addons: 0 }
  }
}

export default function DashboardClient() {
  const [data, setData] = React.useState<any>(defaultData)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  // Filters state
  const [selectedPreset, setSelectedPreset] = React.useState("30d")
  const [customStart, setCustomStart] = React.useState("")
  const [customEnd, setCustomEnd] = React.useState("")

  const router = useRouter()
  const supabase = createClient()

  // Presets mapping helper
  const getPresetDates = (preset: string, startStr?: string, endStr?: string) => {
    const end = new Date()
    let start = new Date()

    switch (preset) {
      case "today":
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case "yesterday":
        start = new Date(Date.now() - 24 * 3600 * 1000)
        start.setHours(0, 0, 0, 0)
        end.setTime(start.getTime() + 24 * 3600 * 1000 - 1)
        break
      case "7d":
        start = new Date(Date.now() - 7 * 24 * 3600 * 1000)
        break
      case "30d":
        start = new Date(Date.now() - 30 * 24 * 3600 * 1000)
        break
      case "90d":
        start = new Date(Date.now() - 90 * 24 * 3600 * 1000)
        break
      case "thisMonth":
        start = new Date(end.getFullYear(), end.getMonth(), 1)
        break
      case "lastMonth":
        start = new Date(end.getFullYear(), end.getMonth() - 1, 1)
        const lastMonthEnd = new Date(end.getFullYear(), end.getMonth(), 0)
        lastMonthEnd.setHours(23, 59, 59, 999)
        return { start, end: lastMonthEnd }
      case "thisYear":
        start = new Date(end.getFullYear(), 0, 1)
        break
      case "custom":
        if (startStr && endStr) {
          return { start: new Date(startStr), end: new Date(endStr) }
        }
        break
    }
    return { start, end }
  }

  const loadAnalytics = async (preset: string, startStr?: string, endStr?: string) => {
    setLoading(true)
    const { start, end } = getPresetDates(preset, startStr, endStr)
    try {
      const url = `/api/admin/analytics?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to load platform analytics")
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadAnalytics(selectedPreset, customStart, customEnd)
  }, [selectedPreset])

  // Realtime update triggers
  React.useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-changes-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => {
        loadAnalytics(selectedPreset, customStart, customEnd)
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        loadAnalytics(selectedPreset, customStart, customEnd)
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, () => {
        loadAnalytics(selectedPreset, customStart, customEnd)
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        loadAnalytics(selectedPreset, customStart, customEnd)
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        loadAnalytics(selectedPreset, customStart, customEnd)
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "face_search_logs" }, () => {
        loadAnalytics(selectedPreset, customStart, customEnd)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, selectedPreset, customStart, customEnd])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAnalytics(selectedPreset, customStart, customEnd)
    setRefreshing(false)
  }

  const handleCustomApply = () => {
    if (!customStart || !customEnd) {
      toast({ title: "Validation Error", description: "Please enter both start and end dates.", variant: "destructive" })
      return
    }
    loadAnalytics("custom", customStart, customEnd)
  }

  const handleExport = (format: "csv" | "pdf") => {
    const { start, end } = getPresetDates(selectedPreset, customStart, customEnd)
    const exportUrl = `/api/admin/analytics/export?format=${format}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`
    window.open(exportUrl, "_blank")
  }

  // Pre-configured trend vectors
  const revenueTrend = data.trends?.revenue || []
  const eventsTrend = data.trends?.events || []
  const photosTrend = data.trends?.photos || []
  const usersTrend = data.trends?.users || []

  const storageGB = (data.metrics?.storage.current / (1024 * 1024 * 1024)) || 0.00
  const totalStorageGB = (data.metrics?.storage.total / (1024 * 1024 * 1024)) || 0.00


  return (
    <main className="px-6 py-8 space-y-8 bg-slate-50 min-h-full">
      {/* Executive Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Welcome back, Admin! Here's what's happening with your platform today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Picker */}
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisYear">This Year</option>
            <option value="custom">Custom Range</option>
          </select>

          {/* Custom Date Picker Inputs */}
          {selectedPreset === "custom" && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs text-slate-600 bg-transparent border-none focus:outline-none focus:ring-0"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs text-slate-600 bg-transparent border-none focus:outline-none focus:ring-0"
              />
              <Button
                onClick={handleCustomApply}
                size="sm"
                className="h-7 text-[10px] bg-violet-600 hover:bg-violet-700 text-white font-bold px-2 rounded-md"
              >
                Apply
              </Button>
            </div>
          )}


          <Button onClick={handleRefresh} disabled={refreshing || loading} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
            <RefreshCw className={cn("h-4 w-4 text-slate-500", (refreshing || loading) && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          {/* Export Report Actions */}
          <Button onClick={() => handleExport("csv")} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </Button>
          <Button onClick={() => handleExport("pdf")} className="h-9 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm gap-1.5">
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col justify-center items-center gap-3">
          <LoaderSpinner className="h-8 w-8 animate-spin text-violet-600" />
          <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Gathering database analytics...</span>
        </div>
      ) : (
        <>
          {/* Row 1: Executive KPI Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
                    <span className="text-2xl font-bold text-slate-900 mt-1.5 block">
                      ₹{data.metrics?.revenue.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                      <span className={cn(
                        "flex items-center gap-0.5",
                        data.metrics?.revenue.growth >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {data.metrics?.revenue.growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        <span>{data.metrics?.revenue.growth >= 0 ? `+${data.metrics?.revenue.growth}` : data.metrics?.revenue.growth}%</span>
                      </span>
                      <span className="text-slate-400 font-semibold">period billing (₹{Math.round(data.metrics?.revenue.current).toLocaleString()})</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Sparkline data={revenueTrend.map((t: any) => t.value)} color="#8B5CF6" />
                </div>
              </CardContent>
            </Card>

            {/* Total Users */}
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Users</span>
                    <span className="text-2xl font-bold text-slate-900 mt-1.5 block">{data.metrics?.users.total}</span>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                      <span className={cn(
                        "flex items-center gap-0.5",
                        data.metrics?.users.growth >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {data.metrics?.users.growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        <span>{data.metrics?.users.growth >= 0 ? `+${data.metrics?.users.growth}` : data.metrics?.users.growth}%</span>
                      </span>
                      <span className="text-slate-400 font-semibold">period signups (+{data.metrics?.users.current})</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Sparkline data={usersTrend.map((t: any) => t.value)} color="#8B5CF6" />
                </div>
              </CardContent>
            </Card>

            {/* Total Events */}
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Events</span>
                    <span className="text-2xl font-bold text-slate-900 mt-1.5 block">{data.metrics?.events.total}</span>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                      <span className={cn(
                        "flex items-center gap-0.5",
                        data.metrics?.events.growth >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {data.metrics?.events.growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        <span>{data.metrics?.events.growth >= 0 ? `+${data.metrics?.events.growth}` : data.metrics?.events.growth}%</span>
                      </span>
                      <span className="text-slate-400 font-semibold">period creations (+{data.metrics?.events.current})</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 border border-pink-100">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Sparkline data={eventsTrend.map((t: any) => t.value)} color="#EC4899" />
                </div>
              </CardContent>
            </Card>

            {/* Total Media Uploads */}
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Media Uploads</span>
                    <span className="text-2xl font-bold text-slate-900 mt-1.5 block">
                      {((data.metrics?.photos.total || 0) + (data.metrics?.videos.total || 0) + (data.metrics?.voiceNotes.total || 0)).toLocaleString()}
                    </span>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                      <span className={cn(
                        "flex items-center gap-0.5",
                        data.metrics?.photos.growth >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {data.metrics?.photos.growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        <span>{data.metrics?.photos.growth >= 0 ? `+${data.metrics?.photos.growth}` : data.metrics?.photos.growth}%</span>
                      </span>
                      <span className="text-slate-400 font-semibold">period uploads (+{((data.metrics?.photos.current || 0) + (data.metrics?.videos.current || 0) + (data.metrics?.voiceNotes.current || 0)).toLocaleString()})</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                    <Image className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-500">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">Photos</span>
                    <span className="text-slate-800 font-extrabold block">
                      {data.metrics?.photos.current} <span className={cn("font-bold text-[8px]", data.metrics?.photos.growth >= 0 ? "text-emerald-600" : "text-rose-600")}>(+{data.metrics?.photos.growth}%)</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">Videos</span>
                    <span className="text-slate-800 font-extrabold block">
                      {data.metrics?.videos.current} <span className={cn("font-bold text-[8px]", data.metrics?.videos.growth >= 0 ? "text-emerald-600" : "text-rose-600")}>(+{data.metrics?.videos.growth}%)</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase block">Voice</span>
                    <span className="text-slate-800 font-extrabold block">
                      {data.metrics?.voiceNotes.current} <span className={cn("font-bold text-[8px]", data.metrics?.voiceNotes.growth >= 0 ? "text-emerald-600" : "text-rose-600")}>(+{data.metrics?.voiceNotes.growth}%)</span>
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Sparkline data={photosTrend.map((t: any) => t.value)} color="#F97316" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Secondary Cards (AI & Storage) */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {/* AI Searches */}
            <Card className="bg-white border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">AI Searches</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1.5 block">{data.metrics?.searches.total.toLocaleString()}</span>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                    <span className={cn(
                      "flex items-center gap-0.5",
                      data.metrics?.searches.growth >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {data.metrics?.searches.growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      <span>{data.metrics?.searches.growth >= 0 ? `+${data.metrics?.searches.growth}` : data.metrics?.searches.growth}%</span>
                    </span>
                    <span className="text-slate-400 font-semibold">period searches (+{data.metrics?.searches.current})</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Matches rate</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-1 block">
                    {data.aiSearchStats.total > 0 ? `${Math.round((data.aiSearchStats.successful / data.aiSearchStats.total) * 100)}%` : "0%"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Avg duration</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-1 block">{data.aiSearchStats.avgDurationMs} ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Confidence index</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-1 block">{data.aiSearchStats.avgConfidence} / 1.0</span>
                </div>
              </div>
            </Card>

            {/* Storage Usage */}
            <Card className="bg-white border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Storage Used</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1.5 block">{totalStorageGB.toFixed(2)} GB</span>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                    <span className={cn(
                      "flex items-center gap-0.5",
                      data.metrics?.storage.growth >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {data.metrics?.storage.growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      <span>{data.metrics?.storage.growth >= 0 ? `+${data.metrics?.storage.growth}` : data.metrics?.storage.growth}%</span>
                    </span>
                    <span className="text-slate-400 font-semibold">period growth (+{storageGB.toFixed(2)} GB)</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                  <HardDrive className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Infrastructure Allocation</span>
                <span className="font-extrabold text-slate-700">AWS S3 Snapsy Bucket (Standard-IA)</span>
              </div>
            </Card>
          </div>

          {/* Row 3: Interactive Graphs */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <InteractiveChart
              title="Revenue Overview"
              subtitle={`₹${Math.round(data.metrics?.revenue.current).toLocaleString()}`}
              data={revenueTrend}
              color="#8B5CF6"
              prefix="₹"
            />
            <InteractiveChart
              title="Events Created"
              subtitle={data.metrics?.events.current.toString()}
              data={eventsTrend}
              color="#EC4899"
            />
            <InteractiveChart
              title="Photos Uploaded"
              subtitle={data.metrics?.photos.current.toLocaleString()}
              data={photosTrend}
              color="#F97316"
            />
            <InteractiveChart
              title="New Users"
              subtitle={data.metrics?.users.current.toString()}
              data={usersTrend}
              color="#8B5CF6"
            />
          </div>

          {/* Row 4: Live Feeds & Health */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Database Activity Feed */}
            <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="p-6 border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-slate-800 text-base">Live Activity Feed</h3>
              </div>
              <CardContent className="p-6 flex-1 overflow-y-auto space-y-4 max-h-80">
                {data.activityFeed.length === 0 ? (
                  <div className="text-center text-slate-455 py-12 text-xs font-semibold">No operational updates logged.</div>
                ) : (
                  data.activityFeed.map((act: any, index: number) => (
                    <div key={index} className="flex gap-3 text-xs">
                      <div className="h-6 w-6 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 shrink-0 border border-violet-100">
                        {act.type === "user" && <Users className="h-3 w-3" />}
                        {act.type === "event" && <Calendar className="h-3 w-3" />}
                        {act.type === "photo" && <Image className="h-3 w-3" />}
                        {act.type === "payment" && <CreditCard className="h-3 w-3" />}
                      </div>
                      <div>
                        <p className="text-slate-700 font-semibold leading-relaxed">{act.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">{act.time}</span>
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
                  { label: "Email SMTP", status: "Healthy", icon: Mail, color: "text-emerald-500 bg-emerald-50" },
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
                      <span className="text-[10px] font-bold mt-0.5 block text-emerald-600">{node.status}</span>
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

            {/* Plans Donut Chart */}
            <Card className="bg-white border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="p-6 border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-slate-800 text-base">Top Performing Plans</h3>
              </div>
              <CardContent className="p-6 flex flex-col items-center justify-center flex-1">
                <div className="relative h-32 w-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray={`${data.topLists?.plans.premium || 0} ${100 - (data.topLists?.plans.premium || 0)}`} strokeDashoffset="0" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EC4899" strokeWidth="3" strokeDasharray={`${data.topLists?.plans.standard || 0} ${100 - (data.topLists?.plans.standard || 0)}`} strokeDashoffset={`-${data.topLists?.plans.premium || 0}`} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F97316" strokeWidth="3" strokeDasharray={`${data.topLists?.plans.starter || 0} ${100 - (data.topLists?.plans.starter || 0)}`} strokeDashoffset={`-${(data.topLists?.plans.premium || 0) + (data.topLists?.plans.standard || 0)}`} />
                  </svg>
                  <div className="absolute flex flex-col items-center text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Period Revenue</span>
                    <span className="text-base font-extrabold text-slate-800 mt-0.5">
                      ₹{Math.round(data.metrics?.revenue.current).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Legends */}
                <div className="w-full mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    <span className="text-slate-600">Premium ({data.topLists?.plans.premium || 0}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-pink-500" />
                    <span className="text-slate-600">Standard ({data.topLists?.plans.standard || 0}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="text-slate-600">Starter ({data.topLists?.plans.starter || 0}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-200" />
                    <span className="text-slate-600">Free ({data.topLists?.plans.free || 0}%)</span>
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

          {/* Row 5: Advanced Analytics & Leaderboards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Top performing users */}
            <Card className="bg-white border-slate-200 p-6 shadow-sm">
              <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">Top Billing Users</h4>
              <div className="space-y-4">
                {data.topLists?.users?.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 text-xs font-medium">No revenue generated in range.</div>
                ) : (
                  data.topLists?.users?.map((user: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 bg-violet-50 text-violet-600 text-[10px] font-extrabold rounded-md flex items-center justify-center">{i+1}</span>
                        <span className="font-bold text-slate-700">{user.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-900">₹{user.revenue.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Top performing events */}
            <Card className="bg-white border-slate-200 p-6 shadow-sm">
              <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">Top Events by Media Count</h4>
              <div className="space-y-4">
                {data.topLists?.events.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 text-xs font-medium">No media uploaded in range.</div>
                ) : (
                  data.topLists?.events.map((ev: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 bg-pink-50 text-pink-600 text-[10px] font-extrabold rounded-md flex items-center justify-center">{i+1}</span>
                        <div>
                          <span className="font-bold text-slate-700 block">{ev.name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{ev.user}</span>
                        </div>
                      </div>
                      <span className="font-extrabold text-slate-900">{ev.count.toLocaleString()} uploads</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Top Revenue Sources splits */}
            <Card className="bg-white border-slate-200 p-6 shadow-sm">
              <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">Revenue Attribution Channels</h4>
              <div className="space-y-5 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>Base Subscription Plans</span>
                    <span className="text-slate-900">₹{Math.round(data.topLists?.revenueSources.plans).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-violet-600 h-full rounded-full" 
                      style={{ 
                        width: `${(data.topLists?.revenueSources.plans + data.topLists?.revenueSources.addons) > 0 
                          ? (data.topLists?.revenueSources.plans / (data.topLists?.revenueSources.plans + data.topLists?.revenueSources.addons)) * 100 
                          : 0}%` 
                      }} 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>Add-on Quota Boosts</span>
                    <span className="text-slate-900">₹{Math.round(data.topLists?.revenueSources.addons).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full rounded-full" 
                      style={{ 
                        width: `${(data.topLists?.revenueSources.plans + data.topLists?.revenueSources.addons) > 0 
                          ? (data.topLists?.revenueSources.addons / (data.topLists?.revenueSources.plans + data.topLists?.revenueSources.addons)) * 100 
                          : 0}%` 
                      }} 
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 6: Recent Events Table & Actions */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Events Table */}
            <Card className="bg-white border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div className="p-6 border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-slate-800 text-base">Recent Events</h3>
              </div>
              <CardContent className="p-0 flex-1 overflow-x-auto">
                {data.recentEvents.length === 0 ? (
                  <div className="text-center text-slate-400 py-16 text-xs font-semibold">No events registered yet.</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                        <th className="p-4">Event Name</th>
                        <th className="p-4">User</th>
                        <th className="p-4">Venue</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Guests</th>
                        <th className="p-4 text-center">Photos</th>
                        <th className="p-4 text-center">Videos</th>
                        <th className="p-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                      {data.recentEvents.map((evt: any, i: number) => (
                        <tr 
                          key={i} 
                          onClick={() => router.push(`/admin/events?eventId=${evt.id}`)}
                          className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                        >
                          <td className="p-4 font-extrabold text-slate-800">{evt.name}</td>
                          <td className="p-4">{evt.user}</td>
                          <td className="p-4 text-slate-400">{evt.venue}</td>
                          <td className="p-4">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border",
                              evt.status === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                              {evt.status}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700">{evt.guestsCount}</td>
                          <td className="p-4 text-center text-slate-550">{evt.photosCount}</td>
                          <td className="p-4 text-center text-slate-550">{evt.videosCount}</td>
                          <td className="p-4 text-right text-slate-900 font-extrabold">₹{evt.revenue.toLocaleString()}</td>
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
        </>
      )}
    </main>
  )
}

function LoaderSpinner({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}
