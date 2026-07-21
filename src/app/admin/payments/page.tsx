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
    full_name: string
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
        .select("id, razorpay_payment_id, razorpay_order_id, amount, currency, status, payment_method, created_at, user:users(full_name)")
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
      (tx.user?.full_name || "").toLowerCase().includes(term)
    )
  })

  // Calculate aggregates
  const successCount = txs.filter(t => t.status === "success").length
  const failedCount = txs.filter(t => t.status === "failed").length
  const refundedCount = txs.filter(t => t.status === "refunded").length

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-white">Payments Ledger</h1>
          <p className="text-sm text-white/50 mt-1">Review webhook event logs, manage gateway checkouts, and execute customer refunds.</p>
        </div>
        <Button onClick={fetchPayments} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-white/70 bg-white/5 hover:bg-white/10 font-semibold">
          <RefreshCw className="h-4 w-4 text-white/50" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Successful Orders</span>
            <span className="text-2xl font-bold text-white mt-1 block">{successCount} payments</span>
          </div>
        </Card>

        <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Failed Invoices</span>
            <span className="text-2xl font-bold text-white mt-1 block">{failedCount} failed</span>
          </div>
        </Card>

        <Card className="bg-surface-card border-hairline-dark p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider block">Refunded Checkouts</span>
            <span className="text-2xl font-bold text-white mt-1 block">{refundedCount} refunds</span>
          </div>
        </Card>
      </div>

      {/* Search Input */}
      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-white/40" />
        <input
          placeholder="Filter transactions by order, ID, studio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-hairline-dark bg-white/5 px-3 py-2 pl-9 text-xs text-white placeholder:text-white/40 font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mauve/50"
        />
      </div>

      {/* Transactions Table */}
      <Card className="bg-surface-card border-hairline-dark overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-mauve" />
            </div>
          ) : filteredTxs.length === 0 ? (
            <div className="p-16 text-center text-white/40 text-sm font-semibold">
              No transactions logs matching the filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-hairline-dark text-white/40 font-bold uppercase tracking-wider bg-surface-card-elevated">
                    <th className="p-4">Razorpay Payment ID</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white/60 font-medium">
                  {filteredTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-white/80 font-bold">{tx.razorpay_payment_id || "N/A"}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">Order: {tx.razorpay_order_id || "N/A"}</div>
                      </td>
                      <td className="p-4 font-semibold text-white/70">{tx.user?.full_name || "N/A"}</td>
                      <td className="p-4 font-extrabold text-white text-sm">
                        ₹{(tx.amount / 100).toLocaleString()}
                      </td>
                      <td className="p-4 uppercase text-white/40 font-bold text-[10px]">
                        {tx.payment_method || "N/A"}
                      </td>
                      <td className="p-4 text-white/40 font-semibold">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          tx.status === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          tx.status === "refunded" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {tx.status === "success" && (
                          <Button
                            onClick={() => handleRefund(tx.id)}
                            disabled={actioningId === tx.id}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] px-2.5 py-1.5 h-auto rounded-lg border border-red-500/20"
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
