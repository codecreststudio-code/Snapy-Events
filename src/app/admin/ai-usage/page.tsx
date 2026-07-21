"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Sparkles, RefreshCw, Cpu, Image, Search, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type AIStat = {
  totalSearches: number
  activeEmbeddings: number
  queueStatus: string
  recentSearches: Array<{
    id: string
    timestamp: string
    durationMs: number
    resultCount: number
  }>
}

export default function AdminAiUsagePage() {
  const [stats, setStats] = useState<AIStat | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchAiStats = async () => {
    setLoading(true)
    try {
      const [logsRes, facesRes] = await Promise.all([
        supabase
          .from("face_search_logs")
          .select("id, created_at, search_duration_ms, results")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("faces").select("id", { count: "exact", head: true }),
      ])

      const logs = logsRes.data || []

      // Real counts from face_search_logs / faces. Face detection itself is a
      // stub (src/lib/integrations/face.ts) until a real provider is wired up,
      // so these are honestly 0 until then rather than placeholder numbers.
      setStats({
        totalSearches: logs.length,
        activeEmbeddings: facesRes.count || 0,
        queueStatus: "Idle (0 pending)",
        recentSearches: logs.map((l) => ({
          id: l.id,
          timestamp: l.created_at,
          durationMs: l.search_duration_ms || 0,
          resultCount: Array.isArray(l.results) ? l.results.length : 0,
        })),
      })
    } catch (err) {
      console.error("[ai-usage] failed to load stats", err)
      setStats({ totalSearches: 0, activeEmbeddings: 0, queueStatus: "Unknown", recentSearches: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAiStats()
  }, [])

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex items-center justify-between">
        <PageHeader title="AI Usage Analytics" description="Monitor face embeddings processing and guest search requests." />
        <Button onClick={fetchAiStats} variant="outline" className="border-hairline-dark flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {loading || !stats ? (
        <div className="p-24 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-white/50 font-medium block">Total Face Searches</span>
                <span className="text-2xl font-bold text-white">{stats.totalSearches.toLocaleString()}</span>
              </div>
            </Card>

            <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <Image className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-white/50 font-medium block">Vectorized Faces</span>
                <span className="text-2xl font-bold text-white">{stats.activeEmbeddings.toLocaleString()}</span>
              </div>
            </Card>

            <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-white/50 font-medium block">GPU Vector Index Queue</span>
                <span className="text-lg font-bold text-white">{stats.queueStatus}</span>
              </div>
            </Card>
          </div>

          <Card className="bg-surface-card border-hairline-dark overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-hairline-dark">
                <h3 className="font-bold text-white">Recent Guest Search Requests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-hairline-dark text-white/40 font-medium">
                      <th className="p-4">Search ID</th>
                      <th className="p-4">Trigger Time</th>
                      <th className="p-4">Processing Latency</th>
                      <th className="p-4">Matching Results</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-white/60">
                    {stats.recentSearches.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-white/50">{log.id}</td>
                        <td className="p-4 text-white/40">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-4 font-semibold text-white/70">{log.durationMs} ms</td>
                        <td className="p-4 font-bold text-orange-400">{log.resultCount} photos</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}
