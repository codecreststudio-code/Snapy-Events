"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Search, ShieldAlert, Key, UserCheck, UserMinus, Trash2, ShieldCheck, RefreshCw, Sparkles, Loader2 } from "lucide-react"

type UserItem = {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
  organization_id: string | null
  organization: {
    id: string
    name: string
    plan: string
  } | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Failed to load users")
      const data = await res.json()
      setUsers(data.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleStatusChange = async (userId: string, currentStatus: boolean) => {
    setActioningId(userId)
    const action = currentStatus ? "suspend" : "activate"
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      })
      if (!res.ok) throw new Error(`Failed to ${action} user`)
      toast({ title: "Success", description: `User account has been ${currentStatus ? "suspended" : "activated"}.` })
      fetchUsers()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const handlePlanChange = async (userId: string, planId: string) => {
    setActioningId(userId)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "change_plan", planId }),
      })
      if (!res.ok) throw new Error("Failed to change user plan")
      toast({ title: "Success", description: `Organization plan upgraded/downgraded to ${planId}.` })
      fetchUsers()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const handleResetPassword = async (userId: string) => {
    const password = prompt("Enter new password (min 8 chars):", "Admin@123")
    if (!password) return
    if (password.length < 8) {
      alert("Password must be at least 8 characters.")
      return
    }

    setActioningId(userId)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "reset_password", newPassword: password }),
      })
      if (!res.ok) throw new Error("Failed to reset password")
      toast({ title: "Success", description: `Password reset successfully.` })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you absolutely sure you want to delete this user? This cannot be undone.")) return

    setActioningId(userId)
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete user")
      toast({ title: "Success", description: "User deleted from platform." })
      fetchUsers()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(term) ||
      (u.full_name || "").toLowerCase().includes(term) ||
      (u.organization?.name || "").toLowerCase().includes(term)
    )
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="User Management" description="Monitor registered photographers, reset passwords, change tiers, or delete accounts." />
        <Button onClick={fetchUsers} variant="outline" className="border-slate-800 flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-slate-500" />
        <Input
          placeholder="Search by name, email, or studio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-800 text-slate-100"
        />
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No users registered matching search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="p-4">User Info</th>
                    <th className="p-4">Studio / Organization</th>
                    <th className="p-4">Plan Tier</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-100">{u.full_name || "N/A"}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-200">{u.organization?.name || "No Organization"}</div>
                        <div className="text-xs text-slate-500">ID: {u.organization_id || "N/A"}</div>
                      </td>
                      <td className="p-4">
                        <select
                          value={u.organization?.plan || "free"}
                          onChange={(e) => handlePlanChange(u.id, e.target.value)}
                          disabled={!u.organization_id || actioningId === u.id}
                          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
                        >
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="standard">Standard</option>
                          <option value="premium">Premium</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.is_active !== false
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.is_active !== false ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {u.is_active !== false ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          onClick={() => handleStatusChange(u.id, u.is_active !== false)}
                          disabled={actioningId === u.id}
                          variant="ghost"
                          size="sm"
                          className={u.is_active !== false ? "text-amber-500 hover:text-amber-400" : "text-emerald-500 hover:text-emerald-400"}
                          title={u.is_active !== false ? "Suspend Account" : "Activate Account"}
                        >
                          {u.is_active !== false ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                        <Button
                          onClick={() => handleResetPassword(u.id)}
                          disabled={actioningId === u.id}
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-200"
                          title="Reset Password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={actioningId === u.id}
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:text-rose-400"
                          title="Delete User"
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
    </main>
  )
}
