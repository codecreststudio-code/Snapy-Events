"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Camera,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/lib/components/ui/button"

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Events", href: "/admin/events", icon: Camera },
  { name: "Revenue", href: "/admin/revenue", icon: CreditCard },
  { name: "Subscriptions", href: "/admin/subscriptions", icon: Bell },
  { name: "Storage", href: "/admin/storage", icon: BarChart3 },
  { name: "AI Usage", href: "/admin/ai-usage", icon: Settings },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-16 items-center gap-2 border-b px-6 bg-sidebar">
      <Link href="/admin" className="flex items-center gap-2">
        <span className="font-semibold text-lg">Admin Panel</span>
      </Link>
    </div>
  )
}

export function AdminNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <nav className="hidden md:flex items-center gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              View Site
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}