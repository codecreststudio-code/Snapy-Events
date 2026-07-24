"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Camera } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks"
import { Avatar, AvatarFallback, AvatarImage } from "@/lib/components/ui/avatar"

const TABS = [
  { name: "Events", href: "/dashboard", icon: Camera },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/events")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function HomeBottomTabs() {
  const pathname = usePathname() ?? ""
  const { user, profile } = useAuth()

  const initials =
    profile?.full_name?.substring(0, 2).toUpperCase() ||
    user?.email?.substring(0, 2).toUpperCase() ||
    "US"

  const isSettingsActive = pathname === "/dashboard/settings"

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5dfd0] bg-[#faf6ed]/95 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5">
        {/* Left / Center Navigation Tabs */}
        <div className="flex items-center gap-4 sm:gap-6">
          {TABS.map((item) => {
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center gap-2 py-1.5 px-3 text-[11px] font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 rounded-xl transition-all hover:bg-mauve/5"
                aria-current={active ? "page" : undefined}
              >
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 transition-colors duration-200",
                    active ? "text-mauve" : "text-[#6b6055]"
                  )}
                />
                <span className={cn("transition-colors duration-200", active ? "text-[#1a1410] font-bold" : "text-[#6b6055] font-semibold")}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Far Right Integrated Profile Avatar (Navigates directly to /dashboard/settings) */}
        <div className="flex items-center">
          <Link
            href="/dashboard/settings"
            aria-label="Account Settings"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer",
              isSettingsActive
                ? "border-mauve ring-2 ring-mauve/30 bg-mauve/10"
                : "border-[#e5dfd0] bg-[#ffffff] hover:border-mauve/40"
            )}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-mauve/15 text-mauve text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </nav>
  )
}
