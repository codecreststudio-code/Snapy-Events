"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Playfair_Display, Inter } from "next/font/google"
import {
  Camera,
  QrCode,
  Image as ImageIcon,
  Users,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  Check,
  Calendar,
  Lock,
  Heart,
  Smile,
  Compass,
  Cpu,
  Globe,
  Star,
  CheckCircle,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { motion, AnimatePresence, useInView } from "framer-motion"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

// --- Custom Numeric Count-Up Component for Social Proof ---
function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const end = value
    const duration = 1500 // 1.5 seconds
    const incrementTime = 15
    const steps = duration / incrementTime
    const increment = Math.ceil(end / steps)
    
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        clearInterval(timer)
        setCount(end)
      } else {
        setCount(start)
      }
    }, incrementTime)

    return () => clearInterval(timer)
  }, [isInView, value])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// --- Pricing Card Component with Cursor Spotlight Glow Effect ---
interface PricingPlan {
  name: string
  price: number
  period: string
  description: string
  features: string[]
  popular?: boolean
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-3xl border bg-white p-8 flex flex-col justify-between transition-all duration-300 ${
        plan.popular
          ? "border-violet-500 shadow-[0_20px_50px_rgba(139,92,246,0.15)] ring-1 ring-violet-500 md:scale-[1.04] z-10"
          : "border-slate-200 hover:border-slate-350 hover:shadow-xl"
      }`}
    >
      {/* Background Spotlight Glow */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px transition duration-300 opacity-100"
          style={{
            background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, ${
              plan.popular ? "rgba(139, 92, 246, 0.12)" : "rgba(139, 92, 246, 0.06)"
            }, transparent 80%)`,
          }}
        />
      )}

      {/* Plan Header */}
      <div>
        {plan.popular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-1 text-[10px] font-bold text-white tracking-widest uppercase shadow-md">
            Most Popular
          </div>
        )}

        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            <p className="mt-2 text-xs text-slate-450 leading-relaxed font-light min-h-[32px]">
              {plan.description}
            </p>
          </div>
          {plan.popular && (
            <span className="h-8 w-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
              <Sparkles className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-slate-900">₹{plan.price}</span>
          <span className="text-slate-400 text-xs font-light">/ {plan.period}</span>
        </div>

        <ul className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-xs text-slate-600 font-light">
              <Check className={`h-4 w-4 flex-shrink-0 ${plan.popular ? "text-violet-600" : "text-slate-400"}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 pt-4">
        <Link href={`/signup?plan=${plan.name.toLowerCase()}`}>
          <Button
            className={`w-full font-bold py-5 rounded-full transition-transform active:scale-[0.98] ${
              plan.popular
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 border-none"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 border-none"
            }`}
          >
            Get Started
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

// --- Features Bento Grid Card ---
function BentoCard({
  title,
  description,
  icon: Icon,
  className = "",
  children,
}: {
  title: string
  description: string
  icon: any
  className?: string
  children?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative rounded-3xl border border-slate-150 bg-white p-8 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-250 transition-all duration-300 flex flex-col ${className}`}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-650 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300 mb-6">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="text-lg font-bold text-slate-900 group-hover:text-violet-600 transition-colors duration-300">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 font-light leading-relaxed mb-6">{description}</p>
      
      {children && <div className="relative mt-auto w-full pt-4">{children}</div>}
    </motion.div>
  )
}

