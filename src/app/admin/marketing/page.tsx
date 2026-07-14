"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Megaphone, Plus, Trash2, RefreshCw, Loader2, Sparkles, Gift, Percent, ShieldCheck } from "lucide-react"

type CouponItem = {
  id: string
  code: string
  discount_type: string
  discount_value: number
  used_count: number
  is_active: boolean
  created_at: string
}

type ReferralItem = {
  id: string
  status: string
  reward_credited: boolean
  created_at: string
  referral_code: string
  referrer?: { full_name: string }
}

type LeadContact = {
  id: string
  name: string
  email: string
  mobile: string
  type: "Host" | "Guest Lead"
  plan: string
  subStatus?: string
  lastActive: string
  eventCountOrName: string
}

export default function AdminMarketingPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([])
  const [referrals, setReferrals] = useState<ReferralItem[]>([])
  const [leads, setLeads] = useState<LeadContact[]>([])
  const [leadFilter, setLeadFilter] = useState<"all" | "hosts" | "guests">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)

  // Form state
  const [newCode, setNewCode] = useState("")
  const [discountValue, setDiscountValue] = useState(10)
  const [discountType, setDiscountType] = useState("percentage")

  const supabase = createClient()

  const fetchMarketingData = async () => {
    setLoading(true)
    try {
      const [couponsRes, referralsRes, usersRes, accessRes] = await Promise.all([
        supabase.from("coupons").select("id, code, discount_type, discount_value, used_count, is_active, created_at").order("created_at", { ascending: false }),
        supabase.from("referrals").select("id, status, reward_credited, created_at, referral_code, referrer:users!referrer_user_id(full_name)").order("created_at", { ascending: false }).limit(10),
        supabase.from("users").select("id, full_name, email, phone_number, plan, role, created_at, subscriptions(plan_id, status)").order("created_at", { ascending: false }),
        supabase.from("photo_access").select("id, guest_name, guest_email, permissions, accessed_at, event:events(name)").order("accessed_at", { ascending: false }).limit(300)
      ])

      if (couponsRes.error) throw couponsRes.error
      setCoupons((couponsRes.data as any) || [])
      setReferrals((referralsRes.data as any) || [])

      const compiledLeads: LeadContact[] = []

      // Add Host Users
      if (usersRes.data) {
        usersRes.data.forEach((u: any) => {
          const activeSub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions
          compiledLeads.push({
            id: `usr-${u.id}`,
            name: u.full_name || "Host User",
            email: u.email || "—",
            mobile: u.phone_number || "—",
            type: "Host",
            plan: activeSub?.plan_id || u.plan || "free",
            subStatus: activeSub?.status || "active",
            lastActive: new Date(u.created_at).toLocaleDateString(),
            eventCountOrName: "Host Account",
          })
        })
      }

      // Add Guest Check-in Leads
      if (accessRes.data) {
        accessRes.data.forEach((a: any) => {
          const mobile = a.permissions?.mobile || "—"
          if (a.guest_email || mobile !== "—") {
            compiledLeads.push({
              id: `acc-${a.id}`,
              name: a.guest_name || "Guest",
              email: a.guest_email || "—",
              mobile,
              type: "Guest Lead",
              plan: "Guest Lead",
              subStatus: "Check-in Lead",
              lastActive: new Date(a.accessed_at).toLocaleDateString(),
              eventCountOrName: (a.event as any)?.name || "Joined Memory Capsule",
            })
          }
        })
      }

      setLeads(compiledLeads)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const exportLeadsCSV = () => {
    if (leads.length === 0) return
    const headers = "Name,Email,Mobile,Type,Plan,Status,Last Active,Event Context\n"
    const rows = leads.map(l => `"${l.name}","${l.email}","${l.mobile}","${l.type}","${l.plan}","${l.subStatus || ''}","${l.lastActive}","${l.eventCountOrName}"`).join("\n")
    const blob = new Blob([headers + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `snapsy_customer_leads_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Export Complete", description: `Exported ${leads.length} customer leads to CSV.` })
  }

  useEffect(() => {
    fetchMarketingData()
  }, [])

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCode) return
    setActioning(true)
    try {
      const { error } = await supabase
        .from("coupons")
        .insert({
          code: newCode.toUpperCase(),
          discount_type: discountType,
          discount_value: discountValue,
          is_active: true
        })

      if (error) throw error
      toast({ title: "Coupon Created", description: `Promo code ${newCode.toUpperCase()} is now active.` })
      setNewCode("")
      fetchMarketingData()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm("Are you sure you want to delete this coupon code?")) return
    setActioning(true)
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", couponId)
      if (error) throw error
      toast({ title: "Coupon Deleted", description: "Promo code has been removed." })
      fetchMarketingData()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioning(false)
    }
  }

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Marketing & Customer Retargeting</h1>
          <p className="text-sm text-slate-500 mt-1">Manage promotional coupons, customer retargeting contacts, subscription statuses, and referral logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportLeadsCSV} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
            <DownloadIcon className="h-4 w-4 text-emerald-600" />
            <span>Export CSV</span>
          </Button>
          <Button onClick={fetchMarketingData} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Customer & Retargeting Lead Directory Card */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-violet-600" />
            <h3 className="font-bold text-slate-800 text-sm">Customer & Retargeting Contacts</h3>
            <span className="bg-violet-100 text-violet-750 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-200">
              {leads.length} Total
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                placeholder="Search name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs w-48 sm:w-64 bg-white border-slate-200"
              />
            </div>
            <select
              value={leadFilter}
              onChange={(e: any) => setLeadFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-sm"
            >
              <option value="all">All Contacts</option>
              <option value="hosts">Hosts Only</option>
              <option value="guests">Guest Leads</option>
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No customer check-in leads captured yet.</div>
          ) : (
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr className="text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3.5">Customer / Lead</th>
                    <th className="p-3.5">Contact Email</th>
                    <th className="p-3.5">Mobile Number</th>
                    <th className="p-3.5">Subscription Plan</th>
                    <th className="p-3.5">Context / Event</th>
                    <th className="p-3.5 text-right">Retarget Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
                  {leads
                    .filter((l) => {
                      if (leadFilter === "hosts" && l.type !== "Host") return false
                      if (leadFilter === "guests" && l.type !== "Guest Lead") return false
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase()
                        return (
                          l.name.toLowerCase().includes(q) ||
                          l.email.toLowerCase().includes(q) ||
                          l.mobile.toLowerCase().includes(q) ||
                          l.plan.toLowerCase().includes(q)
                        )
                      }
                      return true
                    })
                    .slice(0, 100)
                    .map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{lead.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              lead.type === "Host" ? "bg-violet-50 text-violet-750 border-violet-200" : "bg-blue-50 text-blue-750 border-blue-200"
                            }`}>
                              {lead.type}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">{lead.email}</td>
                        <td className="p-3.5 font-mono text-slate-700">{lead.mobile}</td>
                        <td className="p-3.5">
                          <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                            {lead.plan}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">{lead.eventCountOrName}</td>
                        <td className="p-3.5 text-right space-x-2">
                          {lead.email !== "—" && (
                            <a
                              href={`mailto:${lead.email}?subject=Exclusive Offer from Snapsy`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-800 underline"
                            >
                              Email
                            </a>
                          )}
                          {lead.mobile !== "—" && (
                            <a
                              href={`https://wa.me/${lead.mobile.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-800 underline"
                            >
                              WhatsApp
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Coupons List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-violet-600" />
                <span>Active Discount Coupons</span>
              </h3>
            </div>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-650" />
                </div>
              ) : coupons.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">No active discount codes found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/20">
                        <th className="p-4">Coupon Code</th>
                        <th className="p-4">Discount</th>
                        <th className="p-4">Times Used</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
                      {coupons.map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4">
                            <span className="font-mono bg-violet-50 text-violet-750 font-bold px-2.5 py-1 rounded border border-violet-100">
                              {coupon.code}
                            </span>
                          </td>
                          <td className="p-4">
                            {coupon.discount_value} {coupon.discount_type === "percentage" ? "% OFF" : "INR OFF"}
                          </td>
                          <td className="p-4 text-slate-400">{coupon.used_count} checkouts</td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              disabled={actioning}
                              variant="ghost"
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Logs */}
          <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Gift className="h-4.5 w-4.5 text-violet-650" />
                <span>Referral Programs History</span>
              </h3>
            </div>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
              ) : referrals.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">No referral events logged yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/20">
                        <th className="p-4">Referrer User</th>
                        <th className="p-4">Referral Code</th>
                        <th className="p-4">Reward State</th>
                        <th className="p-4 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                      {referrals.map((ref) => (
                        <tr key={ref.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{ref.referrer?.full_name || "N/A"}</td>
                          <td className="p-4 text-slate-700 font-mono font-bold">{ref.referral_code || "—"}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              ref.reward_credited ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {ref.reward_credited ? "Reward Credited" : ref.status}
                            </span>
                          </td>
                          <td className="p-4 text-right text-slate-400 font-semibold">
                            {new Date(ref.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Generate Coupon Form */}
        <Card className="bg-white border-slate-200 p-6 sticky top-6 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-4">
            <Megaphone className="h-4.5 w-4.5 text-violet-600" />
            <span>Generate Coupon Code</span>
          </h3>
          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coupon Code</label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="e.g. SNAPSYSUMMER50"
                required
                className="bg-white border-slate-200 text-slate-800 font-mono font-bold"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 shadow-sm"
                >
                  <option value="percentage">Percent OFF</option>
                  <option value="fixed">Fixed INR</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Value</label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)}
                  min={1}
                  required
                  className="bg-white border-slate-200 text-slate-800"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={actioning}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-10 shadow-sm"
            >
              <span>Activate Promo Code</span>
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
