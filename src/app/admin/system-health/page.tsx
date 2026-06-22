"use client"

import * as React from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Activity, RefreshCw, Cpu, Database, HardDrive, Zap, CheckCircle2 } from "lucide-react"

export default function AdminSystemHealthPage() {
  const [loading, setLoading] = React.useState(false)

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 400)
  }

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Health</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor real-time host infrastructure load, database replication state, and CDN cache hits.</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Row 1: System stats grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Host CPU Load", val: "14%", icon: Cpu, state: "Normal" },
          { label: "Memory Reserved", val: "1.2 GB / 4.0 GB", icon: HardDrive, state: "30% Used" },
          { label: "DB Connection Pool", val: "8 / 100 open", icon: Database, state: "Optimal" },
          { label: "API Cache Ratio", val: "94.2% Hit", icon: Zap, state: "Optimal" },
        ].map((node, i) => (
          <Card key={i} className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
            <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
              <node.icon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">{node.label}</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{node.val}</span>
              <span className="text-[10px] text-emerald-600 font-bold block mt-1">● {node.state}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Row 2: Performance graphs */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Request response time (Avg: 120ms)</h3>
          <div className="h-40 flex items-end">
            <svg className="w-full h-full text-violet-500" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M 0 18 L 20 12 L 40 14 L 60 7 L 80 8 L 100 3" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 0 18 L 20 12 L 40 14 L 60 7 L 80 8 L 100 3 L 100 20 L 0 20 Z" fill="rgba(139, 92, 246, 0.1)" stroke="none" />
            </svg>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Request Error Rate (Avg: 0.04%)</h3>
          <div className="h-40 flex items-end">
            <svg className="w-full h-full text-pink-500" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M 0 19 L 20 19 L 40 18 L 60 19 L 80 17 L 100 19" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 0 19 L 20 19 L 40 18 L 60 19 L 80 17 L 100 19 L 100 20 L 0 20 Z" fill="rgba(236, 72, 153, 0.1)" stroke="none" />
            </svg>
          </div>
        </Card>
      </div>

      {/* Database connection checks */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
            <span>Health Checks Status Matrix</span>
          </h3>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/20">
                  <th className="p-4">Server Node</th>
                  <th className="p-4">Region</th>
                  <th className="p-4">Latency</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-655 font-medium">
                {[
                  { name: "snapsy-core-api-node-1", region: "ap-south-1 (Mumbai)", delay: "12ms", state: "Healthy" },
                  { name: "snapsy-db-postgres-master", region: "ap-south-1 (Mumbai)", delay: "2ms", state: "Healthy" },
                  { name: "snapsy-ai-inference-vector-gpu", region: "us-east-1 (N. Virginia)", delay: "185ms", state: "Healthy" },
                  { name: "resend-mail-smtp-gateway", region: "external-api", delay: "42ms", state: "Healthy" },
                  { name: "razorpay-payments-webhook", region: "external-api", delay: "65ms", state: "Healthy" },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-800">{row.name}</td>
                    <td className="p-4 text-slate-400 font-semibold">{row.region}</td>
                    <td className="p-4 text-slate-700 font-semibold">{row.delay}</td>
                    <td className="p-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {row.state}
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
