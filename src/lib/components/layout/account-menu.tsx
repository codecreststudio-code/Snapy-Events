"use client"

import Link from "next/link"
import { ChevronDown, LogOut } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/lib/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"
import { useAuth } from "@/lib/hooks"

// Shared account dropdown (Settings/Billing/Admin/Sign out) — factored out
// of DashboardSidebar so the dashboard home page's new top bar (which
// replaced the sidebar entirely on that one route — see dashboard-sidebar.tsx
// and app/dashboard/page.tsx) can offer the exact same account destinations
// without a second, drifting copy of this menu.
//
// variant="sidebar" — the original full row-with-name-and-email trigger used
// inside the desktop sidebar's bottom panel.
// variant="compact"  — a small round avatar-only trigger for the home page's
// top bar, where there's no room for the full name/email row.
export function AccountMenu({ variant = "sidebar" }: { variant?: "sidebar" | "compact" }) {
  const { user, profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  const initials =
    profile?.full_name?.substring(0, 2).toUpperCase() ||
    user?.email?.substring(0, 2).toUpperCase() ||
    "US"

  const menuContent = (
    <DropdownMenuContent side="top" align="end" sideOffset={12} className="w-56 rounded-2xl border border-[#e5dfd0] bg-white p-2 shadow-xl z-50">
      <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-ink">My Account</DropdownMenuLabel>
      <DropdownMenuSeparator className="my-1 bg-[#e5dfd0]" />
      {profile?.is_admin && (
        <>
          <DropdownMenuItem asChild>
            <Link href="/admin" className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-mauve hover:bg-mauve/10">
              Admin Portal
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1 bg-[#e5dfd0]" />
        </>
      )}
      <DropdownMenuItem asChild>
        <Link href="/dashboard/settings" className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-ink hover:bg-mauve/10">Settings</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/billing" className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-ink hover:bg-mauve/10">Billing</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/qr" className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-ink hover:bg-mauve/10">QR Codes</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/dashboard/downloads" className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-ink hover:bg-mauve/10">Downloads</Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator className="my-1 bg-[#e5dfd0]" />
      <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10">
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5dfd0] bg-[#ffffff] hover:border-mauve/60 transition-all hover:scale-105 active:scale-95 focus-visible:outline-none cursor-pointer"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-mauve/15 text-mauve text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 text-ink hover:bg-mauve/5 hover:text-ink">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-mauve/10 text-mauve">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-sm overflow-hidden">
            <span className="font-medium truncate max-w-[150px] text-ink">
              {profile?.full_name || user?.email?.split("@")[0] || "User"}
            </span>
            <span className="text-xs text-ink-secondary truncate max-w-[150px]">{user?.email || ""}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-auto flex-shrink-0 text-ink-secondary" />
        </Button>
      </DropdownMenuTrigger>
      {menuContent}
    </DropdownMenu>
  )
}
