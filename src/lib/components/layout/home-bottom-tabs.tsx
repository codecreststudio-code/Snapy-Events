"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Camera, Disc } from "lucide-react"
import { cn } from "@/lib/utils"

// Minimal 2-tab bottom bar used ONLY on the dashboard home page
// (src/app/dashboard/page.tsx), matching the reference app's clean
// "Films / Tapes" bar exactly — Events / Galleries here (see the mapping
// decided when this page was redesigned). Deliberately a separate, simpler
// component from MobileBottomNav (which still handles every other
// /dashboard/* page and has 5 slots — Events, Galleries, a raised Home hub,
// QR Codes, and a More sheet for Downloads/Settings/Billing/Admin/Sign out).
// Reusing that richer bar here would either lose those extra destinations
// or clutter a screen that's supposed to look like the minimal reference —
// instead, the home page's top bar carries a profile menu that covers
// Settings/Billing/QR Codes/Downloads/Admin/Sign out, and this bar just
// does the two tabs. Visible at every screen width (no `lg:hidden`) since
// the home page replaces the desktop sidebar entirely, not just on mobile.
const TABS = [
  { name: "Events", href: "/dashboard/events", icon: Camera },
  { name: "Galleries", href: "/dashboard/galleries", icon: Disc },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function HomeBottomTabs() {
  const pathname = usePathname() ?? ""

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5dfd0] bg-[#faf6ed]/95 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-stretch px-2">
        {TABS.map((item) => {
          const active = isActivePath(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-[11px] font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 rounded-lg"
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors duration-200",
                  active ? "text-mauve" : "text-ink-secondary"
                )}
              />
              <span className={cn("transition-colors duration-200", active ? "text-mauve" : "text-ink-secondary")}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
