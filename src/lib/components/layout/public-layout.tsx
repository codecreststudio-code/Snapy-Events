"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ArrowRight, Menu, X, QrCode } from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Logo } from "./logo"
import { JoinEventModal } from "@/lib/components/events/join-event-modal"

export function PublicNavbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)

  // Join Event Modal State — uses the shared JoinEventModal component (QR
  // camera scanner + paste-link fallback) instead of a bare text-code form,
  // so "Join Event" behaves the same from the public navbar as it does from
  // the dashboard.
  const [showJoinModal, setShowJoinModal] = useState(false)

  const navLinks = [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "About us" },
  ]

  return (
    <>
      <header className="pt-safe sticky top-0 z-50 w-full bg-surface-dark/85 backdrop-blur-xl border-b border-hairline-dark">
        <div className="container relative mx-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center h-22 sm:h-24 px-4 sm:px-6 lg:px-8 py-2">
          {/* Left: Brand Logo */}
          <Link href="/" className="flex items-center gap-2 justify-self-start">
            <Logo />
          </Link>

          {/* Center: Nav Links — true page-center regardless of left/right
              content width, since both flanking grid columns are equal
              (minmax(0,1fr)); previously this used flex justify-between,
              which centers the nav only in the *leftover* space, so it
              skewed toward the logo since the actions cluster is wider. */}
          <nav
            className="hidden md:flex items-center gap-1 rounded-full border border-hairline-dark bg-surface-card/60 p-1.5 backdrop-blur-md justify-self-center"
            onMouseLeave={() => setHoveredPath(null)}
          >
            {navLinks.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-4 py-1.5 text-xs font-semibold transition-colors rounded-full"
                  onMouseEnter={() => setHoveredPath(item.href)}
                >
                  <span className={cn("relative z-10", isActive || hoveredPath === item.href ? "text-mauve-strong font-bold" : "text-ink-secondary")}>
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

          {/* Right: Actions (Join Event + Sign In + Get Started) */}
          <div className="hidden md:flex items-center gap-2.5 lg:gap-3.5 shrink-0 justify-self-end col-start-3">
            {/* 1. Join Event Button */}
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-mauve bg-mauve/10 hover:bg-mauve/20 border border-mauve/30 px-4 py-2 rounded-full transition-all duration-200 shadow-sm active:scale-95 shrink-0 cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Join Event</span>
            </button>

            {/* 2. Sign In Link */}
            <Link href="/login" className="text-xs font-semibold text-ink-secondary hover:text-ink transition-colors px-1 shrink-0">
              Sign in
            </Link>

            {/* 3. Get Started Button */}
            <Link href="/signup" className="shrink-0">
              <Button className="rounded-full bg-mauve px-5 py-2 text-[#1a1410] text-xs font-semibold hover:bg-mauve-strong shadow-lg shadow-mauve/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2 justify-self-end col-start-3">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-full p-2 text-ink hover:bg-mauve/10 transition"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-hairline-dark bg-surface-dark/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="container mx-auto px-4 py-6 space-y-4">
                <nav className="flex flex-col space-y-2">
                  {navLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "px-4 py-3 rounded-2xl text-sm font-semibold transition-colors",
                        pathname === item.href
                          ? "bg-mauve/10 text-mauve-strong font-bold"
                          : "text-ink-secondary hover:bg-mauve/5 hover:text-ink"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      setShowJoinModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-mauve bg-mauve/10 hover:bg-mauve/20 border border-mauve/30 transition text-left"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Join Event</span>
                  </button>
                </nav>

                <div className="pt-4 border-t border-hairline-dark space-y-3">
                  <Link href="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full rounded-full border-hairline-dark text-ink text-xs font-semibold py-2.5">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setIsOpen(false)}>
                    <Button className="w-full rounded-full bg-mauve text-[#1a1410] text-xs font-semibold py-2.5 hover:bg-mauve-strong shadow-lg shadow-mauve/10">
                      Get Started
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Join Event Modal (shared QR-camera-scanner + paste-link component —
          same one used on the dashboard, so this behaves identically from
          the public navbar instead of falling back to a bare text field) */}
      <JoinEventModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </>
  )
}

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
)

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

const YouTubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
)

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
)

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
)

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21.2 4.4L2.4 10.8c-.6.2-.6 1.1.1 1.3l4.7 1.5 1.8 5.6c.2.5.8.7 1.2.4l2.5-2 4.9 3.6c.5.4 1.2.1 1.3-.5L21.8 5.3c.2-.7-.5-1.2-1-.9z" />
    <path d="M8 13.5l9-6.5" />
  </svg>
)

const PinterestIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="11" x2="10" y2="20" />
    <circle cx="12" cy="10" r="8" />
  </svg>
)

const SnapchatIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2C8.13 2 5 5.58 5 10c0 1.3.5 2.7 1 3.5-.5.5-1.5.5-2 1s0 1.5.5 1.5c.7 0 1.2 0 1.5.5s.5 1 .5 1.5c0 .3 0 .5-.5 1s-1 1-.5 1.5S7 21 8.5 21c1 0 2-.5 3.5-.5s2.5.5 3.5.5c1.5 0 1.5-.5 2-1s-.5-1-.5-1.5 0-1.2.5-1.5.5-1 .5-1.5 1.5-.5 1.5-.5.5-1.5-.5-1.5-1.5-.5-2-1c.5-.8 1-2.2 1-3.5 0-4.42-3.13-8-7-8z" />
  </svg>
)

// Map platform keys to their icon components for dynamic rendering
const SOCIAL_ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  twitter: TwitterIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
  pinterest: PinterestIcon,
  snapchat: SnapchatIcon,
}

type SiteBranding = {
  social_links: Record<string, string>
  footer_credits: { built_by: string; built_by_url: string; powered_by: string }
  custom_tags: { label: string; url: string }[]
}

const DEFAULT_BRANDING: SiteBranding = {
  social_links: {},
  footer_credits: { built_by: "CodeCrest_Studio", built_by_url: "https://codecreststudio.vercel.app/", powered_by: "Snapsy Events" },
  custom_tags: [],
}

