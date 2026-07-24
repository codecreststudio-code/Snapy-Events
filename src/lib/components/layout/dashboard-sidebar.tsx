"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Camera,
  LayoutDashboard,
  QrCode,
  Settings,
  CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { HomeBottomTabs } from "./home-bottom-tabs"
import { AccountMenu } from "./account-menu"
import { NotificationCenter } from "@/lib/components/notifications/notification-center"
import { Logo } from "./logo"
import { JoinEventModal } from "@/lib/components/events/join-event-modal"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Events", href: "/dashboard/events", icon: Camera },
]

const secondaryNavigation = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [showJoinModal, setShowJoinModal] = useState(false)

  if (pathname === "/dashboard") {
    return null
  }

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-hairline-dark bg-surface-dark lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-hairline-dark px-6">
          <Link href="/dashboard" className="inline-flex items-center transition-opacity hover:opacity-90">
            <Logo />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-4 space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
                    isActive
                      ? "bg-mauve text-[#1a1410] shadow-md shadow-mauve/20"
                      : "text-ink-secondary hover:bg-mauve/10 hover:text-ink"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}

            {/* Join Event Button */}
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-ink bg-mauve/10 hover:bg-mauve/20 transition-all cursor-pointer mt-2"
            >
              <QrCode className="h-4 w-4 text-mauve" />
              <span>Join Event</span>
            </button>
          </nav>

          <div className="mt-6 px-4">
            <div className="h-px bg-hairline-dark" />
          </div>

          <nav className="px-4 mt-6 space-y-1.5">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
                    isActive
                      ? "bg-mauve text-[#1a1410] shadow-md shadow-mauve/20"
                      : "text-ink-secondary hover:bg-mauve/10 hover:text-ink"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 border-t border-hairline-dark p-4">
          <div className="min-w-0 flex-1">
            <AccountMenu variant="sidebar" />
          </div>
          <NotificationCenter />
        </div>
      </div>

      <HomeBottomTabs />

      <JoinEventModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </>
  )
}