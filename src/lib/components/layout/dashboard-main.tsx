"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

// Wraps the /dashboard/* page content. Every route keeps the standard
// sidebar-reserved padding and safe-area bottom padding it always had —
// except the exact dashboard home route ("/dashboard"), which now renders
// its own full-bleed, app-style page (top bar + HomeBottomTabs) and manages
// its own spacing entirely, so it must NOT get the `lg:pl-72` gutter that
// used to reserve room for DashboardSidebar's desktop panel (which no
// longer renders on this route — see dashboard-sidebar.tsx).
export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHomeRoute = pathname === "/dashboard"

  if (isHomeRoute) {
    return <main>{children}</main>
  }

  return (
    <main className="lg:pl-72">
      <div className={cn("py-3 pb-24 md:py-4 px-3 sm:px-6 lg:px-8 lg:pb-8")}>{children}</div>
    </main>
  )
}
