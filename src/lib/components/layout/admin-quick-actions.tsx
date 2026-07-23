"use client"

import * as React from "react"
import { Settings, Users, ChevronDown, Shield, Info, Activity, CreditCard } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"

type AdminQuickActionsProps = {
  isAdmin: boolean
  isOwner: boolean
}

export function AdminQuickActions({ isAdmin, isOwner }: AdminQuickActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-hairline-dark bg-mauve/5 text-ink-secondary hover:bg-mauve/10 hover:text-ink font-semibold transition-colors"
        >
          <span>Quick Actions</span>
          <ChevronDown className="h-4 w-4 text-ink-secondary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-surface-card-elevated border border-hairline-dark shadow-md rounded-xl p-1">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs text-ink-secondary uppercase tracking-wider font-bold">
          Fast Access
        </DropdownMenuLabel>

        {isOwner && (
          <DropdownMenuItem asChild>
            <a href="/admin/admin-roles" className="flex items-center gap-2.5 text-ink-secondary focus:bg-mauve/5 rounded-lg px-2 py-2 text-sm cursor-pointer">
              <Shield className="h-4 w-4 text-ink-tertiary" />
              <span>Manage Admins</span>
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <a href="/admin/users" className="flex items-center gap-2.5 text-ink-secondary focus:bg-mauve/5 rounded-lg px-2 py-2 text-sm cursor-pointer">
            <Users className="h-4 w-4 text-ink-tertiary" />
            <span>Manage Users</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a href="/admin/events" className="flex items-center gap-2.5 text-ink-secondary focus:bg-mauve/5 rounded-lg px-2 py-2 text-sm cursor-pointer">
            <Activity className="h-4 w-4 text-ink-tertiary" />
            <span>Manage Events</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-hairline-dark" />

        <DropdownMenuItem asChild>
          <a href="/admin/support-tickets" className="flex items-center gap-2.5 text-ink-secondary focus:bg-mauve/5 rounded-lg px-2 py-2 text-sm cursor-pointer">
            <Info className="h-4 w-4 text-ink-tertiary" />
            <span>Support Tickets</span>
          </a>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild>
            <a href="/admin/billing" className="flex items-center gap-2.5 text-ink-secondary focus:bg-mauve/5 rounded-lg px-2 py-2 text-sm cursor-pointer">
              <CreditCard className="h-4 w-4 text-ink-tertiary" />
              <span>Billing & Plans</span>
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-hairline-dark" />

        <DropdownMenuItem asChild>
          <a href="/admin/settings" className="flex items-center gap-2.5 text-ink-secondary focus:bg-mauve/5 rounded-lg px-2 py-2 text-sm cursor-pointer">
            <Settings className="h-4 w-4 text-ink-tertiary" />
            <span>Platform Settings</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
