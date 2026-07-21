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
  LogOut,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/lib/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/lib/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"
import { MobileBottomNav } from "./mobile-bottom-nav"

import { useAuth } from "@/lib/hooks"

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
  const { user, profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  return (
    <>
      {/* Desktop sidebar (lg+). Phone/tablet get MobileBottomNav instead —
          see below — rather than a hamburger + slide-in copy of this panel. */}
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-[#3D332A] bg-[#141110] lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-[#3D332A] px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mauve">
              <Camera className="h-5 w-5 text-[#141110]" />
            </div>
            <span className="font-playfair font-semibold text-lg text-white">Snapsy</span>
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
                      ? "bg-mauve/10 text-mauve"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="mt-6 px-4">
            <div className="h-px bg-[#3D332A]" />
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
                      ? "bg-mauve/10 text-mauve"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-[#3D332A] p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 text-white hover:bg-white/5 hover:text-white">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-mauve/10 text-mauve">
                    {profile?.full_name?.substring(0, 2).toUpperCase() ||
                     user?.email?.substring(0, 2).toUpperCase() ||
                     "US"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm overflow-hidden">
                  <span className="font-medium truncate max-w-[150px] text-white">
                    {profile?.full_name || user?.email?.split("@")[0] || "User"}
                  </span>
                  <span className="text-xs text-white/50 truncate max-w-[150px]">
                    {user?.email || ""}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 ml-auto flex-shrink-0 text-white/50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profile?.is_admin && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="font-semibold text-mauve hover:text-mauve-strong">
                      Admin Portal
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing">Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Phone/tablet bottom tab bar (< lg) */}
      <MobileBottomNav />
    </>
  )
}