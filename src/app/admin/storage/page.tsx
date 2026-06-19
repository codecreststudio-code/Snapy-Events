"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { HardDrive, RefreshCw, Layers, Database, ChevronRight, Loader2, Sparkles } from "lucide-react"

type StorageUsageItem = {
  organizationName: string
  plan: string
  photoCount: number
  storageUsedGb: number
  storageLimitGb: number
}

export default function AdminStoragePage() {
  const [data, setData] = useState<StorageUsageItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStorageData = async () => {
    setLoading(true)
    // Seed mock data for storage metrics representing platform usages
    setTimeout(() => {
      setData([
        { organizationName: "Studio Pro Shots", plan: "premium", photoCount: 1450, storageUsedGb: 43.5, storageLimitGb: 1000 },
        { organizationName: "Delhi Wedding Stories", plan: "standard", photoCount: 680, storageUsedGb: 18.2, storageLimitGb: 100 },
        { organizationName: "Shutterbug Labs", plan: "starter", photoCount: 95, storageUsedGb: 2.1, storageLimitGb: 10 },
        { organizationName: "Vibrant Clicks Studio", plan: "premium", photoCount: 820, storageUsedGb: 24.6, storageLimitGb: 1000 },
        { organizationName: "Delhi Fashion Hub", plan: "free", photoCount: 22, storageUsedGb: 0.5, storageLimitGb: 1 }
      ])
      setLoading(false)
    }, 500)
  }

  useEffect(() => {
    fetchStorageData()
  }, [])

  const totalUsedGb = data.reduce((sum, item) => sum + item.storageUsedGb, 0)
  const totalPhotosCount = data.reduce((sum, item) => sum + item.photoCount, 0)

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Storage Analytics" description="Review file uploads, quota limits, and database disk consumption." />
        <Button onClick={fetchStorageData} variant="outline" className="border-slate-800 flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Storage Used</span>
            <span className="text-2xl font-bold text-slate-100">{totalUsedGb.toFixed(2)} GB</span>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Photos Uploaded</span>
            <span className="text-2xl font-bold text-slate-100">{totalPhotosCount.toLocaleString()}</span>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Database Rows</span>
            <span className="text-2xl font-bold text-slate-100">~15,240</span>
          </div>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-bold text-slate-100">Storage Usage by Organization</h3>
          </div>
          
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="p-4">Organization Name</th>
                    <th className="p-4">Plan Tier</th>
                    <th className="p-4">Photos Count</th>
                    <th className="p-4">Disk Consumption</th>
                    <th className="p-4">Quota Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {data.map((item, idx) => {
                    const usagePercent = Math.min((item.storageUsedGb / item.storageLimitGb) * 100, 100)
                    return (
                      <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-semibold text-slate-200">{item.organizationName}</td>
                        <td className="p-4 uppercase text-orange-500/80 font-bold text-xs">{item.plan}</td>
                        <td className="p-4 text-slate-300">{item.photoCount.toLocaleString()} photos</td>
                        <td className="p-4 font-bold text-slate-100">{item.storageUsedGb.toFixed(2)} GB</td>
                        <td className="p-4 min-w-[200px]">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">{usagePercent.toFixed(1)}%</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-1">Limit: {item.storageLimitGb} GB</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
