"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { AdminGlobalSearch } from "./admin-global-search"
import { AdminHealthBadge } from "./admin-health-badge"
import { AdminThemeToggle } from "./admin-theme-toggle"
import { AdminNotificationsDropdown } from "./admin-notifications-dropdown"
import { AdminQuickActions } from "./admin-quick-actions"
import { AdminProfileDropdown } from "./admin-profile-dropdown"

export type AdminTopNavProps = {
  user?: any
  isAdmin?: boolean
  isOwner?: boolean
  initialTheme?: string
}

export function AdminTopNav({ 
  user, 
  isAdmin = false, 
  isOwner = false, 
  initialTheme = "light" 
}: AdminTopNavProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <AdminGlobalSearch />

      <div className="flex items-center gap-4">
        {/* Platform Version */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100">
          <Sparkles className="h-3 w-3" />
          <span>v1.4.0-prod</span>
        </div>

        <AdminHealthBadge />
        <AdminThemeToggle initialTheme={initialTheme} />
        <AdminNotificationsDropdown />
        <AdminQuickActions isAdmin={isAdmin} isOwner={isOwner} />
        
        {user && <AdminProfileDropdown user={user} />}
      </div>
    </header>
  )
}
