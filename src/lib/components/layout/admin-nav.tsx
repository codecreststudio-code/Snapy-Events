"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Image,
  Sparkles,
  Award,
  TrendingUp,
  CreditCard,
  HardDrive,
  BarChart3,
  Megaphone,
  Bell,
  Mail,
  MessageSquare,
  ShieldAlert,
  ClipboardList,
  Activity,
  Sliders,
  Settings,
  Shield,
  LogOut,
  Film,
  Volume2,
  FileText,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { Button } from "@/lib/components/ui/button"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Core Entities",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/events", label: "Events", icon: Calendar },
      { href: "/admin/photos", label: "Photos", icon: Image },
      { href: "/admin/videos", label: "Videos", icon: Film },
      { href: "/admin/voice-notes", label: "Voice Notes", icon: Volume2 },
      { href: "/admin/ai-face-search", label: "AI Face Search", icon: Sparkles },
    ],
  },
  {
    title: "Monetization",
    items: [
      { href: "/admin/subscriptions", label: "Subscriptions", icon: Award },
      { href: "/admin/revenue", label: "Revenue", icon: TrendingUp },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/storage", label: "Storage", icon: HardDrive },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/blog", label: "Blog", icon: FileText },
      { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/email", label: "Email Management", icon: Mail },
    ],
  },
  {
    title: "Support & Safety",
    items: [
      { href: "/admin/support-tickets", label: "Support Tickets", icon: MessageSquare },
      { href: "/admin/moderation-queue", label: "Moderation Queue", icon: ShieldAlert },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/system-health", label: "System Health", icon: Activity },
      { href: "/admin/feature-flags", label: "Feature Flags", icon: Sliders },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/admin-roles", label: "Admin Roles", icon: Shield },
      { href: "/admin/profile", label: "Profile Settings", icon: Users },
    ],
  },
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
    <aside className="hidden w-64 shrink-0 border-r border-hairline-dark bg-surface-card text-ink md:flex md:flex-col h-screen overflow-y-auto sticky top-0" data-lenis-prevent>
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-hairline-dark px-6 shrink-0 gap-2">
        <Link href="/admin" className="text-ink" aria-label="Admin home">
          <Logo />
        </Link>
        <span className="rounded bg-mauve/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mauve border border-mauve/20">
          Admin
        </span>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-6 px-4 py-6" aria-label="Admin">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <h4 className="px-3 text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">
              {group.title}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                      active
                        ? "bg-mauve text-[#1a1410] shadow-sm"
                        : "text-ink-secondary hover:bg-mauve/10 hover:text-ink"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-[#1a1410]" : "text-ink-tertiary")} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out Button */}
      <div className="border-t border-hairline-dark p-4 shrink-0 bg-surface-card">
        <Button
          onClick={signOut}
          disabled={signingOut}
          variant="ghost"
          className="w-full justify-start gap-2.5 text-xs font-bold text-ink-secondary hover:bg-mauve/5 hover:text-ink"
        >
          <LogOut className="h-4 w-4 text-ink-tertiary" />
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </Button>
      </div>
    </aside>
  )
}

