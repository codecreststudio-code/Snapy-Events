"use client"

import * as React from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import {
  BarChart3,
  LineChart,
  Globe,
  Smartphone,
  RefreshCw,
  Zap,
  TrendingUp,
  Sparkles,
  Loader2,
  Users,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/components/ui/toaster"

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<any>(null)
  const [days, setDays] = React.useState(30)

  const fetchPlatformAnalytics = React.useCallback(async (d = days) => {
    setLoading(true)
    try {
      const end = new Date()
      const start = new Date(end.getTime() - d * 24 * 3600 * 1000)
      const res = await fetch(`/api/admin/analytics/platform?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
      if (!res.ok) throw new Error("Failed to load platform analytics")
      const json = await res.json()
      setData(json.data)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [days])

  React.useEffect(() => {
    fetchPlatformAnalytics(days)
  }, [days, fetchPlatformAnalytics])

  const PERIODS = [
    { label: "7 Days", value: 7 },
    { label: "30 Days", value: 30 },
    { label: "90 Days", value: 90 },
    { label: "1 Year", value: 365 },
  ]

  // Render Sparkline for User Trend
  const renderUserTrend = () => {
    if (!data || !data.userTrend || data.userTrend.length === 0) return null
    const values = data.userTrend.map((d: any) => d.value)
    const max = Math.max(...values, 1)
    const width = 100
    const height = 20
    const points = values.map((val: number, idx: number) => {
      const x = (idx / (values.length - 1)) * width
      const y = height - (val / max) * (height - 2) - 1
      return `${x},${y}`
    }).join(" ")
    
    return (
      <svg className="w-full h-full text-mauve" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path d={`M ${points}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M 0,${height} L ${points} L ${width},${height} Z`} fill="rgba(178, 141, 174, 0.15)" stroke="none" />
      </svg>
    )
  }

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-white">Platform Analytics</h1>
          <p className="text-sm text-white/50 mt-1">Deep-dive into visitor acquisition channels, device usage, and feature retention rates.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-surface-card border border-hairline-dark rounded-lg p-0.5 shadow-sm">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                  days === p.value ? "bg-mauve text-[#141110] shadow-sm" : "text-white/50 hover:text-white/80"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button onClick={() => fetchPlatformAnalytics(days)} disabled={loading} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-white/70 bg-surface-card hover:bg-white/5 font-semibold shadow-sm">
            <RefreshCw className={cn("h-4 w-4 text-white/50", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-mauve" />
        </div>
      ) : (
        <>
          {/* Row 1: Sparkline charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-surface-card border-hairline-dark p-6 shadow-sm">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Daily Active Users Trend</h3>
              <div className="h-40 flex items-end">
                {renderUserTrend()}
              </div>
            </Card>

            <Card className="bg-surface-card border-hairline-dark p-6 shadow-sm">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Events Conversion Funnel</h3>
              <div className="h-40 flex flex-col justify-between space-y-2">
                {data?.funnel?.map((bar: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-white/60">
                      <span>{bar.step} ({bar.val})</span>
                      <span>{bar.percent}</span>
                    </div>
                    <div className="h-4 rounded-md w-full bg-white/5 overflow-hidden">
                      <div className={cn("h-full rounded-md", bar.size)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row 2: Demographics, Device shares, Traffic sources */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Device Shares */}
            <Card className="bg-surface-card border-hairline-dark p-6 shadow-sm">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-white/40" />
                <span>Device Types Distribution</span>
              </h3>
              <div className="space-y-4">
                {data?.deviceDistribution?.length ? data.deviceDistribution.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-white/70">{item.type}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white/40">{item.count}</span>
                      <span className="text-mauve font-bold w-12 text-right">{item.percent}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-white/40 font-medium">No device data captured yet.</p>
                )}
              </div>
            </Card>

            {/* Traffic Sources */}
            <Card className="bg-surface-card border-hairline-dark p-6 shadow-sm">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-white/40" />
                <span>Acquisition Referrers</span>
              </h3>
              <div className="space-y-4">
                {data?.referrers?.length ? data.referrers.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-white/70">{item.source}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white/40">{item.visits}</span>
                      <span className="text-mauve font-bold w-12 text-right">{item.percent}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-white/40 font-medium">No traffic source data yet — only QR scans are tracked as a source.</p>
                )}
              </div>
            </Card>

            {/* Top Features */}
            <Card className="bg-surface-card border-hairline-dark p-6 shadow-sm">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-white/40" />
                <span>Top Features Utilized</span>
              </h3>
              <div className="space-y-4">
                {data?.features?.map((item: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-white/70">{item.feature}</span>
                      <span className="text-white/50 font-bold">{item.matches}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-mauve rounded-full" style={{ width: `${Math.max(item.load * 100, 2)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </main>
  )
}
