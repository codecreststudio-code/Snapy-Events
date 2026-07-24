"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

// Wraps the /dashboard/* page content. DashboardSidebar's desktop rail
// (the `lg:flex` fixed left panel) has been removed in favor of a single
// universal bottom tab bar shown at every screen size, so no route needs
// to reserve a `lg:pl-72` gutter for it anymore — every route is full-width.
// The one exception is the dashboard home route ("/dashboard"), which
// renders its own full-bleed, app-style page (top bar + HomeBottomTabs) and
// manages its own spacing entirely.
export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHomeRoute = pathname === "/dashboard"

  if (isHomeRoute) {
    return <main>{children}</main>
  }

  return (
    <main>
      <div className={cn("pt-safe py-3 pb-24 md:py-4 px-3 sm:px-6 lg:px-8 lg:pb-8")}>{children}</div>
    </main>
  )
}
