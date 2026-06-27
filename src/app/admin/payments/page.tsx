"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { CreditCard, RefreshCw, CheckCircle, XCircle, AlertCircle, Search, Loader2, ArrowUpRight, Ban } from "lucide-react"
import { cn } from "@/lib/utils"

type PaymentTx = {
  id: string
  razorpay_payment_id: string | null
  razorpay_order_id: string | null
  amount: number
  currency: string
  status: string
  payment_method: string | null
  created_at: string
  user?: {
    name: string
  }
}

export default function AdminPaymentsPage() {
  const [txs, setTxs] = useState<PaymentTx[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actioningId, setActioningId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, razorpay_payment_id, razorpay_order_id, amount, currency, status, payment_method, created_at, user:organizations(name)")
        .order("created_at", { ascending: false })

      if (error) throw error
      setTxs((data as any) || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const handleRefund = async (txId: string) => {
    if (!confirm("Are you sure you want to trigger a refund for this transaction? This will call Razorpay's refund API.")) return
    setActioningId(txId)
    try {
      const res = await fetch("/api/admin/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId, reason: "admin_initiated_refund" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || "Refund failed")
      toast({
        title: "Refund Initiated",
        description: data.data?.refund_id
          ? `Refund ID: ${data.data.refund_id} — ${data.data.status}`
          : "Refund recorded successfully.",
      })
      fetchPayments()
    } catch (err: any) {
      toast({ title: "Refund Failed", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const filteredTxs = txs.filter((tx) => {
    const term = search.toLowerCase()
    return (
      (tx.razorpay_payment_id || "").toLowerCase().includes(term) ||
      (tx.razorpay_order_id || "").toLowerCase().includes(term) ||
      (tx.user?.name || "").toLowerCase().includes(term)
    )
  })

  // Calculate aggregates
  const successCount = txs.filter(t => t.status === "success").length
  const failedCount = txs.filter(t => t.status === "failed").length
  const refundedCount = txs.filter(t => t.status === "refunded").length

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">Review webhook event logs, manage gateway checkouts, and execute customer refunds.</p>
        </div>
        <Button onClick={fetchPayments} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Successful Orders</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{successCount} payments</span>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-650 border border-rose-100">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Failed Invoices</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{failedCount} failed</span>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Refunded Checkouts</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{refundedCount} refunds</span>
          </div>
        </Card>
      </div>

      {/* Search Input */}
      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-slate-400" />
        <input
          placeholder="Filter transactions by order, ID, studio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-9 text-xs text-slate-800 font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 shadow-sm"
        />
      </div>

      {/* Transactions Table */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-650" />
            </div>
          ) : filteredTxs.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm font-semibold">
              No transactions logs matching the filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="p-4">Razorpay Payment ID</th>
                    <th className="p-4">Organization</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {filteredTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-slate-800 font-bold">{tx.razorpay_payment_id || "N/A"}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Order: {tx.razorpay_order_id || "N/A"}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{tx.user?.name || "N/A"}</td>
                      <td className="p-4 font-extrabold text-slate-850 text-sm">
                        ₹{(tx.amount / 100).toLocaleString()}
                      </td>
                      <td className="p-4 uppercase text-slate-400 font-bold text-[10px]">
                        {tx.payment_method || "N/A"}
                      </td>
                      <td className="p-4 text-slate-400 font-semibold">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          tx.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          tx.status === "refunded" ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-rose-50 text-rose-700 border-rose-100"
                        )}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {tx.status === "success" && (
                          <Button
                            onClick={() => handleRefund(tx.id)}
                            disabled={actioningId === tx.id}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] px-2.5 py-1.5 h-auto rounded-lg border border-rose-100 shadow-sm"
                          >
                            Refund
                          </Button>
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
    </main>
  )
}
