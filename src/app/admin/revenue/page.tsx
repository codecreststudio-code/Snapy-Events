"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import {
  CreditCard, RefreshCw, DollarSign, TrendingUp, ShoppingBag,
  Loader2, Sparkles, XCircle, RotateCcw, Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

type TransactionItem = {
  id: string
  user_id: string
  razorpay_payment_id: string | null
  razorpay_order_id: string | null
  amount: number
  currency: string
  status: string
  payment_method: string | null
  created_at: string
  user?: { full_name: string }
}

type DailyRevenue = { date: string; amount: number }

function RevenueChart({ data, days }: { data: DailyRevenue[]; days: number }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-300 text-xs font-semibold">
        No revenue data in this period
      </div>
    )
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 1)

  // Build SVG polyline points
  const width = 100
  const height = 20
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (d.amount / maxAmount) * (height - 2) - 1
    return `${x},${y}`
  })
  const polyline = points.join(" ")
  const fillPath = `${points[0]} ${polyline} ${width},${height} 0,${height}`

  // Label every ~7 points
  const labelStep = Math.ceil(data.length / 7)
  const labels = data.filter((_, i) => i % labelStep === 0 || i === data.length - 1)

  return (
    <div>
      <div className="h-48 w-full relative">
        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="revGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.25)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
            </linearGradient>
          </defs>
          <polygon points={fillPath} fill="url(#revGrad)" />
          <polyline
            points={polyline}
            fill="none"
            stroke="rgb(139, 92, 246)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Data point dots */}
          {data.map((d, i) => {
            if (d.amount === 0) return null
            const x = (i / (data.length - 1)) * width
            const y = height - (d.amount / maxAmount) * (height - 2) - 1
            return (
              <circle key={i} cx={x} cy={y} r="0.8" fill="rgb(139, 92, 246)" />
            )
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-2 px-1">
        {labels.map((l) => (
          <span key={l.date}>{new Date(l.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
        ))}
      </div>
    </div>
  )
}

export default function AdminRevenuePage() {
  const [txs, setTxs] = useState<TransactionItem[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    totalUsers: 0,
    transactionCount: 0,
    failedCount: 0,
    refundedCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  const fetchRevenueData = useCallback(async (d = days) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/revenue?days=${d}`)
      if (!res.ok) throw new Error("Failed to load revenue analytics")
      const data = await res.json()

      const transactions = data.data?.transactions || data.transactions || []
      const daily = data.data?.daily_revenue || data.daily_revenue || []
      setTxs(transactions)
      setDailyRevenue(daily)
      const payload = data.data || data
      setStats({
        totalRevenue: (payload.total_revenue ?? 0) / 100, // paise to Rs
        activeSubscriptions: payload.active_subscriptions ?? 0,
        totalUsers: payload.total_users ?? 0,
        transactionCount: payload.transaction_count ?? 0,
        failedCount: payload.failed_count ?? 0,
        refundedCount: payload.refunded_count ?? 0,
      })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchRevenueData(days)
  }, [days])

  const averageTicket = stats.transactionCount ? stats.totalRevenue / stats.transactionCount : 0

  const PERIODS = [
    { label: "7 Days", value: 7 },
    { label: "30 Days", value: 30 },
    { label: "90 Days", value: 90 },
    { label: "1 Year", value: 365 },
  ]

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Revenue Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Track transaction history, ticket sizes, and payment integrations.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                  days === p.value ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            onClick={() => fetchRevenueData(days)}
            disabled={loading}
            variant="outline"
            className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-500", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Revenue</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {loading ? "…" : `₹${stats.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">last {days} days</span>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Avg. Ticket Size</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {loading ? "…" : `₹${averageTicket.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">{stats.transactionCount} paid orders</span>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Active Subscriptions</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {loading ? "…" : stats.activeSubscriptions}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">of {stats.totalUsers} registered users</span>
          </div>
        </Card>
      </div>

      {/* Dynamic Revenue Chart */}
      <Card className="bg-white border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <span>Revenue Trend — Last {days} Days</span>
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />{stats.failedCount} failed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />{stats.refundedCount} refunded
            </span>
          </div>
        </div>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : (
          <RevenueChart data={dailyRevenue} days={days} />
        )}
      </Card>

      {/* Transaction Logs Table */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Transaction History ({days}-day window)</h3>
          </div>
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : txs.length === 0 ? (
            <div className="p-16 text-slate-400 text-center text-xs font-semibold">No payment transactions found in this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="p-4">Payment ID</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {txs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-slate-800 font-bold">{tx.razorpay_payment_id || "N/A"}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Order: {tx.razorpay_order_id || "N/A"}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{tx.user?.full_name || "N/A"}</td>
                      <td className="p-4 font-extrabold text-slate-800 text-sm">₹{(tx.amount / 100).toLocaleString("en-IN")}</td>
                      <td className="p-4 uppercase text-slate-400 font-bold text-[10px]">{tx.payment_method || "N/A"}</td>
                      <td className="p-4 text-slate-400 font-semibold">
                        {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-4 text-right">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          tx.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          tx.status === "refunded" ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-rose-50 text-rose-700 border-rose-100"
                        )}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
