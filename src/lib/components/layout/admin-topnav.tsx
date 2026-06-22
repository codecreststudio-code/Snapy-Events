"use client"

import * as React from "react"
import { Search, Bell, Activity, Sparkles, ChevronDown, LogOut, Settings, Shield, User, Info, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/lib/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"
import { Input } from "@/lib/components/ui/input"

export function AdminTopNav() {
  const [signingOut, setSigningOut] = React.useState(false)
  const [notifications, setNotifications] = React.useState([
    { id: 1, title: "New organization 'Dreamy Events' registered", time: "2 min ago", unread: true },
    { id: 2, title: "Database CPU utilization spike at 84%", time: "15 min ago", unread: true },
    { id: 3, title: "Support ticket #1234 resolved by moderator", time: "1 hour ago", unread: false },
  ])

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
    } finally {
      window.location.href = "/admin/login"
    }
  }

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })))
  }

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      {/* Search Input */}
      <div className="flex flex-1 items-center max-w-md relative">
        <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          type="search"
          placeholder="Search organizations, users, events..."
          className="pl-9 pr-4 py-1.5 w-full bg-slate-50 border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus-visible:ring-violet-500 focus-visible:border-violet-500 focus-visible:bg-white transition-colors"
        />
        <div className="absolute right-3 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 rounded border border-slate-200 pointer-events-none">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Platform Version */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-100">
          <Sparkles className="h-3 w-3" />
          <span>v1.4.0-prod</span>
        </div>

        {/* System Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold">System: Healthy</span>
        </div>

        {/* Dark/Light Mode Mock Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg"
          title="Light theme enforced"
        >
          <Sun className="h-5 w-5 text-amber-500" />
        </Button>

        {/* Notifications Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 bg-white border border-slate-200 shadow-lg rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="font-bold text-slate-800 text-sm">System Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-700"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    "flex flex-col gap-1 px-4 py-3 text-xs transition-colors",
                    n.unread ? "bg-violet-50/40" : "hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("text-slate-700", n.unread ? "font-semibold text-slate-900" : "")}>
                      {n.title}
                    </span>
                    {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600 mt-1" />}
                  </div>
                  <span className="text-[10px] text-slate-400">{n.time}</span>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              <span>Quick Actions</span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-md rounded-xl p-1">
            <DropdownMenuLabel className="px-2 py-1.5 text-xs text-slate-500">Fast Access</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <a href="/admin/settings" className="flex items-center gap-2 text-slate-700 focus:bg-slate-50 rounded-lg px-2 py-1.5 text-sm cursor-pointer">
                <Shield className="h-4 w-4 text-slate-400" />
                <span>Feature Flags</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/admin/support-tickets" className="flex items-center gap-2 text-slate-700 focus:bg-slate-50 rounded-lg px-2 py-1.5 text-sm cursor-pointer">
                <Info className="h-4 w-4 text-slate-400" />
                <span>View Open Tickets</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/admin/events" className="flex items-center gap-2 text-slate-700 focus:bg-slate-50 rounded-lg px-2 py-1.5 text-sm cursor-pointer">
                <Activity className="h-4 w-4 text-slate-400" />
                <span>Manage Events</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem asChild>
              <a href="/admin/settings" className="flex items-center gap-2 text-slate-700 focus:bg-slate-50 rounded-lg px-2 py-1.5 text-sm cursor-pointer">
                <Settings className="h-4 w-4 text-slate-400" />
                <span>Platform Settings</span>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 font-bold text-white hover:opacity-90 ring-2 ring-violet-100">
              A
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-md rounded-xl p-1">
            <div className="px-2 py-2">
              <p className="text-sm font-bold text-slate-800">Admin User</p>
              <p className="text-xs text-slate-400 truncate">admin@snapsy.com</p>
            </div>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem asChild>
              <a href="/admin/settings" className="flex items-center gap-2 text-slate-700 focus:bg-slate-50 rounded-lg px-2 py-1.5 text-sm cursor-pointer">
                <User className="h-4 w-4 text-slate-400" />
                <span>Admin Settings</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={signOut}
              disabled={signingOut}
              className="flex items-center gap-2 text-rose-600 focus:bg-rose-50 rounded-lg px-2 py-1.5 text-sm cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>{signingOut ? "Signing out..." : "Sign out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
