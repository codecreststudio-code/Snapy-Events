"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { CreditCard, RefreshCw, DollarSign, TrendingUp, ShoppingBag, Loader2, Sparkles } from "lucide-react"

type TransactionItem = {
  id: string
  organization_id: string
  razorpay_payment_id: string | null
  razorpay_order_id: string | null
  amount: number
  currency: string
  status: string
  payment_method: string | null
  created_at: string
  organization?: {
    name: string
  }
}

export default function AdminRevenuePage() {
  const [txs, setTxs] = useState<TransactionItem[]>([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    totalOrganizations: 0,
    transactionCount: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchRevenueData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/revenue")
      if (!res.ok) throw new Error("Failed to load revenue analytics")
      const data = await res.json()
      
      const transactions = data.transactions || []
      setTxs(transactions)
      setStats({
        totalRevenue: data.total_revenue / 100, // paise to Rs
        activeSubscriptions: data.active_subscriptions,
        totalOrganizations: data.total_organizations,
        transactionCount: data.transaction_count
      })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenueData()
  }, [])

  const averageTicket = stats.transactionCount ? (stats.totalRevenue / stats.transactionCount) : 0

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Revenue Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Track transaction history, ticket sizes, and payment integrations.</p>
        </div>
        <Button onClick={fetchRevenueData} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Sales</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">₹{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Average Ticket Size</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">₹{averageTicket.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Paid Orders Count</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.transactionCount}</span>
          </div>
        </Card>
      </div>

      {/* Sales Growth Chart */}
      <Card className="bg-white border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <span>Sales Growth (Last 7 Days)</span>
        </h3>
        
        <div className="h-48 w-full flex items-end">
          <svg className="w-full h-full text-violet-500" viewBox="0 0 100 20" preserveAspectRatio="none">
            <path
              d="M 0 18 Q 15 12, 30 14 T 60 8 T 90 4 L 100 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M 0 18 Q 15 12, 30 14 T 60 8 T 90 4 L 100 2 L 100 20 L 0 20 Z"
              fill="url(#grad)"
              stroke="none"
            />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(139, 92, 246, 0.15)" />
                <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-2 px-1">
          <span>7 Days Ago</span>
          <span>4 Days Ago</span>
          <span>Today</span>
        </div>
      </Card>

      {/* Transaction Logs table */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Transaction History</h3>
          </div>
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : txs.length === 0 ? (
            <div className="p-16 text-slate-400 text-center text-xs">No payment transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="p-4">Payment ID</th>
                    <th className="p-4">Organization</th>
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
                      <td className="p-4 font-semibold text-slate-700">
                        {tx.organization?.name || "N/A"}
                      </td>
                      <td className="p-4 font-extrabold text-slate-800 text-sm">
                        ₹{(tx.amount / 100).toLocaleString()}
                      </td>
                      <td className="p-4 uppercase text-slate-400 font-bold text-[10px]">
                        {tx.payment_method || "N/A"}
                      </td>
                      <td className="p-4 text-slate-400 font-semibold">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          tx.status === "success"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
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

