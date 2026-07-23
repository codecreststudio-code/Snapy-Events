"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { ClipboardList, RefreshCw, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react"

type AuditLogItem = {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  ip_address: string | null
  created_at: string
  user?: {
    email: string
  }
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, resource_type, resource_id, ip_address, created_at, user:users(email)")
        .order("created_at", { ascending: false })
        .limit(30)

      if (error) throw error
      setLogs((data as any) || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-ink">Audit Logs</h1>
          <p className="text-sm text-ink-secondary mt-1">Monitor administrator actions, credential resets, settings modifications, and IP logins.</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-ink-secondary bg-surface-card hover:bg-mauve/5 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-ink-secondary" />
          <span>Refresh</span>
        </Button>
      </div>

      <Card className="bg-surface-card border-hairline-dark overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-mauve" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center text-ink-tertiary text-sm font-semibold">
              No audit logs captured. Logs are created when actions are performed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-hairline-dark text-ink-tertiary font-bold uppercase tracking-wider bg-ink/5">
                    <th className="p-4">Action</th>
                    <th className="p-4">Admin Email</th>
                    <th className="p-4">Resource Target</th>
                    <th className="p-4">IP Address</th>
                    <th className="p-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-dark text-ink-secondary font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-mauve/5 transition-colors">
                      <td className="p-4 font-bold text-ink flex items-center gap-1.5">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                        <span>{log.action}</span>
                      </td>
                      <td className="p-4 font-semibold text-ink-secondary">{log.user?.email || "Superadmin Session"}</td>
                      <td className="p-4">
                        <span className="uppercase text-[9px] font-extrabold bg-ink/5 px-1.5 py-0.5 rounded text-ink-secondary">
                          {log.resource_type}
                        </span>
                        {log.resource_id && (
                          <span className="font-mono text-[10px] text-ink-tertiary ml-2">ID: {log.resource_id.substring(0, 8)}...</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-ink-secondary">{log.ip_address || "127.0.0.1 (API Direct)"}</td>
                      <td className="p-4 text-right text-ink-tertiary font-semibold">{new Date(log.created_at).toLocaleString()}</td>
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
