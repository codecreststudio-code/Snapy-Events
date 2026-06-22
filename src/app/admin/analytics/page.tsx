"use client"

import * as React from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { BarChart3, LineChart, Globe, Smartphone, RefreshCw, Zap, TrendingUp, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = React.useState(false)

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 400)
  }

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Deep-dive into visitor acquisition channels, device usage, and feature retention rates.</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Row 1: Sparkline charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Daily Active Users Trend</h3>
          <div className="h-40 flex items-end">
            <svg className="w-full h-full text-violet-500" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M 0 16 Q 20 10, 40 12 T 80 6 L 100 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 0 16 Q 20 10, 40 12 T 80 6 L 100 2 L 100 20 L 0 20 Z" fill="rgba(139, 92, 246, 0.1)" stroke="none" />
            </svg>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Monthly Events Conversion Funnel</h3>
          <div className="h-40 flex flex-col justify-between space-y-2">
            {[
              { step: "Visitor Landings", val: "100%", size: "w-full bg-violet-100 text-violet-750" },
              { step: "Event QR Scans", val: "68%", size: "w-[68%] bg-violet-200 text-violet-750" },
              { step: "Photo Uploaded", val: "42%", size: "w-[42%] bg-violet-300 text-violet-700" },
              { step: "AI Search Completed", val: "24%", size: "w-[24%] bg-violet-400 text-white" },
            ].map((bar, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-655">
                  <span>{bar.step}</span>
                  <span>{bar.val}</span>
                </div>
                <div className="h-4 rounded-md w-full bg-slate-100 overflow-hidden">
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
        <Card className="bg-white border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Smartphone className="h-4 w-4 text-slate-400" />
            <span>Device Types Distribution</span>
          </h3>
          <div className="space-y-4">
            {[
              { type: "Mobile Safari", percent: "54%", count: "8.4k visits" },
              { type: "Chrome Mobile", percent: "31%", count: "4.8k visits" },
              { type: "Desktop Chrome", percent: "12%", count: "1.8k visits" },
              { type: "Others", percent: "3%", count: "450 visits" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-700">{item.type}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{item.count}</span>
                  <span className="text-violet-650 font-bold w-8 text-right">{item.percent}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Traffic Sources */}
        <Card className="bg-white border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-slate-400" />
            <span>Acquisition Referrers</span>
          </h3>
          <div className="space-y-4">
            {[
              { source: "Direct (QR Code Scans)", percent: "72%", visits: "11.2k" },
              { source: "WhatsApp Share", percent: "18%", visits: "2.8k" },
              { source: "Google Search", percent: "6%", visits: "920" },
              { source: "Instagram Link", percent: "4%", visits: "610" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-700">{item.source}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{item.visits}</span>
                  <span className="text-violet-650 font-bold w-8 text-right">{item.percent}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Features */}
        <Card className="bg-white border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-slate-400" />
            <span>Top Features Utilized</span>
          </h3>
          <div className="space-y-4">
            {[
              { feature: "AI Selfie Search", matches: "18.5k hits", load: 0.95 },
              { feature: "Bulk Photo Zip Download", matches: "4.2k hits", load: 0.65 },
              { feature: "Live Slideshow Stream", matches: "1.4k hits", load: 0.35 },
              { feature: "Custom Domains verification", matches: "320 verified", load: 0.12 },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{item.feature}</span>
                  <span className="text-slate-450 font-bold">{item.matches}</span>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-600 rounded-full" style={{ width: `${item.load * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  )
}