export function PublicFooter() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [branding, setBranding] = useState<SiteBranding>(DEFAULT_BRANDING)

  // Fetch site branding on mount
  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => (r.ok ? r.json() : DEFAULT_BRANDING))
      .then((data) => setBranding({ ...DEFAULT_BRANDING, ...data }))
      .catch(() => {})
  }, [])

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
      className="relative w-full border-t border-hairline-dark text-ink overflow-hidden pt-20 pb-6 px-4 sm:px-6 lg:px-8 bg-[#000000]"
    >
      {/* Background blur decorations */}
      <div className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full overflow-hidden">
        <div className="bg-white/5 absolute top-1/4 left-1/4 h-72 w-72 rounded-full opacity-[0.05] blur-3xl" />
        <div className="bg-white/5 absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full opacity-[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Glassmorphic Centered Newsletter Card */}
        <div className="bg-surface-card border border-hairline-dark backdrop-blur-md mb-16 rounded-2xl p-8 md:p-12 relative overflow-hidden">
          {/* Glowing accents */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

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
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <span className="text-white text-lg">✓</span>
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
                  className="w-full border border-hairline-dark bg-white/5 text-ink placeholder:text-ink-tertiary focus-visible:ring-white/50 rounded-full px-5 py-3 text-sm focus:ring-2 focus:outline-none transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-white hover:bg-neutral-200 text-black font-semibold rounded-full px-6 py-3 text-sm shadow-lg shadow-white/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Subscribing…" : "Subscribe Now"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="mb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-left">

          {/* Column 1: Brand & Logo */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col items-start text-left">
            <div className="shrink-0 flex items-center justify-start mb-4">
              <Logo imgClassName="h-24 sm:h-28 md:h-32 max-h-none w-auto" />
            </div>
            <p className="text-ink-secondary text-xs leading-relaxed mb-4 font-light">
              The modern disposable camera & live photo sharing experience for events, weddings, and parties. Powered by Snapsy Events.
            </p>
            <div className="flex flex-wrap gap-2 justify-start items-center">
              {Object.entries(branding.social_links)
                .filter(([, url]) => url?.trim())
                .map(([key, url]) => {
                  const Icon = SOCIAL_ICON_MAP[key]
                  if (!Icon) return null
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={key.charAt(0).toUpperCase() + key.slice(1)}
                      className="h-8 w-8 rounded-lg border border-hairline-dark bg-mauve/5 flex items-center justify-center text-ink-secondary hover:text-mauve hover:border-mauve/50 hover:bg-mauve/10 transition-all duration-200"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  )
                })}
              {/* Fallback: show placeholder icons when nothing is configured */}
              {Object.values(branding.social_links).every((v) => !v?.trim()) && (
                <>
                  <span className="h-8 w-8 rounded-lg border border-hairline-dark bg-mauve/5 flex items-center justify-center text-ink-tertiary opacity-40">
                    <FacebookIcon className="h-4 w-4" />
                  </span>
                  <span className="h-8 w-8 rounded-lg border border-hairline-dark bg-mauve/5 flex items-center justify-center text-ink-tertiary opacity-40">
                    <InstagramIcon className="h-4 w-4" />
                  </span>
                  <span className="h-8 w-8 rounded-lg border border-hairline-dark bg-mauve/5 flex items-center justify-center text-ink-tertiary opacity-40">
                    <TwitterIcon className="h-4 w-4" />
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Column 2: USE CASES */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink">Use Cases</h4>
            <div className="text-[9px] font-extrabold uppercase text-mauve tracking-wider mb-2">Weddings</div>
            <ul className="space-y-1.5 text-xs font-light mb-4">
              <li><Link href="/use-cases/weddings" className="text-ink-secondary hover:text-mauve transition-colors">Weddings</Link></li>
              <li><Link href="/use-cases/wedding-photo-app" className="text-ink-secondary hover:text-mauve transition-colors">Wedding Photo App</Link></li>
              <li><Link href="/use-cases/wedding-disposable-cameras" className="text-ink-secondary hover:text-mauve transition-colors">Wedding Disposable Cameras</Link></li>
              <li><Link href="/use-cases/wedding-qr-code" className="text-ink-secondary hover:text-mauve transition-colors">Wedding QR Code</Link></li>
              <li><Link href="/use-cases/wedding-photo-sharing" className="text-ink-secondary hover:text-mauve transition-colors">Wedding Photo Sharing</Link></li>
              <li><Link href="/use-cases/photography-ideas" className="text-ink-secondary hover:text-mauve transition-colors">Photography Ideas</Link></li>
              <li><Link href="/use-cases/destination-weddings" className="text-ink-secondary hover:text-mauve transition-colors">Destination Weddings</Link></li>
            </ul>
            <div className="text-[9px] font-extrabold uppercase text-mauve tracking-wider mb-2">Events</div>
            <ul className="space-y-1.5 text-xs font-light">
              <li><Link href="/use-cases/parties-and-celebrations" className="text-ink-secondary hover:text-mauve transition-colors">Parties</Link></li>
              <li><Link href="/use-cases/corporate-events" className="text-ink-secondary hover:text-mauve transition-colors">Corporate Events</Link></li>
              <li><Link href="/use-cases/corporate-photo-booth" className="text-ink-secondary hover:text-mauve transition-colors">Corporate Photo Booth</Link></li>
              <li><Link href="/use-cases/event-camera-app" className="text-ink-secondary hover:text-mauve transition-colors">Event Camera App</Link></li>
              <li><Link href="/use-cases/birthdays" className="text-ink-secondary hover:text-mauve transition-colors">Birthdays</Link></li>
              <li><Link href="/use-cases/baby-showers" className="text-ink-secondary hover:text-mauve transition-colors">Baby Showers</Link></li>
              <li><Link href="/use-cases/graduations" className="text-ink-secondary hover:text-mauve transition-colors">Graduations</Link></li>
            </ul>
          </div>

          {/* Column 3: PRODUCT & RESOURCES */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink">Product</h4>
            <ul className="space-y-1.5 text-xs font-light mb-4">
              <li><Link href="/#how-it-works" className="text-ink-secondary hover:text-mauve transition-colors">How It Works</Link></li>
              <li><Link href="/use-cases/ios-app" className="text-ink-secondary hover:text-mauve transition-colors">iOS App</Link></li>
              <li><Link href="/use-cases/android-app" className="text-ink-secondary hover:text-mauve transition-colors">Android App</Link></li>
              <li><Link href="/use-cases/disposable-camera-alternative" className="text-ink-secondary hover:text-mauve transition-colors">Disposable Camera App</Link></li>
              <li><Link href="/use-cases/digital-disposable-camera" className="text-ink-secondary hover:text-mauve transition-colors">Digital Disposable Camera</Link></li>
              <li><Link href="/use-cases/photo-booth-alternative" className="text-ink-secondary hover:text-mauve transition-colors">Photo Booth Alternative</Link></li>
            </ul>
            <div className="text-[9px] font-extrabold uppercase text-mauve tracking-wider mb-2">Guest Books</div>
            <ul className="space-y-1.5 text-xs font-light mb-4">
              <li><Link href="/use-cases/guest-book-ideas" className="text-ink-secondary hover:text-mauve transition-colors">Guest Book Ideas</Link></li>
              <li><Link href="/use-cases/photo-guest-book" className="text-ink-secondary hover:text-mauve transition-colors">Photo Guest Book</Link></li>
              <li><Link href="/use-cases/digital-guest-book" className="text-ink-secondary hover:text-mauve transition-colors">Digital Guest Book</Link></li>
            </ul>
            <div className="text-[9px] font-extrabold uppercase text-mauve tracking-wider mb-2">Sharing</div>
            <ul className="space-y-1.5 text-xs font-light mb-4">
              <li><Link href="/use-cases/share-pictures" className="text-ink-secondary hover:text-mauve transition-colors">Share Pictures</Link></li>
              <li><Link href="/use-cases/share-with-family" className="text-ink-secondary hover:text-mauve transition-colors">Share with Family</Link></li>
            </ul>
            <div className="text-[9px] font-extrabold uppercase text-mauve tracking-wider mb-2">Resources</div>
            <ul className="space-y-1.5 text-xs font-light">
              <li><Link href="/use-cases/wedding-planning-checklist" className="text-ink-secondary hover:text-mauve transition-colors">Wedding Planning Checklist</Link></li>
              <li><Link href="/use-cases/wedding-checklist-2026" className="text-ink-secondary hover:text-mauve transition-colors">Wedding Checklist 2026</Link></li>
              <li><Link href="/use-cases/best-wedding-apps-2026" className="text-ink-secondary hover:text-mauve transition-colors">Best Wedding Apps 2026</Link></li>
              <li><Link href="/blog" className="text-ink-secondary hover:text-mauve transition-colors">Blog</Link></li>
              <li><Link href="/about" className="text-ink-secondary hover:text-mauve transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Column 4: COMPARE & REVIEWS */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink">Compare</h4>
            <ul className="space-y-1.5 text-xs font-light mb-4">
              <li><Link href="/compare/all-alternatives" className="text-ink-secondary hover:text-mauve transition-colors">All Alternatives</Link></li>
              <li><Link href="/compare/best-camera-apps-2026" className="text-ink-secondary hover:text-mauve transition-colors">Best Camera Apps 2026</Link></li>
              <li><Link href="/compare/vs-pov-camera" className="text-ink-secondary hover:text-mauve transition-colors">vs POV Camera</Link></li>
              <li><Link href="/compare/vs-once-film" className="text-ink-secondary hover:text-mauve transition-colors">vs Once Film</Link></li>
              <li><Link href="/compare/vs-lense" className="text-ink-secondary hover:text-mauve transition-colors">vs Lense</Link></li>
              <li><Link href="/compare/vs-weduploader" className="text-ink-secondary hover:text-mauve transition-colors">vs WedUploader</Link></li>
              <li><Link href="/compare/vs-guestpix" className="text-ink-secondary hover:text-mauve transition-colors">vs GuestPix</Link></li>
            </ul>
            <div className="text-[9px] font-extrabold uppercase text-mauve tracking-wider mb-2">Reviews</div>
            <ul className="space-y-1.5 text-xs font-light">
              <li><Link href="/compare/pov-camera-review" className="text-ink-secondary hover:text-mauve transition-colors">POV Camera Review</Link></li>
              <li><Link href="/compare/once-film-review" className="text-ink-secondary hover:text-mauve transition-colors">Once Film Review</Link></li>
              <li><Link href="/compare/lense-review" className="text-ink-secondary hover:text-mauve transition-colors">Lense Review</Link></li>
              <li><Link href="/compare/pov-camera-vs-once-film" className="text-ink-secondary hover:text-mauve transition-colors">POV Camera vs Once Film</Link></li>
            </ul>
          </div>

          {/* Column 5: LEGAL */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink">Legal</h4>
            <ul className="space-y-1.5 text-xs font-light">
              <li><Link href="/privacy" className="text-ink-secondary hover:text-mauve transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-ink-secondary hover:text-mauve transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="text-ink-secondary hover:text-mauve transition-colors">Support</Link></li>
              <li><Link href="/delete-data" className="text-ink-secondary hover:text-mauve transition-colors">Delete Data</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="border-t border-hairline-dark pt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-ink-secondary font-light">
            &copy; {new Date().getFullYear()} {branding.footer_credits?.powered_by || "Snapsy Events"}. All rights reserved. Designed for unforgettable event memories.
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

        {/* Built By & Custom Tags Row (Exact below bottom links) */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 pt-4 border-t border-hairline-dark/40 md:flex-row text-xs text-ink-tertiary">
          {branding.footer_credits?.built_by && (
            <div>
              Built by{" "}
              {branding.footer_credits.built_by_url ? (
                <a
                  href={branding.footer_credits.built_by_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mauve hover:text-mauve-strong transition-colors font-medium underline underline-offset-2"
                >
                  {branding.footer_credits.built_by}
                </a>
              ) : (
                <span className="text-mauve font-medium">{branding.footer_credits.built_by}</span>
              )}
            </div>
          )}

          {branding.custom_tags && branding.custom_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center justify-center">
              {branding.custom_tags.map((tag, idx) =>
                tag.url ? (
                  <a
                    key={idx}
                    href={tag.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-hairline-dark bg-mauve/5 px-2.5 py-0.5 text-[10px] font-semibold text-ink-secondary hover:text-mauve hover:border-mauve/30 transition-all"
                  >
                    {tag.label}
                  </a>
                ) : (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full border border-hairline-dark bg-mauve/5 px-2.5 py-0.5 text-[10px] font-semibold text-ink-secondary"
                  >
                    {tag.label}
                  </span>
                )
              )}
            </div>
          )}
        </div>

        {/* Big brand wordmark at the very bottom — animated gold gradient shimmer */}
        <div className="mt-12 text-center select-none pointer-events-none">
          <span className="footer-wordmark-gradient block text-[12vw] font-extrabold leading-none tracking-tighter uppercase">
            Snapsy Events
          </span>
        </div>
      </div>
    </footer>
  )
}