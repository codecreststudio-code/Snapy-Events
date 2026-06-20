"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { Button } from "@/lib/components/ui/button"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const NAV = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
]

export function PublicNav() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl shadow-sm shadow-slate-900/5">
      <div className="container flex h-20 items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Snapsy home" className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/95 px-4 py-2 shadow-sm shadow-slate-900/5">
          <Logo />
        </Link>

        <nav className="hidden flex-1 justify-center items-center gap-10 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-slate-900",
                pathname === item.href ? "text-slate-950" : "text-slate-600",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-950">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full bg-slate-950 px-7 py-2.5 text-white hover:bg-slate-900 shadow-sm shadow-slate-900/10">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          className="md:hidden rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="border-t border-slate-200/70 bg-white/95 backdrop-blur-xl md:hidden"
          >
            <nav className="container flex flex-col gap-3 py-4" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-full px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              <div className="mt-2 flex flex-col gap-3 px-3">
                <Button asChild variant="outline" size="sm" className="w-full rounded-full border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-900 shadow-sm shadow-slate-900/10">
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
