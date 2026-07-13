"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ArrowRight, Menu, X } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Logo } from "./logo"

import { CurrencyToggle } from "@/lib/components/ui/currency-toggle"

export function PublicNavbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)

  const navLinks = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "About us" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl shadow-sm shadow-slate-900/5">
      <div className="container relative flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left: Logo */}
        <div className="flex-1 md:flex-none">
          <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-90">
            <Logo />
          </Link>
        </div>

        {/* Center: Perfectly Centered Desktop Nav */}
        <nav
          className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-slate-200/60 bg-white/60 px-2 py-1.5 shadow-sm"
          onMouseLeave={() => setHoveredPath(null)}
        >
          {navLinks.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-4 py-2 text-sm font-medium transition-colors rounded-full"
                onMouseEnter={() => setHoveredPath(item.href)}
              >
                <span className={cn("relative z-10", isActive || hoveredPath === item.href ? "text-slate-950" : "text-slate-600")}>
                  {item.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 rounded-full bg-slate-100"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                {hoveredPath === item.href && !isActive && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 rounded-full bg-slate-100/60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right: Desktop CTAs */}
        <div className="hidden md:flex flex-1 md:flex-none justify-end items-center gap-3">
          <CurrencyToggle />
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors">
            Sign in
          </Link>
          <Link href="/signup">
            <Button className="rounded-full bg-slate-950 px-7 py-2.5 text-white hover:bg-slate-900 shadow-sm shadow-slate-900/10 hover:scale-[1.02] active:scale-[0.98] transition-transform">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          whileTap={{ scale: 0.94 }}
          className="flex md:hidden p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </motion.button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="md:hidden border-t border-slate-200/70 bg-white/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 pt-4 pb-6 space-y-3">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-full px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-slate-200/70 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 transition"
                >
                  Sign in
                </Link>
                <Link href="/signup" onClick={() => setIsOpen(false)}>
                  <Button className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-900 shadow-sm shadow-slate-900/10">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
)

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

export function PublicFooter() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch("/api/blog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSubmitted(true)
        setEmail("")
      }
    } catch (_) {}
    setLoading(false)
  }

  return (
    <footer
      className="relative w-full border-t border-violet-950/20 text-white overflow-hidden pt-20 pb-6 px-4 sm:px-6 lg:px-8 bg-slate-950"
      style={{ background: "radial-gradient(100% 80% at 50% 110%, rgba(139, 92, 246, 0.12) 0%, rgba(12, 8, 32, 0.9) 60%, rgba(3, 2, 10, 1) 100%)" }}
    >
      {/* Background blur decorations */}
      <div className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full overflow-hidden">
        <div className="bg-violet-600 absolute top-1/4 left-1/4 h-72 w-72 rounded-full opacity-[0.03] blur-3xl" />
        <div className="bg-fuchsia-600 absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full opacity-[0.03] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Glassmorphic Centered Newsletter Card */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md mb-16 rounded-2xl p-8 md:p-12 relative overflow-hidden">
          {/* Glowing accents */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto text-center relative z-10 flex flex-col items-center">
            <h3 className="mb-4 text-2xl font-bold md:text-3xl tracking-tight text-white">
              Stay ahead with Snapsy.
            </h3>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed max-w-md font-light">
              Join thousands of event organizers who trust Snapsy for seamless photo sharing and event management.
            </p>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 py-4"
              >
                <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                  <span className="text-violet-400 text-lg">✓</span>
                </div>
                <p className="font-semibold text-white text-sm">Thank you for subscribing!</p>
                <p className="text-xs text-slate-400">You are now on our list.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row w-full max-w-md justify-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:ring-violet-500/50 rounded-full px-5 py-3 text-sm focus:ring-2 focus:outline-none transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-full px-6 py-3 text-sm shadow-lg shadow-violet-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shrink-0 disabled:opacity-50"
                >
                  {loading ? "Subscribing…" : "Subscribe Now"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="mb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-8">

          {/* Column 1: Brand & Logo (Col-span 2) */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex flex-col md:flex-row items-start gap-6 text-left">
            {/* Logo on the left */}
            <div className="shrink-0 flex items-center justify-start">
              <img
                src="/Favicon.png"
                alt="Snapsy Logo"
                className="h-40 sm:h-52 md:h-64 w-auto object-contain filter brightness-100 invert-0"
              />
            </div>
            {/* Text & Socials on the right */}
            <div className="flex flex-col items-start">
              <p className="text-slate-400 text-sm leading-relaxed mb-4 max-w-sm text-left font-light">
                Empowering event organizers with reliable, scalable, and innovative live photo sharing and event management solutions.
              </p>
              <div className="flex space-x-3 justify-start items-center">
                {/* Facebook Icon Outline Pill */}
                <a
                  href="#"
                  aria-label="Facebook"
                  className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-200"
                >
                  <FacebookIcon className="h-4.5 w-4.5" />
                </a>
                {/* Instagram Icon Outline Pill */}
                <a
                  href="#"
                  aria-label="Instagram"
                  className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-200"
                >
                  <InstagramIcon className="h-4.5 w-4.5" />
                </a>
                {/* Twitter Icon Outline Pill */}
                <a
                  href="#"
                  aria-label="Twitter"
                  className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-200"
                >
                  <TwitterIcon className="h-4.5 w-4.5" />
                </a>
                {/* LinkedIn Icon Outline Pill */}
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-200"
                >
                  <LinkedInIcon className="h-4.5 w-4.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Solutions */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-200">Solutions</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/features" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-200">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="border-t border-white/10 pt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Snapsy. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-xs text-slate-400 hover:text-white transition-colors duration-200">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-slate-400 hover:text-white transition-colors duration-200">
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Big brand wordmark at the very bottom */}
        <div className="mt-12 text-center select-none pointer-events-none">
          <span className="block text-[12vw] font-extrabold leading-none tracking-tighter text-white/[0.03] uppercase">
            Snapsy
          </span>
        </div>
      </div>
    </footer>
  )
}