"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Camera,
  Image as ImageIcon,
  QrCode,
  Download,
  Settings,
  CreditCard,
  LogOut,
  MoreHorizontal,
  X,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks"

// Native-app-style bottom tab bar for phone/tablet widths (< lg). Mirrors the
// "Home / Search / raised-center / Cart / Profile" pattern: two tabs on each
// side of an elevated circular hub button, small active-state indicator dash
// above the label, everything else tucked behind "More". Desktop (lg+) still
// gets the full sidebar from DashboardSidebar — this only renders below it.
const SIDE_TABS_LEFT = [
  { name: "Events", href: "/dashboard/events", icon: Camera },
  { name: "Galleries", href: "/dashboard/galleries", icon: ImageIcon },
]

const SIDE_TABS_RIGHT = [
  { name: "QR Codes", href: "/dashboard/qr", icon: QrCode },
]

const MORE_ITEMS = [
  { name: "Downloads", href: "/dashboard/downloads", icon: Download },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function TabButton({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 rounded-lg"
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "absolute top-0 h-[3px] w-5 rounded-full bg-mauve transition-all duration-300",
          active ? "opacity-100 scale-100" : "opacity-0 scale-50"
        )}
      />
      <Icon
        className={cn(
          "h-5 w-5 transition-colors duration-200",
          active ? "text-mauve" : "text-white/50"
        )}
      />
      <span className={cn("transition-colors duration-200", active ? "text-mauve" : "text-white/50")}>
        {label}
      </span>
    </Link>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const homeActive = pathname === "/dashboard"
  const moreActive = MORE_ITEMS.some((i) => isActivePath(pathname, i.href))

  const handleSignOut = async () => {
    setMoreOpen(false)
    await signOut()
    router.push("/login")
  }

  return (
    <>
      {/* Bottom bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-sidebar/95 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className="relative mx-auto flex max-w-md items-stretch px-2">
          {SIDE_TABS_LEFT.map((item) => (
            <TabButton
              key={item.href}
              href={item.href}
              label={item.name}
              icon={item.icon}
              active={isActivePath(pathname, item.href)}
            />
          ))}

          {/* Raised center hub — always returns to the dashboard overview */}
          <div className="flex flex-1 flex-col items-center justify-end">
            <Link
              href="/dashboard"
              aria-label="Dashboard home"
              aria-current={homeActive ? "page" : undefined}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "-mt-6 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-mauve/30 ring-4 ring-sidebar transition-transform",
                  "bg-gradient-to-br from-mauve to-mauve-strong"
                )}
              >
                <LayoutDashboard className="h-6 w-6 text-surface-dark" />
              </motion.div>
            </Link>
            <span
              className={cn(
                "mt-1 text-[10px] font-medium transition-colors",
                homeActive ? "text-mauve" : "text-white/50"
              )}
            >
              Home
            </span>
          </div>

          {SIDE_TABS_RIGHT.map((item) => (
            <TabButton
              key={item.href}
              href={item.href}
              label={item.name}
              icon={item.icon}
              active={isActivePath(pathname, item.href)}
            />
          ))}

          {/* More — opens the overflow sheet */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 rounded-lg"
          >
            <span
              className={cn(
                "absolute top-0 h-[3px] w-5 rounded-full bg-mauve transition-all duration-300",
                moreActive ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}
            />
            <MoreHorizontal className={cn("h-5 w-5", moreActive ? "text-mauve" : "text-white/50")} />
            <span className={cn(moreActive ? "text-mauve" : "text-white/50")}>More</span>
          </button>
        </div>
      </nav>

      {/* Overflow sheet */}
      <DialogPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border/60 bg-sidebar p-4 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300 lg:hidden"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="mb-3 flex items-center justify-between px-1">
              <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                More
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="space-y-1">
              {MORE_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      active ? "bg-mauve/10 text-mauve" : "text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}

              {profile?.is_admin && (
                <Link
                  href="/admin"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-violet-500 hover:bg-violet-500/10"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Admin Portal
                </Link>
              )}

              <div className="my-2 h-px bg-border" />

              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
