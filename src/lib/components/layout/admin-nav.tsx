"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  HardDrive,
  Settings,
  Sparkles,
  LogOut,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { Button } from "@/lib/components/ui/button"

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Sparkles },
  { href: "/admin/revenue", label: "Revenue", icon: CreditCard },
  { href: "/admin/storage", label: "Storage", icon: HardDrive },
  { href: "/admin/blog", label: "Blog CMS", icon: BookOpen },
  { href: "/admin/ai-usage", label: "AI usage", icon: Sparkles },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname() ?? ""
  const [signingOut, setSigningOut] = React.useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
    } finally {
      window.location.href = "/admin/login"
    }
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-slate-950 text-slate-100 md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-slate-800 px-4">
        <Link href="/admin" className="text-slate-100" aria-label="Admin home">
          <Logo />
        </Link>
        <span className="ml-2 rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-300">
          Admin
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <Button
          onClick={signOut}
          disabled={signingOut}
          variant="ghost"
          className="w-full justify-start gap-2 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </aside>
  )
}