// --- Data Lists ---
const roadmapSteps = [
  {
    id: "step1",
    num: "1",
    title: "Create Your Event",
    subtitle: "For the Host / Photographer",
    description: "Set up your event page in seconds. Enter the event date, venue, upload a cover photo, and customize privacy settings.",
    details: [
      "Select custom subdomain for your event",
      "Upload customized watermark for photo protection",
      "Configure automatic or manual photo approval workflows",
    ],
  },
  {
    id: "step2",
    num: "2",
    title: "Generate & Display QR Codes",
    subtitle: "At the Venue",
    description: "Print or display beautiful generated QR codes. Place them on tables, digital screens, or prints around the event venue.",
    details: [
      "Download high-resolution print-ready SVG or PNG codes",
      "Link QR code to specific galleries or the main event page",
      "Live scan analytics in the host dashboard",
    ],
  },
  {
    id: "step3",
    num: "3",
    title: "Guests Scan & Upload",
    subtitle: "For the Guests",
    description: "Guests scan the QR code with their default phone camera. They are instantly taken to the mobile web gallery to upload photos.",
    details: [
      "Zero app downloads or registrations required for guests",
      "Support for multi-file uploads directly from the gallery roll",
      "Instant real-time uploading with progress bars",
    ],
  },
  {
    id: "step4",
    num: "4",
    title: "AI Face Search & Delivery",
    subtitle: "For the Guests & Clients",
    description: "Instead of scrolling through thousands of photos, guests take a selfie or upload a photo to instantly retrieve every picture they appear in.",
    details: [
      "Instant face search indexing takes less than a second",
      "Secure individual download links for guest photos",
      "Option to purchase premium high-res print downloads",
    ],
  },
]

const galleryItems = [
  {
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    title: "An Eternal Promise",
    category: "Wedding",
    className: "md:col-span-1 md:row-span-2 h-[460px] md:h-auto",
  },
  {
    src: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
    title: "Midnight Symphony",
    category: "Concert",
    className: "md:col-span-2 md:row-span-1 h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
    title: "Sweet Blowout",
    category: "Birthday",
    className: "md:col-span-1 md:row-span-1 h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80",
    title: "Corporate Keynote",
    category: "Conference",
    className: "md:col-span-1 md:row-span-1 h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
    title: "Warm Reunions",
    category: "Family Gathering",
    className: "md:col-span-1 md:row-span-2 h-[460px] md:h-auto",
  },
  {
    src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80",
    title: "Bridal Suite Candids",
    category: "Wedding",
    className: "md:col-span-1 md:row-span-1 h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600&q=80",
    title: "Sparkler Exit",
    category: "Wedding",
    className: "md:col-span-1 md:row-span-1 h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
    title: "Midnight Cheer",
    category: "Festival",
    className: "md:col-span-2 md:row-span-1 h-[220px]",
  },
]

