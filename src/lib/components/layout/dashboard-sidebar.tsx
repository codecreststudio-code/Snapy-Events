"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Camera,
  LayoutDashboard,
  Image,
  QrCode,
  Settings,
  CreditCard,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { AccountMenu } from "./account-menu"
import { NotificationCenter } from "@/lib/components/notifications/notification-center"
import { Logo } from "./logo"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Events", href: "/dashboard/events", icon: Camera },
  { name: "Galleries", href: "/dashboard/galleries", icon: Image },
  { name: "QR Codes", href: "/dashboard/qr", icon: QrCode },
  { name: "Downloads", href: "/dashboard/downloads", icon: Download },
]

const secondaryNavigation = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  // The dashboard home page (exactly "/dashboard") owns its own full-bleed,
  // app-style chrome now — a slim top bar plus the 2-tab HomeBottomTabs bar,
  // at every screen size, not just mobile — instead of this sidebar. See
  // src/app/dashboard/page.tsx and home-bottom-tabs.tsx. Every other
  // /dashboard/* route (Events, Galleries, QR, Settings, Billing, etc.) is
  // untouched and keeps this sidebar + MobileBottomNav exactly as before.
  if (pathname === "/dashboard") {
    return null
  }

  return (
    <>
      {/* Desktop sidebar (lg+). Phone/tablet get MobileBottomNav instead —
          see below — rather than a hamburger + slide-in copy of this panel. */}
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-[#e5dfd0] bg-[#faf6ed] lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-[#e5dfd0] px-6">
          <Link href="/dashboard" className="inline-flex items-center transition-opacity hover:opacity-90">
            <Logo />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-mauve/10 text-mauve-strong"
                      : "text-ink-secondary hover:bg-mauve/5 hover:text-mauve-strong"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="mt-6 px-4">
            <div className="h-px bg-[#e5dfd0]" />
          </div>

          <nav className="px-4 mt-6 space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-mauve/10 text-mauve-strong"
                      : "text-ink-secondary hover:bg-mauve/5 hover:text-mauve-strong"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 border-t border-[#e5dfd0] p-4">
          <div className="min-w-0 flex-1">
            <AccountMenu variant="sidebar" />
          </div>
          <NotificationCenter />
        </div>
      </div>

      {/* Phone/tablet bottom tab bar (< lg) */}
      <MobileBottomNav />
    </>
  )
}