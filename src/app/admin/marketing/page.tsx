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

export default function AdminMarketingPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([])
  const [referrals, setReferrals] = useState<ReferralItem[]>([])
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
      const [couponsRes, referralsRes] = await Promise.all([
        supabase.from("coupons").select("id, code, discount_type, discount_value, used_count, is_active, created_at").order("created_at", { ascending: false }),
        supabase.from("referrals").select("id, status, reward_credited, created_at, referral_code, referrer:users!referrer_user_id(full_name)").order("created_at", { ascending: false }).limit(10)
      ])

      if (couponsRes.error) throw couponsRes.error
      setCoupons((couponsRes.data as any) || [])
      setReferrals((referralsRes.data as any) || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Marketing & Promotion</h1>
          <p className="text-sm text-slate-500 mt-1">Configure active promotional coupons, discounts, and track user referral points.</p>
        </div>
        <Button onClick={fetchMarketingData} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

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
