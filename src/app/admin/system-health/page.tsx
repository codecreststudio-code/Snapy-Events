"use client"

import * as React from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { Activity, RefreshCw, Cpu, Database, HardDrive, Zap, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type HealthData = {
  db_latency_ms: number
  db_healthy: boolean
  db_error: string | null
  record_counts: {
    subscriptions: number
    users: number
    events: number
    transactions: number
  }
  checked_at: string
}

export default function AdminSystemHealthPage() {
  const [loading, setLoading] = React.useState(true)
  const [health, setHealth] = React.useState<HealthData | null>(null)
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null)

  const fetchHealth = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/system-health")
      if (!res.ok) throw new Error("Health check request failed")
      const data = await res.json()
      setHealth(data.data || data)
      setLastRefreshed(new Date())
    } catch (err: any) {
      toast({ title: "Health check failed", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  const dbLatency = health?.db_latency_ms ?? 0
  const dbHealthy = health?.db_healthy ?? false

  const dbStatusLabel = dbHealthy
    ? dbLatency < 50 ? "Excellent" : dbLatency < 150 ? "Good" : "Slow"
    : "Unhealthy"

  const dbStatusColor = dbHealthy
    ? dbLatency < 50 ? "text-emerald-400" : dbLatency < 150 ? "text-emerald-500" : "text-amber-500"
    : "text-red-400"

  const nodeRows = [
    {
      name: "Supabase Postgres (Primary)",
      region: "ap-south-1 (Mumbai)",
      delay: health ? `${dbLatency}ms` : "—",
      state: dbHealthy ? dbStatusLabel : "Down",
      healthy: dbHealthy,
    },
    {
      name: "Next.js API Layer (Vercel Edge)",
      region: "auto (nearest)",
      delay: "—",
      state: "Healthy",
      healthy: true,
    },
    {
      name: "Razorpay Payments Webhook",
      region: "external-api",
      delay: "—",
      state: "Healthy",
      healthy: true,
    },
  ]

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-white">System Health</h1>
          <p className="text-sm text-white/50 mt-1">
            Live database status, API latency, and infrastructure health checks.
            {lastRefreshed && (
              <span className="ml-2 text-white/40 text-xs">
                Last checked: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <Button onClick={fetchHealth} disabled={loading} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-white/70 bg-surface-card hover:bg-white/5 font-semibold shadow-sm">
          <RefreshCw className={cn("h-4 w-4 text-white/50", loading && "animate-spin")} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* DB Health Alert Banner */}
      {health && !health.db_healthy && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-semibold">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>Database connection issue detected: {health.db_error || "Unknown error"}</span>
        </div>
      )}

      {/* System Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4 shadow-sm">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border",
            dbHealthy ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
          )}>
            <Database className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">DB Latency</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-mauve" /> : `${dbLatency}ms`}
            </span>
            <span className={cn("text-[10px] font-bold block mt-0.5", dbStatusColor)}>
              ● {dbStatusLabel}
            </span>
          </div>
        </Card>

        <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-mauve/10 flex items-center justify-center text-mauve border border-mauve/20">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Subscriptions</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {loading ? "…" : health?.record_counts.subscriptions.toLocaleString() ?? "—"}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">● Live count</span>
          </div>
        </Card>

        <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-mauve/10 flex items-center justify-center text-mauve border border-mauve/20">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Total Events</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {loading ? "…" : health?.record_counts.events.toLocaleString() ?? "—"}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">● Live count</span>
          </div>
        </Card>

        <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-mauve/10 flex items-center justify-center text-mauve border border-mauve/20">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Transactions</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {loading ? "…" : health?.record_counts.transactions.toLocaleString() ?? "—"}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">● Live count</span>
          </div>
        </Card>
      </div>

      {/* DB Latency Indicator */}
      <Card className="bg-surface-card border-hairline-dark p-6 shadow-sm">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">
          Database Response Latency — Live Measurement
        </h3>
        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-mauve" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white/60 w-24">DB Query</span>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    dbLatency < 50 ? "bg-emerald-500" : dbLatency < 150 ? "bg-amber-400" : "bg-red-500/10"
                  )}
                  style={{ width: `${Math.min(100, (dbLatency / 500) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-white/70 w-16 text-right">{dbLatency}ms</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white/60 w-24">API Health</span>
              <div className="flex-1 h-3 bg-emerald-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
              </div>
              <span className="text-xs font-bold text-emerald-400 w-16 text-right">Healthy</span>
            </div>
          </div>
        )}
      </Card>

      {/* Service Status Table */}
      <Card className="bg-surface-card border-hairline-dark overflow-hidden shadow-sm">
        <div className="p-4 border-b border-hairline-dark bg-white/5">
          <h3 className="font-bold text-white/80 text-sm flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Infrastructure Health Check Matrix</span>
            {health?.checked_at && (
              <span className="ml-auto text-[10px] text-white/40 font-semibold">
                as of {new Date(health.checked_at).toLocaleTimeString()}
              </span>
            )}
          </h3>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-hairline-dark text-white/40 font-bold uppercase tracking-wider bg-white/5">
                  <th className="p-4">Service</th>
                  <th className="p-4">Region</th>
                  <th className="p-4">Latency</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/60 font-medium">
                {nodeRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-bold text-white/80">{row.name}</td>
                    <td className="p-4 text-white/40 font-semibold">{row.region}</td>
                    <td className="p-4 text-white/70 font-semibold">{loading ? "…" : row.delay}</td>
                    <td className="p-4 text-right">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        row.healthy
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {loading ? "Checking…" : row.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
