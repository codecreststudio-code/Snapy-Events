"use client"

import * as React from "react"
import { getSystemHealth, HealthStatus } from "@/app/actions/admin-health"

export function AdminHealthBadge() {
  const [health, setHealth] = React.useState<HealthStatus | null>(null)

  React.useEffect(() => {
    async function checkHealth() {
      const status = await getSystemHealth()
      setHealth(status)
    }
    checkHealth()
    
    // Poll every 60 seconds
    const interval = setInterval(checkHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!health) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-400 border border-slate-100 animate-pulse">
        <div className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="text-xs font-semibold">Checking...</span>
      </div>
    )
  }

  const isHealthy = health.status === "healthy"
  const isDegraded = health.status === "degraded"
  
  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
        isHealthy ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        isDegraded ? "bg-amber-50 text-amber-700 border-amber-100" :
        "bg-rose-50 text-rose-700 border-rose-100"
      }`}
      title={`Latency: ${health.latencyMs}ms`}
    >
      <span className="relative flex h-2 w-2">
        {isHealthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          isHealthy ? "bg-emerald-500" :
          isDegraded ? "bg-amber-500" :
          "bg-rose-500"
        }`}></span>
      </span>
      <span className="text-xs font-semibold">
        {isHealthy ? "System: Healthy" : isDegraded ? "System: Degraded" : "System: Down"}
      </span>
    </div>
  )
}
