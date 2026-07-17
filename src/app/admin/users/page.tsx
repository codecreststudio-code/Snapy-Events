"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/lib/components/layout/page-header"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import {
  Search,
  ShieldAlert,
  Key,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Loader2,
  Mail,
  ExternalLink,
  UserCheck,
  User,
  UserMinus
} from "lucide-react"
import { cn } from "@/lib/utils"

type UserItem = {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
  subscriptions?: Array<{
    id: string
    plan_id: string
    status: string
  }>
}

function getActivePlan(u: UserItem): string {
  const activeSub = u.subscriptions?.find((s) => s.status === "active")
  return activeSub?.plan_id || "free"
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

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

  const handleRoleChange = async (userId: string, role: string) => {
    setActioningId(userId)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "change_role", role }),
      })
      if (!res.ok) throw new Error("Failed to change user role")
      toast({ title: "Success", description: "User role updated successfully." })
      fetchUsers()
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role } : null)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const handleOrganizationChange = async (userId: string, orgId: string | null) => {
    // No-op
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
      if (selectedUser?.id === userId) setSelectedUser(null)
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
      (u.full_name || "").toLowerCase().includes(term)
    )
  })

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor registered photographers, reset passwords, change tiers, or delete accounts.</p>
        </div>
        <Button onClick={fetchUsers} variant="outline" className="h-9 gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-slate-400" />
        <Input
          placeholder="Search by name, email, or studio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200 text-slate-800 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main List Table */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-16 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                No users registered matching search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="p-4">User Info</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Plan Tier</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                      {filteredUsers.map((u) => (
                        <tr 
                          key={u.id} 
                          className={cn(
                            "hover:bg-slate-50/50 transition-colors cursor-pointer",
                            selectedUser?.id === u.id ? "bg-violet-50/20" : ""
                          )}
                          onClick={() => setSelectedUser(u)}
                        >
                          <td className="p-4">
                            <div className="font-bold text-slate-800 text-sm">{u.full_name || "N/A"}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{u.email}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-slate-700 font-semibold">{new Date(u.created_at).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={u.role || "member"}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={actioningId === u.id}
                              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 font-semibold shadow-sm capitalize"
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={getActivePlan(u)}
                            onChange={(e) => handlePlanChange(u.id, e.target.value)}
                            disabled={actioningId === u.id}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 font-semibold shadow-sm"
                          >
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            u.is_active !== false
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-100"
                          )}>
                            {u.is_active !== false ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            onClick={() => handleStatusChange(u.id, u.is_active !== false)}
                            disabled={actioningId === u.id}
                            variant="ghost"
                            size="sm"
                            className={cn("h-8 w-8 p-0 rounded-lg", u.is_active !== false ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50")}
                            title={u.is_active !== false ? "Suspend Account" : "Activate Account"}
                          >
                            {u.is_active !== false ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            onClick={() => handleResetPassword(u.id)}
                            disabled={actioningId === u.id}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-lg"
                            title="Reset Password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={actioningId === u.id}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
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

        {/* Selected User Details Panel */}
        <Card className="bg-white border-slate-200 shadow-sm p-6 sticky top-6">
          {selectedUser ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-lg">
                  {selectedUser.full_name?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{selectedUser.full_name || "N/A"}</h3>
                  <span className="text-xs text-slate-400 block mt-0.5">{selectedUser.email}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">User ID</span>
                  <span className="font-mono text-slate-700 font-semibold">{selectedUser.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Role</span>
                  <span className="text-slate-700 capitalize font-semibold">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Plan Tier</span>
                  <span className="text-violet-600 font-bold uppercase">{getActivePlan(selectedUser)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Join Date</span>
                  <span className="text-slate-700 font-semibold">{new Date(selectedUser.created_at).toLocaleString()}</span>
                </div>
              </div>



              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Account Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleStatusChange(selectedUser.id, selectedUser.is_active !== false)}
                    variant="outline"
                    className="w-full text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    {selectedUser.is_active !== false ? "Suspend Account" : "Activate Account"}
                  </Button>
                  <Button
                    onClick={() => handleResetPassword(selectedUser.id)}
                    variant="outline"
                    className="w-full text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    Reset Password
                  </Button>
                </div>
                <Button
                  onClick={() => handleDeleteUser(selectedUser.id)}
                  className="w-full text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 shadow-sm"
                >
                  Permanently Delete User
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-center text-slate-400">
              <Mail className="h-8 w-8 text-slate-300 mb-2" />
              <span className="text-xs font-semibold">Select a user to view full profile details and execute account operations.</span>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}

