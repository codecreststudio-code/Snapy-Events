"use client"

import { usePathname } from "next/navigation"
import { HomeBottomTabs } from "./home-bottom-tabs"

// The desktop left rail (a `hidden ... lg:flex` fixed panel with its own
// nav links, Join Event button, account menu, and notification bell) used
// to render here on every /dashboard/* route at lg+ widths, WHILE
// HomeBottomTabs rendered unconditionally underneath it — so on desktop
// widths both navigations showed at once. Per product decision, the bottom
// tab bar is now the single universal navigation at every screen size, so
// the desktop rail has been removed entirely. This component's only
// remaining job is rendering that shared bottom bar on every dashboard
// route except the dashboard home route itself, which already renders its
// own copy directly (see app/dashboard/page.tsx) to avoid rendering it twice.
export function DashboardSidebar() {
  const pathname = usePathname()

  if (pathname === "/dashboard") {
    return null
  }

  return <HomeBottomTabs />
}