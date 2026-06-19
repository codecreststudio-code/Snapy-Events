"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Sparkles, RefreshCw, Cpu, Image, Search, Loader2 } from "lucide-react"

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

  const fetchAiStats = async () => {
    setLoading(true)
    // Seed mock stats representing AI models usage
    setTimeout(() => {
      setStats({
        totalSearches: 1845,
        activeEmbeddings: 24900,
        queueStatus: "Idle (0 pending)",
        recentSearches: [
          { id: "log_1", timestamp: new Date(Date.now() - 50000).toISOString(), durationMs: 420, resultCount: 8 },
          { id: "log_2", timestamp: new Date(Date.now() - 150000).toISOString(), durationMs: 510, resultCount: 3 },
          { id: "log_3", timestamp: new Date(Date.now() - 400000).toISOString(), durationMs: 380, resultCount: 15 },
          { id: "log_4", timestamp: new Date(Date.now() - 600000).toISOString(), durationMs: 450, resultCount: 1 }
        ]
      })
      setLoading(false)
    }, 400)
  }

  useEffect(() => {
    fetchAiStats()
  }, [])

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="AI Usage Analytics" description="Monitor face embeddings processing and guest search requests." />
        <Button onClick={fetchAiStats} variant="outline" className="border-slate-800 flex items-center gap-1.5">
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
            <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">Total Face Searches</span>
                <span className="text-2xl font-bold text-slate-100">{stats.totalSearches.toLocaleString()}</span>
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <Image className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">Vectorized Faces</span>
                <span className="text-2xl font-bold text-slate-100">{stats.activeEmbeddings.toLocaleString()}</span>
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">GPU Vector Index Queue</span>
                <span className="text-lg font-bold text-slate-100">{stats.queueStatus}</span>
              </div>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-800">
                <h3 className="font-bold text-slate-100">Recent Guest Search Requests</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-medium">
                      <th className="p-4">Search ID</th>
                      <th className="p-4">Trigger Time</th>
                      <th className="p-4">Processing Latency</th>
                      <th className="p-4">Matching Results</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {stats.recentSearches.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-mono text-slate-300">{log.id}</td>
                        <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-4 font-semibold text-slate-200">{log.durationMs} ms</td>
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
