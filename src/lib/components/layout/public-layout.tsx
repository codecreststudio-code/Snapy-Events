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
    <header className="sticky top-0 z-50 w-full bg-surface-dark/80 backdrop-blur-xl border-b border-hairline-dark">
      <div className="container relative flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left: Logo */}
        <div className="flex-1 md:flex-none">
          <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-90">
            <Logo />
          </Link>
        </div>

        {/* Center: Perfectly Centered Desktop Nav */}
        <nav
          className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-hairline-dark bg-mauve/5 px-2 py-1.5"
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
                <span className={cn("relative z-10", isActive || hoveredPath === item.href ? "text-mauve-strong" : "text-ink-secondary")}>
                  {item.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 rounded-full bg-mauve/10"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                {hoveredPath === item.href && !isActive && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 rounded-full bg-mauve/5"
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
          <Link href="/login" className="text-sm font-medium text-ink-secondary hover:text-ink transition-colors">
            Sign in
          </Link>
          <Link href="/signup">
            <Button className="rounded-full bg-mauve px-7 py-2.5 text-[#faf6ed] font-semibold hover:bg-mauve-strong shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all">
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
          className="flex md:hidden p-2 rounded-full text-ink-secondary hover:bg-mauve/5 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50"
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
            className="md:hidden border-t border-hairline-dark bg-surface-dark/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 pt-4 pb-6 space-y-3">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-mauve/5 hover:text-ink transition"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-hairline-dark flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex justify-center rounded-full border border-hairline-dark px-4 py-3 text-sm font-semibold text-ink hover:bg-mauve/5 transition"
                >
                  Sign in
                </Link>
                <Link href="/signup" onClick={() => setIsOpen(false)}>
                  <Button className="w-full rounded-full bg-mauve text-[#faf6ed] font-semibold hover:bg-mauve-strong shadow-lg shadow-mauve/10">
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
      className="relative w-full border-t border-hairline-dark text-ink overflow-hidden pt-20 pb-6 px-4 sm:px-6 lg:px-8 bg-surface-dark"
      style={{ background: "radial-gradient(100% 80% at 50% 110%, rgba(184, 146, 90, 0.10) 0%, rgba(250, 246, 237, 0.95) 60%, rgba(255, 255, 255, 1) 100%)" }}
    >
      {/* Background blur decorations */}
      <div className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full overflow-hidden">
        <div className="bg-mauve absolute top-1/4 left-1/4 h-72 w-72 rounded-full opacity-[0.05] blur-3xl" />
        <div className="bg-mauve-strong absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full opacity-[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Glassmorphic Centered Newsletter Card */}
        <div className="bg-surface-card border border-hairline-dark backdrop-blur-md mb-16 rounded-2xl p-8 md:p-12 relative overflow-hidden">
          {/* Glowing accents */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-mauve/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-mauve-strong/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto text-center relative z-10 flex flex-col items-center">
            <h3 className="mb-4 text-2xl font-playfair font-light md:text-3xl tracking-tight text-ink">
              Stay ahead with Snapsy.
            </h3>
            <p className="text-ink-secondary mb-8 text-sm leading-relaxed max-w-md font-light">
              Join thousands of event organizers who trust Snapsy for seamless photo sharing and event management.
            </p>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 py-4"
              >
                <div className="h-10 w-10 rounded-full bg-mauve/20 flex items-center justify-center border border-mauve/30">
                  <span className="text-mauve text-lg">✓</span>
                </div>
                <p className="font-semibold text-ink text-sm">Thank you for subscribing!</p>
                <p className="text-xs text-ink-secondary">You are now on our list.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row w-full max-w-md justify-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full border border-hairline-dark bg-mauve/5 text-ink placeholder:text-ink-tertiary focus-visible:ring-mauve/50 rounded-full px-5 py-3 text-sm focus:ring-2 focus:outline-none transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold rounded-full px-6 py-3 text-sm shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shrink-0 disabled:opacity-50"
                >
                  {loading ? "Subscribing…" : "Subscribe Now"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="mb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Column 1: Brand & Logo (Col-span 2 on lg) */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col items-start text-left">
            <div className="shrink-0 flex items-center justify-start mb-4">
              <img
                src="/Logo.png"
                alt="Snapsy Events Logo"
                className="h-16 w-auto object-contain"
              />
            </div>
            <p className="text-ink-secondary text-xs leading-relaxed mb-4 font-light">
              Snapsy Events provides an app-free live photo sharing experience for weddings, corporate summits, and celebrations with QR code scanning and instant AI face search.
            </p>
            <div className="flex space-x-2 justify-start items-center">
              <a
                href="#"
                aria-label="Facebook"
                className="h-8 w-8 rounded-lg border border-hairline-dark bg-mauve/5 flex items-center justify-center text-ink-secondary hover:text-mauve hover:border-mauve/50 hover:bg-mauve/10 transition-all duration-200"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="h-8 w-8 rounded-lg border border-hairline-dark bg-mauve/5 flex items-center justify-center text-ink-secondary hover:text-mauve hover:border-mauve/50 hover:bg-mauve/10 transition-all duration-200"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="h-8 w-8 rounded-lg border border-hairline-dark bg-mauve/5 flex items-center justify-center text-ink-secondary hover:text-mauve hover:border-mauve/50 hover:bg-mauve/10 transition-all duration-200"
              >
                <TwitterIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="h-8 w-8 rounded-lg border border-hairline-dark bg-mauve/5 flex items-center justify-center text-ink-secondary hover:text-mauve hover:border-mauve/50 hover:bg-mauve/10 transition-all duration-200"
              >
                <LinkedInIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2: USE CASES */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink">Use Cases</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/use-cases/weddings" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Weddings
                </Link>
              </li>
              <li>
                <Link href="/use-cases/wedding-photo-sharing" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Wedding Photo Sharing
                </Link>
              </li>
              <li>
                <Link href="/use-cases/disposable-camera-alternative" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Disposable Camera Alternative
                </Link>
              </li>
              <li>
                <Link href="/use-cases/corporate-events" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Corporate Events
                </Link>
              </li>
              <li>
                <Link href="/use-cases/parties-and-celebrations" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Parties & Celebrations
                </Link>
              </li>
              <li>
                <Link href="/use-cases/birthdays" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Birthdays
                </Link>
              </li>
              <li>
                <Link href="/use-cases/baby-showers" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Baby Showers
                </Link>
              </li>
              <li>
                <Link href="/use-cases/graduations" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Graduations
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: PRODUCT & RESOURCES */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/features" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Features Overview
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/use-cases/photo-booth-alternative" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Photo Booth Alternative
                </Link>
              </li>
              <li>
                <Link href="/use-cases/digital-guest-book" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Digital Guest Book
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Blog & Photography Guides
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  About Snapsy Events
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: COMPARE */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink">Compare</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/compare/all-alternatives" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  All Alternatives
                </Link>
              </li>
              <li>
                <Link href="/compare/vs-pov-camera" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Snapsy vs POV Camera
                </Link>
              </li>
              <li>
                <Link href="/compare/vs-guestpix" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Snapsy vs GuestPix
                </Link>
              </li>
              <li>
                <Link href="/compare/vs-weduploader" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Snapsy vs WedUploader
                </Link>
              </li>
              <li>
                <Link href="/compare/vs-once-film" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Snapsy vs Once Film
                </Link>
              </li>
              <li>
                <Link href="/compare/vs-disposable-cameras" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Snapsy vs Disposable Cameras
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: LEGAL & SUPPORT */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink">Legal & Support</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Support & Contact
                </Link>
              </li>
              <li>
                <Link href="/delete-data" className="text-ink-secondary hover:text-mauve transition-colors duration-200">
                  Delete My Data
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="border-t border-hairline-dark pt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-ink-secondary font-light">
            &copy; {new Date().getFullYear()} Snapsy Events. All rights reserved. Designed for unforgettable event memories.
          </p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-xs text-ink-secondary hover:text-ink transition-colors duration-200">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-ink-secondary hover:text-ink transition-colors duration-200">
              Terms of Service
            </Link>
            <Link href="/delete-data" className="text-xs text-ink-secondary hover:text-ink transition-colors duration-200">
              Data Deletion
            </Link>
          </div>
        </div>

        {/* Big brand wordmark at the very bottom */}
        <div className="mt-12 text-center select-none pointer-events-none">
          <span className="block text-[12vw] font-extrabold leading-none tracking-tighter text-ink/[0.03] uppercase">
            Snapsy Events
          </span>
        </div>
      </div>
    </footer>
  )
}