const orbitPhotos = [
  { src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=80", label: "Pure Elegance" },
  { src: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80", label: "Neon Vibrancy" },
  { src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=300&q=80", label: "Sweet Blowout" },
  { src: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=300&q=80", label: "Keynote" },
  { src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&q=80", label: "Generations" },
  { src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=300&q=80", label: "Bridal Smile" },
]

export default function HomePage() {
  const [activeRoadmap, setActiveRoadmap] = useState("step1")
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const plans: PricingPlan[] = [
    {
      name: "Free",
      price: 0,
      period: "forever",
      description: "Perfect for trying out Snapsy",
      features: ["5 guests limit", "5 shots per guest", "Standard photo reveal", "Basic web gallery"],
    },
    {
      name: "Starter",
      price: 99,
      period: "per event",
      description: "For small events and personal use",
      features: [
        "10 guests limit",
        "10 shots per guest",
        "Custom reveal time",
        "All image filters enabled",
      ],
    },
    {
      name: "Standard",
      price: 499,
      period: "per event",
      description: "For growing photographers",
      features: [
        "50 guests limit",
        "15 shots per guest",
        "AI Face Search matching",
        "Download all photos",
        "Priority customer support",
      ],
      popular: true,
    },
    {
      name: "Premium",
      price: 1499,
      period: "per event",
      description: "For professional photographers and large events",
      features: [
        "100 guests limit",
        "25 shots per guest",
        "Live Photo Wall stream",
        "Print-ready download gallery",
        "WhatsApp notification alerts",
        "24/7 Priority support",
      ],
    },
  ]

  const floating = (yRange: number, duration: number): any => ({
    animate: {
      y: [0, yRange, 0],
      transition: {
        duration: duration,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  })

  const heroPolaroids = [
    {
      src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=350&q=80",
      label: "An Eternal Promise",
      style: "top-[15%] left-[5%] rotate-[-8deg] hidden lg:block",
      duration: 6,
      yRange: 12,
    },
    {
      src: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=350&q=80",
      label: "Midnight Symphony",
      style: "bottom-[15%] left-[7%] rotate-[6deg] hidden lg:block",
      duration: 5,
      yRange: -10,
    },
    {
      src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=350&q=80",
      label: "Sweet Blowout",
      style: "bottom-[8%] left-[25%] rotate-[12deg] hidden xl:block",
      duration: 7,
      yRange: 8,
    },
    {
      isCustomCard: true,
      style: "top-[12%] right-[5%] rotate-[4deg] hidden lg:block",
      duration: 5.5,
      yRange: -12,
      children: (
        <div className="w-[180px] bg-white p-4 rounded-2xl shadow-xl border border-slate-100 text-left space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 tracking-wider">LIVE MEMORY FEED</span>
          </div>
          <div className="text-[11px] font-bold text-slate-800">Realtime uploads...</div>
          <div className="flex -space-x-1.5 overflow-hidden">
            <img className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80" />
            <img className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80" />
            <img className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80" />
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-[8px] font-bold text-slate-550">+24</span>
          </div>
        </div>
      )
    },
    {
      isCustomCard: true,
      style: "bottom-[20%] right-[7%] rotate-[-5deg] hidden lg:block",
      duration: 6.5,
      yRange: 10,
      children: (
        <div className="w-[180px] bg-white p-4 rounded-2xl shadow-xl border border-slate-100 text-left space-y-2.5">
          <div className="flex items-center gap-1 text-violet-650">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold tracking-wider">AI FACE INDEX</span>
          </div>
          <div className="text-[11px] font-bold text-slate-800">Found 32 photos of you</div>
          <div className="grid grid-cols-4 gap-1">
            <img className="h-6 w-6 rounded-md object-cover" src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=50&q=80" />
            <img className="h-6 w-6 rounded-md object-cover" src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=50&q=80" />
            <img className="h-6 w-6 rounded-md object-cover" src="https://images.unsplash.com/photo-1519741497674-611481863552?w=50&q=80" />
            <img className="h-6 w-6 rounded-md object-cover" src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&q=80" />
          </div>
        </div>
      )
    }
  ]

  const handleScrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className={`flex min-h-screen flex-col bg-white text-slate-900 selection:bg-violet-100 ${inter.className}`}>
      <PublicNavbar />

      <main className="flex-1 overflow-hidden">
        {/* --- SECTION 1: HERO --- */}
        <section
          className="relative w-full min-h-[92vh] flex items-center justify-center py-20 px-6 overflow-hidden"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setPointer({
              x: (event.clientX - rect.left - rect.width / 2) / rect.width,
              y: (event.clientY - rect.top - rect.height / 2) / rect.height,
            })
          }}
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.24),transparent_18%),radial-gradient(circle_at_20%_20%,rgba(236,72,153,0.16),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,240,255,0.82))]" />
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <motion.div
              animate={{ x: pointer.x * 24, y: pointer.y * 24 }}
              transition={{ type: "spring", stiffness: 40, damping: 16 }}
              className="absolute -left-16 top-12 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl"
            />
            <motion.div
              animate={{ x: pointer.x * -18, y: pointer.y * -18 }}
              transition={{ type: "spring", stiffness: 40, damping: 16 }}
              className="absolute right-10 bottom-10 h-64 w-64 rounded-full bg-fuchsia-200/30 blur-3xl"
            />
            <motion.div
              animate={{ y: scrollY * 0.08 }}
              transition={{ ease: "easeOut", duration: 0.4 }}
              className="absolute left-1/2 top-1/4 h-[420px] w-[420px] -translate-x-1/2 rounded-full border border-white/50 bg-white/5 shadow-[0_0_120px_rgba(255,255,255,0.42)]"
            />
            <div className="pointer-events-none absolute inset-0">
              <motion.div
                animate={{ opacity: [0, 0.4, 0], x: [0, 10, 0], y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-16 top-24 h-2 w-2 rounded-full bg-white/80 blur-sm"
              />
              <motion.div
                animate={{ opacity: [0, 0.35, 0], x: [0, -10, 0], y: [0, 12, 0] }}
                transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute right-20 top-32 h-2 w-2 rounded-full bg-slate-100/90 blur-sm"
              />
              <motion.div
                animate={{ opacity: [0, 0.4, 0], x: [0, 14, 0], y: [0, 8, 0] }}
                transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1/2 top-10 h-1.5 w-1.5 rounded-full bg-fuchsia-100/90 blur-sm"
              />
              <motion.div
                animate={{ opacity: [0, 0.35, 0], x: [0, -14, 0], y: [0, -8, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute right-1/3 bottom-24 h-1.5 w-1.5 rounded-full bg-violet-100/90 blur-sm"
              />
            </div>
          </div>

          {/* Centered Hero Content */}
          <div className="max-w-4xl text-center z-10 space-y-8 px-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-violet-600 bg-violet-50/80 border border-violet-100/50 backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              <span>THE #1 EVENT PHOTO SHARING PLATFORM</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className={`relative overflow-hidden text-5xl font-normal tracking-tight md:text-8xl text-slate-900 leading-[1.05] ${playfair.className}`}
            >
              Capture Every Moment. <br />
              <span className="italic font-normal bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">Reveal Together.</span>
              <motion.span
                aria-hidden="true"
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 200, opacity: [0, 0.6, 0] }}
                transition={{ delay: 0.6, duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-white/0 via-white/70 to-white/0"
              />
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed font-light"
            >
              Collect, organize and share event photos with QR codes, real-time uploads and AI magic. Your memories, beautifully organized.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-wrap justify-center items-center gap-4 pt-4"
            >
              <Button asChild size="lg" className="rounded-full bg-slate-950 hover:bg-slate-800 text-white font-medium px-8 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-slate-950/10">
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button
                onClick={handleScrollToHowItWorks}
                variant="ghost"
                size="lg"
                className="rounded-full font-medium hover:bg-slate-50 text-slate-700 border border-slate-200"
              >
                See How It Works
                <span className={`inline-block ml-2 text-xs font-normal italic text-slate-400 ${playfair.className}`}>play</span>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="pt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-slate-400 font-light"
            >
              <span>✓ No App Required</span>
              <span>•</span>
              <span>✓ QR Code Magic</span>
              <span>•</span>
              <span>✓ AI Face Search</span>
              <span>•</span>
              <span>✓ Secure & Private</span>
            </motion.div>
          </div>

          {/* Floating Polaroid Stacks */}
          {heroPolaroids.map((card, idx) => {
            if (card.isCustomCard) {
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 0.4 + idx * 0.1 }}
                  className={`absolute z-20 ${card.style}`}
                >
                  <motion.div
                    variants={floating(card.yRange, card.duration)}
                    animate="animate"
                    className="hover:scale-105 hover:rotate-0 transition-transform duration-500 cursor-pointer"
                  >
                    {card.children}
                  </motion.div>
                </motion.div>
              )
            }

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.4 + idx * 0.1 }}
                className={`absolute z-20 ${card.style}`}
              >
                <motion.div
                  variants={floating(card.yRange, card.duration)}
                  animate="animate"
                  className="w-[150px] md:w-[170px] bg-white p-3 pb-6 rounded-2xl shadow-xl border border-slate-100 hover:scale-105 hover:rotate-0 transition-transform duration-500 cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50 rounded-lg">
                    <img
                      src={card.src}
                      alt={card.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`mt-3 text-center text-[10px] text-slate-400 ${playfair.className} italic`}>
                    {card.label}
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </section>

        {/* --- SECTION 2: SOCIAL PROOF METRICS --- */}
        <section className="py-16 border-y border-slate-100 bg-slate-50/40 relative">
          <div className="container px-6 mx-auto max-w-7xl">
            <div className="text-center space-y-2 mb-10">
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase block">
                TRUSTED BY THOUSANDS OF HOSTS WORLDWIDE
              </span>
            </div>
            
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-150/60 shadow-sm text-center space-y-2">
                <div className="mx-auto h-8 w-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <h4 className="text-3xl font-extrabold text-slate-900">
                  <CountUp value={10} suffix="K+" />
                </h4>
                <p className="text-xs text-slate-400 font-light">Events Hosted</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-150/60 shadow-sm text-center space-y-2">
                <div className="mx-auto h-8 w-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
                <h4 className="text-3xl font-extrabold text-slate-900">
                  <CountUp value={25} suffix="M+" />
                </h4>
                <p className="text-xs text-slate-400 font-light">Photos Shared</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-150/60 shadow-sm text-center space-y-2">
                <div className="mx-auto h-8 w-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <h4 className="text-3xl font-extrabold text-slate-900">
                  <CountUp value={500} suffix="K+" />
                </h4>
                <p className="text-xs text-slate-400 font-light">Happy Guests</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-150/60 shadow-sm text-center space-y-2">
                <div className="mx-auto h-8 w-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Shield className="h-4 w-4" />
                </div>
                <h4 className="text-3xl font-extrabold text-slate-900">
                  <CountUp value={99} suffix=".9%" />
                </h4>
                <p className="text-xs text-slate-400 font-light">Platform Uptime</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 3: SIGNATURE INTERACTIVE PHOTO ORBIT --- */}
        <section className="py-24 relative overflow-hidden">
          <div className="container px-6 mx-auto max-w-7xl flex flex-col items-center">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
              <span className="text-xs font-semibold text-violet-600 tracking-wider uppercase block">SIGNATURE EXPERIENCE</span>
              <h2 className={`text-4xl font-normal tracking-tight md:text-5xl text-slate-900 ${playfair.className}`}>
                Interactive Memory Orbit
              </h2>
              <p className="text-slate-500 font-light max-w-md mx-auto text-sm leading-relaxed">
                Hover over photos to zoom in. A beautiful visual universe revolving around your unique event gallery.
              </p>
            </div>

            {/* Orbit Container */}
            <div className="relative w-full h-[480px] md:h-[580px] flex items-center justify-center">
              {/* Outer orbit path rings */}
              <div className="absolute h-[340px] w-[340px] md:h-[440px] md:w-[440px] border border-dashed border-slate-200 rounded-full -z-10" />
              <div className="absolute h-[220px] w-[220px] md:h-[280px] md:w-[280px] border border-dashed border-slate-100 rounded-full -z-10" />

              {/* Center Focal Card (QR Mockup) */}
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="z-20 w-[140px] md:w-[170px] bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 text-center space-y-3"
              >
                <div className="bg-slate-50 p-3 rounded-xl border flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-slate-800" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">SCAN TO ACCESS</h4>
                  <p className="text-[11px] font-bold text-slate-800">Kate & Leo's Gallery</p>
                </div>
              </motion.div>

              {/* Rotating outer ring of photos */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
                className="absolute w-[360px] h-[360px] md:w-[460px] md:h-[460px] flex items-center justify-center"
              >
                {orbitPhotos.map((photo, index) => {
                  const angle = (index / orbitPhotos.length) * 2 * Math.PI
                  const radius = typeof window !== "undefined" && window.innerWidth < 768 ? 160 : 210
                  const x = Math.cos(angle) * radius
                  const y = Math.sin(angle) * radius
                  return (
                    <div
                      key={index}
                      className="absolute"
                      style={{ x, y }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.25, zIndex: 40, transition: { duration: 0.2 } }}
                        className="w-[85px] h-[105px] md:w-[110px] md:h-[140px] bg-white p-2 pb-5 rounded-xl shadow-xl border border-slate-100 cursor-pointer flex flex-col justify-between"
                      >
                        <motion.div
                          animate={{ rotate: -360 }}
                          transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
                          className="w-full h-full flex flex-col"
                        >
                          <div className="w-full h-[76%] overflow-hidden rounded bg-slate-50">
                            <img src={photo.src} className="w-full h-full object-cover" alt={photo.label} />
                          </div>
                          <span className="text-[8px] text-center text-slate-400 mt-1.5 font-serif italic truncate">{photo.label}</span>
                        </motion.div>
                      </motion.div>
                    </div>
                  )
                })}
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- SECTION 4: FEATURES BENTO GRID --- */}
        <section className="py-24 bg-slate-50/30 border-y border-slate-100">
          <div className="container px-6 mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
              <span className="text-xs font-semibold text-violet-600 tracking-wider uppercase block">POWERFUL CAPABILITIES</span>
              <h2 className={`text-4xl font-normal tracking-tight md:text-5xl text-slate-900 ${playfair.className}`}>
                Everything you need for perfect events
              </h2>
              <p className="text-slate-500 font-light max-w-lg mx-auto text-sm leading-relaxed">
                A seamless photography experience packed with client watermarking, real-time feedback, and automated delivery.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
              <BentoCard
                title="QR Code Galleries"
                description="Unique print-ready QR codes for tables or screens. Guests scan and instantly upload without app installs."
                icon={QrCode}
                className="md:col-span-2"
              >
                <div className="relative w-full h-[140px] bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 to-fuchsia-500/5" />
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="bg-white p-3 rounded-xl shadow-md border border-slate-100 flex flex-col items-center gap-2"
                  >
                    <QrCode className="h-14 w-14 text-slate-850" />
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SCAN TO UPLOAD</span>
                  </motion.div>
                  <div className="absolute h-24 w-24 border border-dashed border-violet-200/50 rounded-full animate-[spin_20s_linear_infinite]" />
                </div>
              </BentoCard>

              <BentoCard
                title="Instant Photo Sharing"
                description="Live, real-time photo uploads. Check progress instantly from any device browser."
                icon={ImageIcon}
              >
                <div className="relative w-full h-[140px] bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-center justify-center overflow-hidden">
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                    className="relative bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-violet-50 text-violet-650 flex items-center justify-center">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-805 block">live_feed_active</span>
                      <span className="text-[9px] text-emerald-650 font-medium">● 4 photos uploading</span>
                    </div>
                  </motion.div>
                </div>
              </BentoCard>

              <BentoCard
                title="AI Face Search"
                description="Find photos of anyone in seconds. Guests take a quick selfie to index and isolate matching shots instantly."
                icon={Sparkles}
              >
                <div className="relative w-full h-[140px] bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-center justify-center overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" className="h-12 w-12 rounded-full object-cover border-2 border-violet-500 shadow-md" />
                      <div className="absolute -bottom-1 -right-1 bg-violet-650 text-white rounded-full p-0.5 shadow">
                        <Sparkles className="h-2.5 w-2.5" />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <div className="h-1 w-20 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ x: [-80, 80] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="h-full w-8 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        />
                      </div>
                      <div className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                        Match Found (99%)
                      </div>
                    </div>
                  </div>
                </div>
              </BentoCard>

              <BentoCard
                title="Secure & Private"
                description="Custom watermarks, private password protection, and granular host control permissions."
                icon={Lock}
                className="md:col-span-2"
              >
                <div className="relative w-full h-[140px] bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden flex items-center justify-center">
                  <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=80" className="absolute inset-0 h-full w-full object-cover blur-[2px] opacity-40" />
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px]" />
                  <div className="relative bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-slate-800">Secure Vault</div>
                      <div className="text-[8px] text-slate-400 font-light">Custom Watermarking</div>
                    </div>
                  </div>
                </div>
              </BentoCard>

              <BentoCard
                title="Guest Management"
                description="Review participant counts, trace active RSVPs, and curate dashboard guest rules."
                icon={Users}
              />
              <BentoCard
                title="Lightning Fast CDN"
                description="Photos optimize automatically and deliver through global edge servers instantly."
                icon={Zap}
              />
              <BentoCard
                title="Print Ready"
                description="Collect high-resolution original files perfect for album printing and physical frames."
                icon={Camera}
              />
            </div>
          </div>
        </section>

        {/* --- SECTION 5: "HOW IT WORKS" WALKTHROUGH --- */}
        <section id="how-it-works" className="py-24 relative">
          <div className="container px-6 mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
              <span className="text-xs font-semibold text-violet-600 tracking-wider uppercase block">SIMPLE PROCESS</span>
              <h2 className={`text-4xl font-normal tracking-tight md:text-5xl text-slate-900 ${playfair.className}`}>
                How Snapsy Works
              </h2>
              <p className="text-slate-500 font-light max-w-md mx-auto text-sm leading-relaxed">
                Four simple steps to capture raw emotion and deliver beautiful real-time galleries.
              </p>
            </div>

            {/* Stepper Grid */}
            <div className="grid gap-12 lg:grid-cols-12 max-w-6xl mx-auto items-start">
              {/* Triggers */}
              <div className="lg:col-span-5 space-y-4">
                {roadmapSteps.map((step) => {
                  const isActive = activeRoadmap === step.id
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveRoadmap(step.id)}
                      className={`w-full text-left flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 ${
                        isActive
                          ? "bg-violet-50/50 border-violet-200 shadow-sm"
                          : "bg-transparent border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-bold text-sm transition-colors ${
                        isActive ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"
                      }`}>
                        {step.num}
                      </div>
                      <div className="space-y-1">
                        <h4 className={`font-bold text-sm transition-colors ${isActive ? "text-violet-600" : "text-slate-800"}`}>
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-400 font-light">{step.subtitle}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Visual Preview Displays */}
              <div className="lg:col-span-7 bg-slate-50 border border-slate-150 rounded-3xl p-6 md:p-8 shadow-inner min-h-[420px] flex items-center justify-center overflow-hidden relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-violet-200/20 blur-3xl" />
                
                <AnimatePresence mode="wait">
                  {activeRoadmap === "step1" && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-md bg-white border border-slate-150 rounded-2xl shadow-xl p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b pb-4">
                        <h4 className="font-bold text-slate-800 text-sm">Dashboard / Event Settings</h4>
                        <span className="text-[10px] bg-violet-50 text-violet-600 font-bold px-2 py-0.5 rounded border border-violet-100">Live</span>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Subdomain Link</span>
                          <div className="bg-slate-50 px-3 py-2 rounded-lg border text-xs text-slate-650 font-mono">
                            snapsy.events/kate-and-leo
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-y">
                          <span className="text-xs text-slate-655 text-slate-600">Watermark Protection</span>
                          <div className="h-5 w-9 rounded-full bg-violet-600 p-0.5 flex justify-end items-center cursor-pointer">
                            <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-xs text-slate-655 text-slate-600">Auto-Approve Uploads</span>
                          <div className="h-5 w-9 rounded-full bg-slate-200 p-0.5 flex justify-start items-center cursor-pointer">
                            <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeRoadmap === "step2" && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-sm bg-white border border-slate-150 rounded-2xl shadow-xl p-8 text-center space-y-4"
                    >
                      <div className="border-2 border-dashed border-slate-200 p-4 rounded-xl space-y-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TABLE TENT CARD</span>
                        <h4 className={`text-xl font-normal leading-tight ${playfair.className}`}>
                          Help us capture <br />
                          the <span className="italic font-normal text-violet-600">magic</span>
                        </h4>
                        <div className="bg-slate-50 p-4 rounded-lg inline-block border">
                          <QrCode className="h-28 w-28 text-slate-800" />
                        </div>
                        <p className="text-[9px] text-slate-400 font-light">Scan code to upload your snapshots</p>
                      </div>
                    </motion.div>
                  )}

                  {activeRoadmap === "step3" && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-[280px] bg-slate-900 text-white border border-slate-800 rounded-3xl shadow-xl p-5 space-y-4 relative"
                    >
                      <div className="h-4 w-20 bg-black rounded-full mx-auto -mt-2 mb-2 flex items-center justify-center" />
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-xs font-bold flex items-center gap-1.5"><Camera className="h-3.5 w-3.5 text-violet-400" /> Web Gallery</span>
                        <span className="text-[9px] text-slate-400 font-mono">Upload active</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden relative border border-white/5">
                          <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=150&q=80" className="h-full w-full object-cover opacity-80" alt="Wedding snapshot" />
                          <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                            <span className="text-[9px] font-mono">100%</span>
                          </div>
                        </div>
                        <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden relative border border-white/5">
                          <img src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=150&q=80" className="h-full w-full object-cover opacity-60 animate-pulse" alt="Birthday blowout" />
                          <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                            <div className="h-1 w-12 bg-white/20 rounded-full overflow-hidden">
                              <div className="h-full w-2/3 bg-violet-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-center text-slate-400 font-light pt-2">No app install required for guests.</div>
                    </motion.div>
                  )}

                  {activeRoadmap === "step4" && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-sm bg-white border border-slate-150 rounded-2xl shadow-xl p-6 space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80" className="h-10 w-10 rounded-full object-cover border border-slate-200" alt="Guest avatar" />
                        <div className="text-left">
                          <h5 className="text-xs font-bold text-slate-800">Kate's Selfie Search</h5>
                          <p className="text-[9px] text-slate-400">Indexed across 1,200 photos</p>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden border">
                            <img src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=100&q=80" className="h-full w-full object-cover" alt="Matched photo 1" />
                          </div>
                          <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden border">
                            <img src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=100&q=80" className="h-full w-full object-cover" alt="Matched photo 2" />
                          </div>
                          <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden border">
                            <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=100&q=80" className="h-full w-full object-cover" alt="Matched photo 3" />
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-violet-650 bg-violet-50 px-2 py-1 rounded border border-violet-100 flex items-center justify-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> Found 12 photos containing Kate
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 6: PHOTO SHOWCASE BENTO GALLERY --- */}
        <section className="py-24 bg-slate-50/20 border-t border-slate-100">
          <div className="container px-6 mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
              <span className="text-xs font-semibold text-violet-600 tracking-wider uppercase block">EVENT GALLERY</span>
              <h2 className={`text-4xl font-normal tracking-tight md:text-5xl text-slate-900 ${playfair.className}`}>
                Memories that last forever
              </h2>
              <p className="text-slate-500 font-light max-w-lg mx-auto text-sm leading-relaxed">
                From weddings and concerts to milestone birthdays, explore what communities build with Snapsy.
              </p>
            </div>

            {/* Asymmetric Bento Masonry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:auto-rows-[220px] max-w-6xl mx-auto">
              {galleryItems.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className={`group relative overflow-hidden rounded-3xl shadow-sm border border-slate-150 cursor-pointer flex flex-col justify-end p-6 ${item.className}`}
                >
                  <img
                    src={item.src}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                  
                  <div className="relative z-10 space-y-1 text-white">
                    <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest block">{item.category}</span>
                    <h4 className="text-md font-bold leading-tight">{item.title}</h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 7: PREMIUM PRICING GRID --- */}
        <section className="py-24 bg-slate-50/50 border-y border-slate-100" id="pricing">
          <div className="container px-6 mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
              <span className="text-xs font-semibold text-violet-600 tracking-wider uppercase block">SIMPLE & TRANSPARENT</span>
              <h2 className={`text-4xl font-normal tracking-tight md:text-5xl text-slate-900 ${playfair.className}`}>
                Choose the perfect plan
              </h2>
              <p className="text-slate-500 font-light max-w-md mx-auto text-sm leading-relaxed">
                Transparent flat pricing based on your event capacity. Upgrade or customize bounds at any point.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto items-stretch">
              {plans.map((plan) => (
                <PricingCard key={plan.name} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 8: HIGH IMPACT CTA --- */}
        <section className="py-24 relative overflow-hidden">
          <div className="container px-6 mx-auto max-w-5xl">
            <div className="relative rounded-3xl bg-slate-950 text-white overflow-hidden px-8 py-24 text-center shadow-2xl">
              {/* Accent mesh blur */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -z-10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-3xl" />

              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className={`text-4xl md:text-6xl font-normal tracking-tight leading-[1.1] ${playfair.className}`}
                >
                  Ready to create <br />
                  unforgettable <span className="italic font-normal bg-gradient-to-r from-violet-400 to-pink-300 bg-clip-text text-transparent">memories</span>?
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                  className="text-slate-400 max-w-md mx-auto text-sm font-light leading-relaxed"
                >
                  Join thousands of photographers, event planners, and hosts delivering beautiful real-time galleries with Snapsy.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="pt-6"
                >
                  <Link href="/signup">
                    <Button size="lg" className="rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold px-10 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(255,255,255,0.15)] border-none">
                      Start Free Today
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                </motion.div>
              </div>

              {/* Floating photos in CTA container */}
              <div className="absolute -left-12 bottom-0 hidden lg:block opacity-20 rotate-[-12deg]">
                <div className="w-[110px] bg-white p-2 pb-4 rounded-xl shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=200&q=80"
                    alt="Wedding memory card"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
              <div className="absolute -right-12 top-0 hidden lg:block opacity-25 rotate-[15deg]">
                <div className="w-[120px] bg-white p-2 pb-5 rounded-xl shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=200&q=80"
                    alt="Bridesmaid card"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}