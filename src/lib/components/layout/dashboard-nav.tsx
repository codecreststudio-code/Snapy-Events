"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Image,
  QrCode,
  Users,
  Settings,
  BarChart3,
  CreditCard,
  Download,
  Sparkles,
  Layers,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { Button } from "@/lib/components/ui/button"
import { Avatar, AvatarFallback } from "@/lib/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"
import { getInitials } from "@/lib/utils"
import type { AuthContext } from "@/lib/auth/session"

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/events", label: "Events", icon: Calendar },
  { href: "/dashboard/galleries", label: "Galleries", icon: Image },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/downloads", label: "Downloads", icon: Download },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

interface Props {
  auth: AuthContext
}

export function DashboardNav({ auth }: Props) {
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const [signingOut, setSigningOut] = React.useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/dashboard" aria-label="Dashboard">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Dashboard">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t p-3">
          <div className="rounded-lg bg-gradient-to-br from-rose-500/10 to-violet-500/10 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Upgrade to Premium
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Unlock AI face search, white-label and unlimited events.
            </p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link href="/dashboard/billing">Upgrade</Link>
            </Button>
          </div>
        </div>
      </aside>
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
        <div className="md:hidden">
          <Link href="/dashboard" aria-label="Dashboard home">
            <Logo />
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{auth.user ? getInitials(auth.user.full_name ?? auth.user.email) : "?"}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <div className="text-sm font-medium">{auth.user?.full_name ?? "Account"}</div>
                  <div className="text-xs text-muted-foreground">{auth.organization?.name ?? "Personal"}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{auth.user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut} disabled={signingOut} className="text-rose-600">
                <LogOut className="mr-2 h-4 w-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}
