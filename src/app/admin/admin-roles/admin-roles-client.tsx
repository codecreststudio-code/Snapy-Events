"use client"

import { useState } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { toast } from "@/lib/components/ui/toaster"
import { Shield, Plus, Trash2, Loader2 } from "lucide-react"
import { grantAdminAccessByEmail, revokeAdminAccess } from "@/app/actions/admin-roles"

type AdminUser = {
  id: string
  full_name: string
  email: string
  created_at: string
}

export function AdminRolesClient({ initialAdmins, currentUserId }: { initialAdmins: AdminUser[], currentUserId?: string }) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleAddAdmin = async () => {
    const email = prompt("Enter email address of the user to grant admin access:")
    if (!email) return
    
    setLoadingAction("add")
    const { success, error } = await grantAdminAccessByEmail(email)
    setLoadingAction(null)
    
    if (success) {
      toast({ title: "Admin Access Granted", description: `${email} is now an administrator.` })
      // Ideally, the server revalidatePath will refresh the page, but we can optimistically reload if needed
      window.location.reload()
    } else {
      toast({ title: "Failed to Grant Access", description: error || "Unknown error", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Revoke administrator access for ${name}?`)) return
    
    setLoadingAction(id)
    const { success, error } = await revokeAdminAccess(id)
    setLoadingAction(null)
    
    if (success) {
      setAdmins(prev => prev.filter(adm => adm.id !== id))
      toast({ title: "Access Revoked", description: "Admin permissions disabled for this user." })
    } else {
      toast({ title: "Action Failed", description: error || "Could not revoke access", variant: "destructive" })
    }
  }

  return (
    <main className="px-6 py-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Roles & Permissions</h1>
          <p className="text-sm text-slate-500 mt-1">Manage platform team access permissions directly synced with Supabase Profiles.</p>
        </div>
        <Button 
          onClick={handleAddAdmin} 
          disabled={loadingAction === "add"}
          className="h-9 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm gap-1.5 shrink-0"
        >
          {loadingAction === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span>Grant Admin Role</span>
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
                  <th className="p-4">Date Assigned</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm">{adm.full_name || "Unknown Name"}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{adm.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-slate-700">
                        <Shield className="h-4 w-4 text-violet-600" />
                        <span>System Admin</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Active
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-semibold">{new Date(adm.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      {adm.id !== currentUserId ? (
                        <Button
                          onClick={() => handleDelete(adm.id, adm.full_name || adm.email)}
                          disabled={loadingAction === adm.id}
                          variant="ghost"
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          {loadingAction === adm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase select-none px-2 py-1 mr-2">You</span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No administrators found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
