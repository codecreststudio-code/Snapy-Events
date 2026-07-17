"use client"

import * as React from "react"
import {
  LogOut,
  Settings,
  Shield,
  User
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"

type AdminProfileProps = {
  user: {
    id: string
    email?: string
    full_name?: string
  }
}

export function AdminProfileDropdown({ user }: AdminProfileProps) {
  const [signingOut, setSigningOut] = React.useState(false)

  const initial = user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || "A"

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
    } finally {
      window.location.href = "/admin/login"
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 font-bold text-white hover:opacity-90 ring-2 ring-violet-100 transition-opacity">
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white border border-slate-200 shadow-md rounded-xl p-1">
        <div className="px-3 py-2.5">
          <p className="text-sm font-bold text-slate-800 truncate">{user.full_name || "Admin User"}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
        </div>
        <DropdownMenuSeparator className="bg-slate-100" />
        <DropdownMenuItem asChild>
          <a href="/admin/profile" className="flex items-center gap-2.5 text-slate-700 focus:bg-slate-50 rounded-lg px-3 py-2 text-sm cursor-pointer">
            <User className="h-4 w-4 text-slate-400" />
            <span>My Profile</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/admin/security" className="flex items-center gap-2.5 text-slate-700 focus:bg-slate-50 rounded-lg px-3 py-2 text-sm cursor-pointer">
            <Shield className="h-4 w-4 text-slate-400" />
            <span>Security & 2FA</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-100" />
        <DropdownMenuItem asChild>
          <a href="/admin/settings" className="flex items-center gap-2.5 text-slate-700 focus:bg-slate-50 rounded-lg px-3 py-2 text-sm cursor-pointer">
            <Settings className="h-4 w-4 text-slate-400" />
            <span>Platform Settings</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={signOut}
          disabled={signingOut}
          className="flex items-center gap-2.5 text-rose-600 focus:bg-rose-50 rounded-lg px-3 py-2 text-sm cursor-pointer mt-1"
        >
          <LogOut className="h-4 w-4" />
          <span>{signingOut ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
