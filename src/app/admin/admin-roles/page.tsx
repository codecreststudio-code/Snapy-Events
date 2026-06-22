"use client"

import { useState } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { Shield, ShieldAlert, ShieldCheck, UserCheck, RefreshCw, Plus, Trash2 } from "lucide-react"

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  status: string
  joined: string
}

export default function AdminRolesPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([
    { id: "adm_1", name: "Anish Gupta", email: "anish@snapsy.com", role: "Super Admin", status: "Active", joined: "2025-01-10" },
    { id: "adm_2", name: "Pooja Mehta", email: "pooja@snapsy.com", role: "Moderator", status: "Active", joined: "2025-04-15" },
    { id: "adm_3", name: "Vikram Sen", email: "vikram@snapsy.com", role: "Reader / Auditor", status: "Active", joined: "2025-06-01" },
  ])
  const [loading, setLoading] = useState(false)

  const handleAddAdmin = () => {
    const name = prompt("Enter new administrator full name:")
    const email = prompt("Enter email address:")
    if (!name || !email) return
    
    setAdmins(prev => [
      ...prev,
      {
        id: `adm_${Date.now()}`,
        name,
        email,
        role: "Moderator",
        status: "Active",
        joined: new Date().toISOString().split("T")[0]
      }
    ])
    toast({ title: "Admin Invited", description: `Invitation sent to ${email} to join as Moderator.` })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Revoke administrator access for ${name}?`)) return
    setAdmins(prev => prev.filter(adm => adm.id !== id))
    toast({ title: "Access Revoked", description: "Admin permissions disabled." })
  }

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Roles & Permissions</h1>
          <p className="text-sm text-slate-500 mt-1">Manage platform team access permissions, security logging, and role hierarchies.</p>
        </div>
        <Button onClick={handleAddAdmin} className="h-9 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          <span>Invite Admin</span>
        </Button>
      </div>

      <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="p-4">Administrator</th>
                  <th className="p-4">Platform Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date Joined</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-655 font-medium">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm">{adm.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{adm.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-slate-700">
                        <Shield className="h-4 w-4 text-violet-600" />
                        <span>{adm.role}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {adm.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-semibold">{new Date(adm.joined).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      {adm.role !== "Super Admin" ? (
                        <Button
                          onClick={() => handleDelete(adm.id, adm.name)}
                          variant="ghost"
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase select-none px-2 py-1 mr-2">System locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
