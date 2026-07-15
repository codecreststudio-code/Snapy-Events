"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { HardDrive, RefreshCw, Layers, Database, Loader2, Sparkles, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type StorageRow = {
  id: string
  user_id: string | null
  total_bytes: any // stored as bigint string
  photo_count: number
  video_count: number | null
  updated_at: string
  user: {
    full_name: string
    email: string
    subscriptions: Array<{
      plan_id: string
      status: string
    }>
  } | null
}

function bytesToGb(bytes: any): number {
  const n = typeof bytes === "string" ? parseFloat(bytes) : Number(bytes)
  if (!n || isNaN(n)) return 0
  return n / (1024 * 1024 * 1024)
}

function storageLimitGb(plan: string, plansList: any[]): number {
  const planData = plansList.find((p) => p.id === plan)
  return planData?.limits?.storage_limit_gb ?? 10
}

function getActivePlan(row: StorageRow): string {
  const activeSub = row.user?.subscriptions?.find((s) => s.status === "active")
  return activeSub?.plan_id || "free"
}

export default function AdminStoragePage() {
  const [rows, setRows] = useState<StorageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/admin/subscriptions/plans")
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) setPlans(json.data)
        }
      } catch (e) {
        console.error("Failed to fetch plans", e)
      }
    }
    fetchPlans()
  }, [])

  const fetchStorageData = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/storage?page=${pg}&pageSize=${PAGE_SIZE}`)
      if (!res.ok) throw new Error("Failed to load storage analytics")
      const result = await res.json()
      setRows(result.data || [])
      const pagination = result.meta?.pagination
      if (pagination) {
        setTotalPages(pagination.totalPages || 1)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStorageData(page)
  }, [fetchStorageData, page])

  const totalUsedBytes = rows.reduce((sum, row) => sum + parseFloat(row.total_bytes || "0"), 0)
  const totalUsedGb = totalUsedBytes / (1024 * 1024 * 1024)
  const totalPhotos = rows.reduce((sum, row) => sum + (row.photo_count || 0), 0)
  const nearCapacity = rows.filter((r) => {
    const used = bytesToGb(r.total_bytes)
    const limit = storageLimitGb(getActivePlan(r), plans)
    return limit > 0 && used / limit >= 0.8
  })

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Storage Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Review file uploads, quota consumption, and per-user disk usage.</p>
        </div>
        <Button onClick={() => fetchStorageData(page)} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Storage Used</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {totalUsedGb < 1 ? `${(totalUsedGb * 1024).toFixed(1)} MB` : `${totalUsedGb.toFixed(2)} GB`}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">across {rows.length} users</span>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Photos Stored</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{totalPhotos.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 font-semibold">live in storage buckets</span>
          </div>
        </Card>

        <Card className={cn("bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm", nearCapacity.length > 0 && "border-amber-200 bg-amber-50/30")}>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border",
            nearCapacity.length > 0 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
          )}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Near Quota (&gt;80%)</span>
            <span className={cn("text-2xl font-bold mt-1 block", nearCapacity.length > 0 ? "text-amber-700" : "text-slate-900")}>
              {nearCapacity.length} users
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">approaching their storage limit</span>
          </div>
        </Card>
      </div>

      {/* Storage Table */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Database className="h-4 w-4 text-violet-600" />
              Per-User Storage Breakdown
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">{rows.length} records</span>
          </div>

          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-16 text-slate-400 text-center text-xs font-semibold">
              No storage usage records found. Usage is tracked after the first photo upload.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="p-4">User</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Photos</th>
                    <th className="p-4">Storage Used</th>
                    <th className="p-4">Quota</th>
                    <th className="p-4 text-right">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {rows.map((row) => {
                    const usedGb = bytesToGb(row.total_bytes)
                    const activePlan = getActivePlan(row)
                    const limitGb = storageLimitGb(activePlan, plans)
                    const usagePct = limitGb > 0 ? Math.min(100, (usedGb / limitGb) * 100) : 0
                    const isWarning = usagePct >= 80
                    const isCritical = usagePct >= 95

                    return (
                      <tr key={row.id} className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        isCritical ? "bg-rose-50/20" : isWarning ? "bg-amber-50/20" : ""
                      )}>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{row.user?.full_name ?? "—"}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {row.user?.email || (row.user_id ? row.user_id.slice(0, 8) + "…" : "Unassigned")}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase",
                            activePlan === "premium" ? "bg-violet-50 text-violet-700 border-violet-100" :
                            activePlan === "standard" ? "bg-blue-50 text-blue-700 border-blue-100" :
                            activePlan === "starter" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            {activePlan}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-700">{(row.photo_count || 0).toLocaleString()}</td>
                        <td className="p-4 font-semibold text-slate-700">
                          {usedGb < 1 ? `${(usedGb * 1024).toFixed(0)} MB` : `${usedGb.toFixed(2)} GB`}
                        </td>
                        <td className="p-4 text-slate-400 font-semibold">{limitGb >= 1000 ? "1 TB" : `${limitGb} GB`}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all",
                                  isCritical ? "bg-rose-500" : isWarning ? "bg-amber-400" : "bg-violet-500"
                                )}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                            <span className={cn("text-[10px] font-bold w-8",
                              isCritical ? "text-rose-600" : isWarning ? "text-amber-600" : "text-slate-400"
                            )}>
                              {usagePct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 text-xs border-slate-200">Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 text-xs border-slate-200">Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
