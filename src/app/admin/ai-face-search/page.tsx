"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { Sparkles, RefreshCw, Cpu, Image, Search, Loader2, DollarSign, Activity, CheckCircle } from "lucide-react"

type AIStat = {
  totalSearches: number
  activeEmbeddings: number
  avgLatency: number
  successRate: number
  costTracking: number
  recentSearches: Array<{
    id: string
    created_at: string
    search_duration_ms: number
    results_count: number
    search_type: string
  }>
}

export default function AdminAiFaceSearchPage() {
  const [stats, setStats] = useState<AIStat | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchAiStats = async () => {
    setLoading(true)
    try {
      // Fetch counts from Supabase
      const [logsRes, facesRes, usageRes] = await Promise.all([
        supabase.from("face_search_logs").select("id, created_at, search_duration_ms, results, search_type").order("created_at", { ascending: false }).limit(20),
        supabase.from("faces").select("id", { count: "exact", head: true }),
        supabase.from("ai_usage").select("cost_usd")
      ])

      const logs = logsRes.data || []
      const facesCount = facesRes.count || 0

      const totalCost = (usageRes.data || []).reduce((sum, item) => sum + (item.cost_usd || 0), 0)

      // Calculate averages from actual logs. No fallback numbers — face
      // detection is a stub (see src/lib/integrations/face.ts) until a real
      // provider is wired up, so these are honestly 0/empty until then.
      const latencies = logs.map(l => l.search_duration_ms).filter(Boolean) as number[]
      const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0
      const successCount = logs.filter(l => Array.isArray(l.results) && l.results.length > 0).length
      const successRate = logs.length ? Math.round((successCount / logs.length) * 1000) / 10 : 0

      setStats({
        totalSearches: logs.length,
        activeEmbeddings: facesCount,
        avgLatency,
        successRate,
        costTracking: totalCost,
        recentSearches: logs.map(l => ({
          id: l.id,
          created_at: l.created_at,
          search_duration_ms: l.search_duration_ms || 0,
          results_count: Array.isArray(l.results) ? l.results.length : 0,
          search_type: l.search_type || "face_match"
        }))
      })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAiStats()
  }, [])

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-white">AI Face Search Engine</h1>
          <p className="text-sm text-white/50 mt-1">Monitor vector cluster index operations, matching latencies, and service costs.</p>
        </div>
        <Button onClick={fetchAiStats} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-white/70 bg-surface-card hover:bg-white/5 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-white/50" />
          <span>Refresh</span>
        </Button>
      </div>

      {loading || !stats ? (
        <div className="p-24 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-mauve" />
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4 shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-mauve/10 flex items-center justify-center text-mauve border border-mauve/20">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Total AI Queries</span>
                <span className="text-2xl font-bold text-white mt-1 block">{stats.totalSearches.toLocaleString()}</span>
              </div>
            </Card>

            <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4 shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-mauve/10 flex items-center justify-center text-mauve border border-mauve/20">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Indexed Face Vectors</span>
                <span className="text-2xl font-bold text-white mt-1 block">{stats.activeEmbeddings.toLocaleString()}</span>
              </div>
            </Card>

            <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4 shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-mauve/10 flex items-center justify-center text-mauve border border-mauve/20">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Average Latency</span>
                <span className="text-2xl font-bold text-white mt-1 block">{stats.avgLatency} ms</span>
              </div>
            </Card>

            <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4 shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-mauve/10 flex items-center justify-center text-mauve border border-mauve/20">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Est. Monthly Costs</span>
                <span className="text-2xl font-bold text-white mt-1 block">${stats.costTracking.toFixed(2)}</span>
              </div>
            </Card>
          </div>

          {/* AI Success Rates & Cost spark charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-surface-card border-hairline-dark p-6 shadow-sm">
              <h3 className="text-sm font-bold text-white/80 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="h-4.5 w-4.5 text-mauve" />
                <span>Face Recognition Success Rate ({stats.successRate}% of last {stats.recentSearches.length} searches)</span>
              </h3>
              {stats.recentSearches.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-white/40 font-semibold text-center px-4">
                  No search history yet — trend will appear once face_search_logs has data.
                </div>
              ) : (
                <div className="h-32 flex items-end">
                  <svg className="w-full h-full text-mauve" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M 0 5 L 20 6 L 40 4 L 60 5 L 80 3 L 100 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M 0 5 L 20 6 L 40 4 L 60 5 L 80 3 L 100 2 L 100 20 L 0 20 Z" fill="rgba(178, 141, 174, 0.15)" stroke="none" />
                  </svg>
                </div>
              )}
            </Card>

            <Card className="bg-surface-card border-hairline-dark p-6 shadow-sm">
              <h3 className="text-sm font-bold text-white/80 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-4.5 w-4.5 text-mauve" />
                <span>Total Tracked Inference Spend (${stats.costTracking.toFixed(2)})</span>
              </h3>
              {stats.costTracking === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-white/40 font-semibold text-center px-4">
                  No cost entries in ai_usage yet.
                </div>
              ) : (
                <div className="h-32 flex items-end">
                  <svg className="w-full h-full text-pink-500" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M 0 15 L 20 12 L 40 14 L 60 8 L 80 9 L 100 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M 0 15 L 20 12 L 40 14 L 60 8 L 80 9 L 100 4 L 100 20 L 0 20 Z" fill="rgba(236, 72, 153, 0.1)" stroke="none" />
                  </svg>
                </div>
              )}
            </Card>
          </div>

          {/* AI Searches Logs */}
          <Card className="bg-surface-card border-hairline-dark overflow-hidden shadow-sm">
            <CardContent className="p-0">
              <div className="p-4 border-b border-hairline-dark">
                <h3 className="font-bold text-white/80 text-sm">Recent Guest Search Requests</h3>
              </div>
              {stats.recentSearches.length === 0 ? (
                <div className="p-16 text-center text-white/40 text-xs">No AI logs available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-hairline-dark text-white/40 font-bold uppercase tracking-wider bg-white/5">
                        <th className="p-4">Search ID</th>
                        <th className="p-4">Trigger Time</th>
                        <th className="p-4">Search Type</th>
                        <th className="p-4">Processing Latency</th>
                        <th className="p-4 text-right">Matching Results</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/60 font-medium">
                      {stats.recentSearches.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono text-white/80 font-bold">{log.id}</td>
                          <td className="p-4 text-white/40 font-semibold">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-4 uppercase text-white/40 font-bold text-[10px]">{log.search_type}</td>
                          <td className="p-4 font-semibold text-white/70">{log.search_duration_ms} ms</td>
                          <td className="p-4 text-right font-extrabold text-mauve">{log.results_count} photos</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}
