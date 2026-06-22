"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Search, Building2, RefreshCw, Trash2, Loader2, Sparkles, User, Calendar, HardDrive, CreditCard, ShieldMinus, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

type OrgItem = {
  id: string
  name: string
  slug: string
  plan: string
  settings: any
  created_at: string
  events: { id: string }[]
  users: { id: string }[]
  transactions: { amount: number; status: string }[]
  storage_usage: { total_bytes: any }[] | null
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<OrgItem | null>(null)

  const fetchOrgs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/organizations?pageSize=100")
      if (!res.ok) throw new Error("Failed to load organizations")
      const result = await res.json()
      setOrgs(result.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrgs()
  }, [])

  const handlePlanChange = async (orgId: string, planId: string) => {
    setActioningId(orgId)
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, action: "change_plan", plan: planId }),
      })
      if (!res.ok) throw new Error((await res.json()).error?.message || "Failed to update plan tier")
      toast({ title: "Success", description: "Plan tier updated successfully." })
      fetchOrgs()
      if (selectedOrg?.id === orgId) {
        setSelectedOrg(prev => prev ? { ...prev, plan: planId } : null)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const toggleSuspend = async (orgId: string, currentSuspended: boolean) => {
    setActioningId(orgId)
    const is_suspended = !currentSuspended
    const action = is_suspended ? "suspend" : "activate"
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, action }),
      })
      if (!res.ok) throw new Error((await res.json()).error?.message || `Failed to ${action} organization`)
      toast({ title: "Success", description: `Organization has been ${is_suspended ? "suspended" : "activated"}.` })
      fetchOrgs()
      if (selectedOrg?.id === orgId) {
        setSelectedOrg(prev => {
          if (!prev) return null
          const settings = prev.settings && typeof prev.settings === "object" ? prev.settings : {}
          return { ...prev, settings: { ...settings, is_suspended } }
        })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization? All users, events, and photos under it will be permanently deleted. This action is irreversible.")) return
    setActioningId(orgId)
    try {
      const res = await fetch(`/api/admin/organizations?orgId=${orgId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error((await res.json()).error?.message || "Failed to delete organization")
      toast({ title: "Success", description: "Organization deleted." })
      fetchOrgs()
      if (selectedOrg?.id === orgId) setSelectedOrg(null)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const filteredOrgs = orgs.filter((o) => {
    const term = search.toLowerCase()
    return o.name.toLowerCase().includes(term) || o.slug.toLowerCase().includes(term)
  })

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organizations</h1>
          <p className="text-sm text-slate-500 mt-1">Manage tenant workspaces, plans, database consumption, and safety overrides.</p>
        </div>
        <Button onClick={fetchOrgs} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-slate-400" />
        <Input
          placeholder="Search organizations by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200 text-slate-800 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Organizations Table List */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-16 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-650" />
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                No organizations found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="p-4">Studio / Name</th>
                      <th className="p-4">Plan Tier</th>
                      <th className="p-4">Usage Stats</th>
                      <th className="p-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {filteredOrgs.map((o) => {
                      const storageBytes = (o.storage_usage && o.storage_usage[0]) ? Number(o.storage_usage[0].total_bytes) : 0
                      const storageGb = storageBytes / (1024 * 1024 * 1024)
                      const revenue = (o.transactions || [])
                        .filter(t => t.status === "success")
                        .reduce((sum, t) => sum + (t.amount || 0), 0) / 100

                      return (
                        <tr 
                          key={o.id} 
                          className={cn(
                            "hover:bg-slate-50/50 transition-colors cursor-pointer",
                            selectedOrg?.id === o.id ? "bg-violet-50/20" : "",
                            (o.settings && (o.settings as any).is_suspended) ? "bg-red-50/20" : ""
                          )}
                          onClick={() => setSelectedOrg(o)}
                        >
                          <td className="p-4">
                            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                              <span>{o.name}</span>
                              {o.settings && (o.settings as any).is_suspended && (
                                <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Suspended</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">slug: {o.slug}</div>
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={o.plan}
                              onChange={(e) => handlePlanChange(o.id, e.target.value)}
                              disabled={actioningId === o.id}
                              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 font-semibold shadow-sm"
                            >
                              <option value="free">Free</option>
                              <option value="starter">Starter</option>
                              <option value="standard">Standard</option>
                              <option value="premium">Premium</option>
                            </select>
                          </td>
                          <td className="p-4 space-y-1">
                            <div className="flex gap-4">
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                                <User className="h-3 w-3 text-slate-400" />
                                <span>{o.users?.length || 0}</span>
                              </span>
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span>{o.events?.length || 0}</span>
                              </span>
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                                <HardDrive className="h-3 w-3 text-slate-400" />
                                <span>{storageGb.toFixed(1)} GB</span>
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-extrabold text-slate-800 text-sm">
                            ₹{revenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
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

        {/* Selected Org Details Drawer */}
        <Card className="bg-white border-slate-200 shadow-sm p-6 sticky top-6">
          {selectedOrg ? {
            ...(() => {
              const storageBytes = (selectedOrg.storage_usage && selectedOrg.storage_usage[0]) ? Number(selectedOrg.storage_usage[0].total_bytes) : 0
              const storageGb = storageBytes / (1024 * 1024 * 1024)
              const revenue = (selectedOrg.transactions || [])
                .filter(t => t.status === "success")
                .reduce((sum, t) => sum + (selectedOrg.transactions ? t.amount : 0), 0) / 100

              return (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{selectedOrg.name}</h3>
                      <span className="text-xs text-slate-400 block mt-0.5">slug: {selectedOrg.slug}</span>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase",
                      selectedOrg.plan === "premium" ? "bg-violet-50 text-violet-750 border-violet-100" :
                      selectedOrg.plan === "standard" ? "bg-pink-50 text-pink-700 border-pink-100" :
                      selectedOrg.plan === "starter" ? "bg-orange-50 text-orange-700 border-orange-100" :
                      "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {selectedOrg.plan}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Tenant ID</span>
                      <span className="font-mono text-slate-700 font-semibold">{selectedOrg.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Members Count</span>
                      <span className="text-slate-700 font-semibold flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{selectedOrg.users?.length || 0} active users</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Total Events</span>
                      <span className="text-slate-700 font-semibold flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{selectedOrg.events?.length || 0} collections</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Storage Used</span>
                      <span className="text-slate-700 font-semibold flex items-center gap-1">
                        <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                        <span>{storageGb.toFixed(2)} GB</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">LTV Revenue</span>
                      <span className="text-slate-800 font-extrabold flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                        <span>₹{revenue.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Creation Date</span>
                      <span className="text-slate-700 font-semibold">{new Date(selectedOrg.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Workspace Controls</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => toggleSuspend(selectedOrg.id, !!(selectedOrg.settings && (selectedOrg.settings as any).is_suspended))}
                        variant="outline"
                        className={cn("w-full text-xs font-bold border shadow-sm",
                          (selectedOrg.settings && (selectedOrg.settings as any).is_suspended)
                            ? "text-emerald-700 border-emerald-100 bg-emerald-50 hover:bg-emerald-100" 
                            : "text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {(selectedOrg.settings && (selectedOrg.settings as any).is_suspended) ? "Activate Studio" : "Suspend Studio"}
                      </Button>
                      <Button
                        onClick={() => handleDeleteOrg(selectedOrg.id)}
                        className="w-full text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 shadow-sm"
                      >
                        Delete Studio
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()
          } : (
            <div className="h-64 flex flex-col justify-center items-center text-center text-slate-400">
              <Building2 className="h-8 w-8 text-slate-300 mb-2" />
              <span className="text-xs font-semibold">Select an organization studio to view details, usage reports, and limits toggles.</span>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
