"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Camera,
  QrCode,
  Image as ImageIcons,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  Play,
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
  Crown,
  Users,
  ImageIcon,
  Settings
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { motion, AnimatePresence, useInView } from "framer-motion"

// Fonts are declared in root layout (server component) as CSS variables
// --font-playfair and --font-inter — use them via className or style
const playfairClass = "font-[family-name:var(--font-playfair)]"
const interClass = "font-[family-name:var(--font-inter)]"

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
  bestValue?: boolean
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
      className={`relative rounded-3xl border bg-surface-card p-5 sm:p-8 flex flex-col justify-between transition-all duration-300 ${plan.popular
        ? "border-mauve shadow-[0_20px_50px_rgba(184,146,90,0.15)] ring-1 ring-mauve md:scale-[1.03] z-10"
        : "border-hairline-dark hover:border-mauve/40 hover:shadow-xl"
        }`}
    >
      {/* Background Spotlight Glow Wrapper */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        {isHovered && (
          <div
            className="absolute -inset-px transition duration-300 opacity-100"
            style={{
              background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, ${plan.popular ? "rgba(184, 146, 90, 0.14)" : "rgba(184, 146, 90, 0.07)"
                }, transparent 80%)`,
            }}
          />
        )}
      </div>

      {/* Badges Container */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-surface-dark border border-mauve/25 px-3.5 py-1 text-[9px] sm:text-[10px] font-bold text-mauve-strong tracking-widest uppercase shadow-md flex items-center gap-1.5 z-20">
          <Sparkles className="h-3 w-3 text-mauve" />
          POPULAR
        </div>
      )}

      {plan.bestValue && (
        <div className="absolute -top-3.5 right-6 rounded-full bg-ink px-3 py-1 text-[9px] sm:text-[10px] font-bold text-surface-dark tracking-widest uppercase shadow-md flex items-center gap-1.5 z-20">
          <Crown className="h-3.5 w-3.5" />
          BEST VALUE
        </div>
      )}

      {/* Plan Header */}
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-ink">{plan.name}</h3>
            <p className="mt-1 sm:mt-2 text-xs text-ink-secondary leading-relaxed font-light min-h-0 sm:min-h-[32px]">
              {plan.description}
            </p>
          </div>
          {plan.popular && (
            <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-mauve/10 flex items-center justify-center text-mauve shrink-0 ml-2">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          )}
          {plan.bestValue && (
            <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-ink/10 flex items-center justify-center text-ink shrink-0 ml-2">
              <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          )}
        </div>

        <div className="mt-4 sm:mt-6 flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-extrabold text-ink">₹{plan.price}</span>
          <span className="text-ink-secondary text-xs font-light">/ {plan.period}</span>
        </div>

        <ul className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 border-t border-hairline-dark pt-4 sm:pt-6">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 sm:gap-3 text-xs text-ink-secondary font-light">
              <Check className={`h-4 w-4 flex-shrink-0 mt-0.5 ${plan.popular ? "text-mauve" : "text-ink-tertiary"}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 sm:mt-8 pt-2 sm:pt-4">
        <Link href={`/signup?plan=${plan.name.toLowerCase()}`}>
          <Button
            className={`w-full font-bold py-3.5 sm:py-5 rounded-full transition-all active:scale-[0.99] ${plan.popular || plan.bestValue
              ? "bg-mauve hover:bg-mauve-strong text-[#1a1410] shadow-lg shadow-mauve/10 border-none hover:scale-[1.01]"
              : "border border-hairline-dark text-ink hover:bg-mauve/5"
              }`}
          >
            Get Started
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

// --- "Have a code?" Join Box ---
// Lets a guest who has an event's short join_code (see /api/events/join)
// skip scanning a QR or hunting down a shared link — type the code, land
// straight on that event's page, same as any other entry point.
function JoinEventCodeBox() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/events/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        router.push(`/event/${result.data.slug}`)
      } else {
        setError(result?.error?.message || "That code doesn't match a live event.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleJoin}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="mx-auto flex w-full max-w-sm flex-col items-center gap-2"
    >
      <div className="flex w-full items-stretch gap-2 rounded-full border border-hairline-dark bg-mauve/5 backdrop-blur p-1.5">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            if (error) setError(null)
          }}
          placeholder="Have a code? e.g. K7XQ9M"
          maxLength={12}
          aria-label="Event join code"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm font-medium tracking-wider text-ink placeholder:text-ink-tertiary placeholder:tracking-normal focus:outline-none"
        />
        <Button
          type="submit"
          disabled={loading || !code.trim()}
          size="sm"
          className="rounded-full bg-mauve hover:bg-mauve-strong text-[#1a1410] font-semibold px-5 disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join Event"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400 font-medium px-2 text-center">{error}</p>}
    </motion.form>
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
      className={`group relative rounded-3xl border border-hairline-dark bg-surface-card p-5 sm:p-8 overflow-hidden hover:border-mauve/40 transition-all duration-300 flex flex-col ${className}`}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-mauve/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-mauve/10 text-mauve group-hover:bg-mauve group-hover:text-[#1a1410] transition-colors duration-300 mb-4 sm:mb-6 shrink-0">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-ink group-hover:text-mauve transition-colors duration-300">{title}</h3>
      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-ink-secondary font-light leading-relaxed mb-4 sm:mb-6">{description}</p>

      {children && <div className="relative mt-auto w-full pt-2 sm:pt-4">{children}</div>}
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
    className: "md:col-span-1 md:row-span-2 h-[300px] sm:h-[400px] md:h-auto",
  },
  {
    src: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
    title: "Midnight Symphony",
    category: "Concert",
    className: "md:col-span-2 md:row-span-1 h-[200px] sm:h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
    title: "Sweet Blowout",
    category: "Birthday",
    className: "md:col-span-1 md:row-span-1 h-[200px] sm:h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80",
    title: "Corporate Keynote",
    category: "Conference",
    className: "md:col-span-1 md:row-span-1 h-[200px] sm:h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
    title: "Warm Reunions",
    category: "Family Gathering",
    className: "md:col-span-1 md:row-span-2 h-[300px] sm:h-[400px] md:h-auto",
  },
  {
    src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80",
    title: "Bridal Suite Candids",
    category: "Wedding",
    className: "md:col-span-1 md:row-span-1 h-[200px] sm:h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600&q=80",
    title: "Sparkler Exit",
    category: "Wedding",
    className: "md:col-span-1 md:row-span-1 h-[200px] sm:h-[220px]",
  },
  {
    src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
    title: "Midnight Cheer",
    category: "Festival",
    className: "md:col-span-2 md:row-span-1 h-[200px] sm:h-[220px]",
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

function RealMomentsSection() {
  const [activeCategory, setActiveCategory] = useState("birthdays")

  const categories = [
    { id: "weddings", label: "Weddings" },
    { id: "birthdays", label: "Birthdays" },
    { id: "parties", label: "Parties" },
    { id: "trips", label: "Trips" },
    { id: "holidays", label: "Holidays" },
  ]

  const categoryContent: Record<string, {
    title: string
    date: string
    heroImg: string
    galleryImgs: string[]
    leftSub: string
    leftCategoryLabel: string
    rightSub: string
    rightCategoryLabel: string
    photosCount: number
    joinedCount: number
  }> = {
    weddings: {
      title: "Sarah & Mark",
      date: "14 Oct 2026",
      heroImg: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=80",
      galleryImgs: [
        "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500&q=80",
        "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=500&q=80",
        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500&q=80"
      ],
      leftSub: "CAMERA",
      leftCategoryLabel: "DURING THE CEREMONY",
      rightSub: "GALLERY",
      rightCategoryLabel: "AFTER THE REVEAL",
      photosCount: 142,
      joinedCount: 68
    },
    birthdays: {
      title: "Charlotte's Birthday 🎂",
      date: "16 Jul 2026",
      heroImg: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1000&q=80",
      galleryImgs: [
        "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=500&q=80",
        "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&q=80",
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80"
      ],
      leftSub: "CAMERA",
      leftCategoryLabel: "DURING THE PARTY",
      rightSub: "GALLERY",
      rightCategoryLabel: "AFTER THE REVEAL",
      photosCount: 4,
      joinedCount: 1
    },
    parties: {
      title: "Neon Rooftop Gala",
      date: "31 Dec 2026",
      heroImg: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000&q=80",
      galleryImgs: [
        "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&q=80",
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80",
        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=500&q=80"
      ],
      leftSub: "CAMERA",
      leftCategoryLabel: "MIDNIGHT CHEERS",
      rightSub: "GALLERY",
      rightCategoryLabel: "AFTER THE REVEAL",
      photosCount: 230,
      joinedCount: 110
    },
    trips: {
      title: "Santorini Sunset",
      date: "18 Aug 2026",
      heroImg: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1000&q=80",
      galleryImgs: [
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=500&q=80",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80",
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&q=80"
      ],
      leftSub: "CAMERA",
      leftCategoryLabel: "ALONG THE COAST",
      rightSub: "GALLERY",
      rightCategoryLabel: "AFTER THE REVEAL",
      photosCount: 84,
      joinedCount: 12
    },
    holidays: {
      title: "Christmas",
      date: "24 Dec 2026",
      heroImg: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=1000&q=80",
      galleryImgs: [
        "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=500&q=80",
        "https://images.unsplash.com/photo-1576692139739-ab991fdfd6f3?w=500&q=80",
        "https://images.unsplash.com/photo-1544717305-2782549b5136?w=500&q=80"
      ],
      leftSub: "CAMERA",
      leftCategoryLabel: "OVER THE HOLIDAYS",
      rightSub: "GALLERY",
      rightCategoryLabel: "AFTER THE REVEAL",
      photosCount: 115,
      joinedCount: 42
    }
  }

  const current = categoryContent[activeCategory] || categoryContent.birthdays

  return (
    <section className="relative py-16 sm:py-24 px-4 sm:px-6 bg-surface-dark overflow-hidden text-center border-t border-b border-hairline-dark">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-mauve/10 via-transparent to-transparent" />

      <div className="mx-auto max-w-4xl space-y-8">

        {/* Header Title with Lines */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 sm:w-16 bg-hairline-dark" />
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.25em] text-ink-secondary uppercase">
              REAL MOMENTS
            </span>
            <div className="h-px w-12 sm:w-16 bg-hairline-dark" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-playfair font-light text-ink tracking-tight max-w-2xl mx-auto leading-[1.15]">
            “Your guests caught moments <br className="hidden sm:block" />
            <span className="italic font-normal text-mauve">you never saw.</span>”
          </h2>
        </div>

        {/* Category Pills (Row 1: Weddings, Birthdays, Parties; Row 2: Trips, Holidays) */}
        <div className="flex flex-col items-center gap-2 max-w-md mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
            {categories.slice(0, 3).map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${isActive
                      ? "bg-ink text-surface-dark font-bold shadow-md scale-105"
                      : "bg-surface-card border border-hairline-dark text-ink-secondary hover:text-ink hover:border-mauve/40"
                    }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
            {categories.slice(3).map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${isActive
                      ? "bg-ink text-surface-dark font-bold shadow-md scale-105"
                      : "bg-surface-card border border-hairline-dark text-ink-secondary hover:text-ink hover:border-mauve/40"
                    }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dual Phone Showcase (Side by Side on All Devices) */}
        <div className="pt-6 pb-6 flex justify-center items-center">
          <div className="flex flex-row items-end justify-center gap-2.5 xs:gap-3.5 sm:gap-6 md:gap-10 relative max-w-full">

            {/* Left Phone (Camera / Taking Photo view) */}
            <div className="space-y-3 text-center shrink-0">
              <motion.div
                key={`left-${activeCategory}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="w-[150px] min-[380px]:w-[165px] sm:w-[250px] md:w-[285px] h-[300px] min-[380px]:h-[330px] sm:h-[500px] md:h-[560px] rounded-[26px] min-[380px]:rounded-[30px] sm:rounded-[40px] md:rounded-[48px] bg-black border-[3.5px] min-[380px]:border-[4.5px] sm:border-[6px] md:border-[7px] border-[#2d2926] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col justify-between p-2.5 sm:p-4 text-left"
              >
                {/* Background Photo */}
                <img
                  src={current.heroImg}
                  alt={current.title}
                  className="absolute inset-0 w-full h-full object-cover rounded-[22px] min-[380px]:rounded-[26px] sm:rounded-[34px] md:rounded-[40px]"
                />

                {/* iPhone Dynamic Notch / Header */}
                <div className="relative z-10 flex justify-between items-center text-white text-[9px] sm:text-xs font-medium pt-1 px-1">
                  <div className="h-2.5 w-10 sm:h-3.5 sm:w-14 bg-black rounded-full mx-auto" />
                </div>

                {/* Bottom Overlay & CTA Pill */}
                <div className="relative z-10 space-y-1.5 sm:space-y-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 sm:p-3.5 rounded-[18px] sm:rounded-[28px]">
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-lg font-playfair font-light text-white leading-tight">{current.title}</h4>
                    <p className="text-[9px] sm:text-[11px] text-white/70 font-light">{current.date}</p>
                  </div>

                  <button className="w-full bg-ink hover:bg-ink/90 text-surface-dark font-semibold text-[9px] sm:text-xs py-1.5 sm:py-2.5 rounded-full shadow-md flex items-center justify-center gap-1 sm:gap-2 transition-transform active:scale-95">
                    <span>Take your camera</span>
                    <ArrowRight className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                  </button>
                </div>
              </motion.div>

              {/* Left Phone Caption */}
              <div className="space-y-0.5 pt-1">
                <p className="text-[9px] sm:text-[11px] font-bold text-ink tracking-widest uppercase">{current.leftSub}</p>
                <p className="text-[8px] sm:text-[10px] font-light text-ink-tertiary tracking-widest uppercase">{current.leftCategoryLabel}</p>
              </div>
            </div>

            {/* Right Phone (Gallery Reveal View) */}
            <div className="space-y-3 text-center shrink-0">
              <motion.div
                key={`right-${activeCategory}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 }}
                className="w-[145px] min-[380px]:w-[160px] sm:w-[240px] md:w-[270px] h-[290px] min-[380px]:h-[320px] sm:h-[480px] md:h-[540px] rounded-[24px] min-[380px]:rounded-[28px] sm:rounded-[36px] md:rounded-[44px] bg-[#141210] border-[3px] min-[380px]:border-[4px] sm:border-[5.5px] md:border-[6px] border-[#38332e] shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden relative flex flex-col justify-between p-2.5 sm:p-3.5 text-left"
              >
                {/* Header Info */}
                <div className="space-y-1.5 sm:space-y-3 pt-1">
                  <div className="flex justify-between items-center text-ink text-[9px] sm:text-xs">
                    <span className="text-[8px] sm:text-[10px] bg-mauve/10 text-mauve px-2 py-0.5 rounded-full font-semibold">Gallery Live</span>
                    <span className="text-[8px] sm:text-[10px] text-ink-tertiary">14d 10h left</span>
                  </div>

                  <div className="bg-surface-card p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border border-hairline-dark flex justify-between items-center text-center">
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-ink block">{current.photosCount}</span>
                      <span className="text-[8px] sm:text-[9px] text-ink-tertiary uppercase tracking-wider">Photos</span>
                    </div>
                    <div className="h-4 sm:h-6 w-px bg-hairline-dark" />
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-ink block">{current.joinedCount}</span>
                      <span className="text-[8px] sm:text-[9px] text-ink-tertiary uppercase tracking-wider">Joined</span>
                    </div>
                  </div>
                </div>

                {/* Photo Grid Preview */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 my-auto">
                  {current.galleryImgs.map((img, idx) => (
                    <div key={idx} className={`rounded-lg sm:rounded-xl overflow-hidden border border-hairline-dark relative ${idx === 0 ? "col-span-2 h-16 sm:h-28" : "h-14 sm:h-24"}`}>
                      <img src={img} alt="Guest upload" className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-[7px] sm:text-[8px] text-white">
                        Guest
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Action bar inside Phone */}
                <div className="flex justify-between items-center bg-surface-card p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-hairline-dark">
                  <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-full bg-mauve/10 text-mauve flex items-center justify-center">
                    <Camera className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-semibold text-ink">Upload</span>
                  <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-full bg-mauve text-[#1a1410] flex items-center justify-center">
                    <QrCode className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                  </div>
                </div>
              </motion.div>

              {/* Right Phone Caption */}
              <div className="space-y-0.5 pt-1">
                <p className="text-[9px] sm:text-[11px] font-bold text-ink tracking-widest uppercase">{current.rightSub}</p>
                <p className="text-[8px] sm:text-[10px] font-light text-ink-tertiary tracking-widest uppercase">{current.rightCategoryLabel}</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}

export default function HomePage() {
  const [activeRoadmap, setActiveRoadmap] = useState("step1")
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)
  const [isSmallOrbit, setIsSmallOrbit] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll, { passive: true })

    setIsSmallOrbit(window.innerWidth < 768)
    const handleResize = () => setIsSmallOrbit(window.innerWidth < 768)
    window.addEventListener("resize", handleResize, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const [plansList, setPlansList] = useState<PricingPlan[]>([
    {
      name: "Basic",
      price: 0,
      period: "per event",
      description: "Perfect for trying out Snapsy",
      features: [
        "Up to 5 guests limit",
        "30 shots per guest",
        "Custom reveal countdown",
        "Guestbook & photo reactions",
      ],
    },
    {
      name: "Standard",
      price: 499,
      period: "per event",
      description: "For small events and personal use",
      features: [
        "Up to 20 guests limit",
        "36 shots per guest",
        "AI Face Search matching",
        "Custom reveal countdown",
        "All camera filters enabled",
        "Voice notes & audio greetings",
        "Guestbook & photo reactions",
      ],
      popular: true,
    },
    {
      name: "Premium",
      price: 2999,
      period: "per event",
      description: "For professional photographers and large events",
      features: [
        "Up to 50 guests limit",
        "50 shots per guest",
        "AI Face Search matching",
        "Live Photo Wall stream",
        "Custom reveal countdown",
        "All camera filters enabled",
        "Video uploads support",
        "Voice notes & audio greetings",
        "Guestbook & photo reactions",
        "Print-ready download gallery",
        "WhatsApp notification alerts",
        "24/7 Priority support",
      ],
      bestValue: true,
    },
  ])

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/payments/plans")
        if (res.ok) {
          const result = await res.json()
          if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            const mapped = result.data.map((p: any) => ({
              name: p.name,
              price: p.price_inr,
              period: p.billing_interval === "monthly" ? "month" : "per event",
              description: p.description || "",
              features: Array.isArray(p.features) ? p.features : [],
              popular: p.is_popular || false,
              bestValue: p.best_value || false,
            }))
            mapped.sort((a: any, b: any) => (a.price ?? 0) - (b.price ?? 0))
            setPlansList(mapped)
          }
        }
      } catch (e) {
        console.error("Failed to fetch landing plans:", e)
      }
    }
    fetchPlans()
  }, [])

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
          <div className="flex items-center gap-1 text-mauve-strong">
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
    <div className={`flex min-h-screen flex-col bg-surface-dark text-ink selection:bg-mauve/30 font-sans`}>
      <PublicNavbar />

      <main className="flex-1 overflow-hidden">
        {/* --- SECTION 1: HERO --- */}
        <section
          className="hero-min-h relative w-full flex items-center justify-center py-10 sm:py-16 md:py-24 px-4 sm:px-6 overflow-hidden"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setPointer({
              x: (event.clientX - rect.left - rect.width / 2) / rect.width,
              y: (event.clientY - rect.top - rect.height / 2) / rect.height,
            })
          }}
        >
          <div className="absolute inset-0 -z-10 bg-[#080808]" />
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <motion.div
              animate={{ x: pointer.x * 24, y: pointer.y * 24 }}
              transition={{ type: "spring", stiffness: 40, damping: 16 }}
              className="absolute -left-16 top-12 h-80 w-80 rounded-full bg-white/5 blur-3xl"
            />
            <motion.div
              animate={{ x: pointer.x * -18, y: pointer.y * -18 }}
              transition={{ type: "spring", stiffness: 40, damping: 16 }}
              className="absolute right-10 bottom-10 h-64 w-64 rounded-full bg-white/5 blur-3xl"
            />
            <motion.div
              animate={{ y: scrollY * 0.08 }}
              transition={{ ease: "easeOut", duration: 0.4 }}
              className="absolute left-1/2 top-1/4 h-[320px] sm:h-[420px] w-[320px] sm:w-[420px] -translate-x-1/2 rounded-full border border-white/10 bg-white/[0.02]"
            />
          </div>

          {/* Centered Hero Content */}
          <div className="max-w-4xl text-center z-10 space-y-4 sm:space-y-8 px-2 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] sm:text-xs font-semibold text-white bg-white/5 border border-white/10 backdrop-blur"
            >
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#c5a059]" />
              <span>THE #1 EVENT PHOTO SHARING PLATFORM</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="relative overflow-hidden text-3xl min-[380px]:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight text-white leading-[1.1] sm:leading-[1.05] font-playfair"
            >
              Capture Every Moment. <br className="hidden min-[380px]:inline" />
              <span className="italic font-normal text-[#c5a059]">Reveal Together.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xs sm:text-base md:text-lg text-neutral-400 max-w-md sm:max-w-xl mx-auto leading-relaxed font-light"
            >
              Collect, organize and share event photos with QR codes, real-time uploads and AI magic. Your memories, beautifully organized.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col min-[420px]:flex-row justify-center items-center gap-2.5 sm:gap-4 pt-2 sm:pt-4"
            >
              <Button asChild size="lg" className="w-full min-[420px]:w-auto rounded-full bg-white hover:bg-neutral-200 text-black font-semibold px-8 py-3 text-xs sm:text-sm transition-all shadow-lg shadow-white/10">
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button
                onClick={handleScrollToHowItWorks}
                variant="ghost"
                size="lg"
                className="w-full min-[420px]:w-auto rounded-full font-medium hover:bg-white/10 text-white border border-white/10 px-8 py-3 text-xs sm:text-sm"
              >
                See How It Works
                <Play className="ml-2 h-3.5 w-3.5 text-white" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="pt-4 sm:pt-8 flex flex-wrap justify-center gap-x-4 sm:gap-x-8 gap-y-2 text-[10px] sm:text-xs text-ink-secondary font-light"
            >
              <span>✓ No App Required</span>
              <span className="hidden sm:inline">•</span>
              <span>✓ QR Code Magic</span>
              <span className="hidden sm:inline">•</span>
              <span>✓ AI Face Search</span>
              <span className="hidden sm:inline">•</span>
              <span>✓ Secure & Private</span>
            </motion.div>

            <div className="pt-4 sm:pt-6">
              <JoinEventCodeBox />
            </div>
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
                  <div className={`mt-3 text-center text-[10px] text-slate-400 font-playfair italic`}>
                    {card.label}
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </section>

        {/* --- SECTION 2: SOCIAL PROOF METRICS --- */}
        <section className="py-12 sm:py-20 border-y border-hairline-dark bg-surface-card relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center space-y-2 mb-8 sm:mb-12">
              <span className="text-[10px] sm:text-xs font-bold text-ink-secondary tracking-[0.25em] uppercase block">
                TRUSTED BY THOUSANDS OF HOSTS WORLDWIDE
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {/* Card 1: Events Hosted */}
              <div className="bg-surface-card-elevated p-5 sm:p-8 rounded-3xl border border-hairline-dark hover:border-mauve/40 transition-all duration-300 flex flex-col items-center justify-center text-center space-y-3 shadow-sm hover:shadow-md">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-mauve/15 text-mauve flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h4 className="text-2xl min-[380px]:text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                  <CountUp value={10} suffix="K+" />
                </h4>
                <p className="text-xs sm:text-sm text-ink-secondary font-light">Events Hosted</p>
              </div>

              {/* Card 2: Photos Shared */}
              <div className="bg-surface-card-elevated p-5 sm:p-8 rounded-3xl border border-hairline-dark hover:border-mauve/40 transition-all duration-300 flex flex-col items-center justify-center text-center space-y-3 shadow-sm hover:shadow-md">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-mauve/15 text-mauve flex items-center justify-center shrink-0">
                  <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h4 className="text-2xl min-[380px]:text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                  <CountUp value={25} suffix="M+" />
                </h4>
                <p className="text-xs sm:text-sm text-ink-secondary font-light">Photos Shared</p>
              </div>

              {/* Card 3: Happy Guests */}
              <div className="bg-surface-card-elevated p-5 sm:p-8 rounded-3xl border border-hairline-dark hover:border-mauve/40 transition-all duration-300 flex flex-col items-center justify-center text-center space-y-3 shadow-sm hover:shadow-md">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-mauve/15 text-mauve flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h4 className="text-2xl min-[380px]:text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                  <CountUp value={500} suffix="K+" />
                </h4>
                <p className="text-xs sm:text-sm text-ink-secondary font-light">Happy Guests</p>
              </div>

              {/* Card 4: Platform Uptime */}
              <div className="bg-surface-card-elevated p-5 sm:p-8 rounded-3xl border border-hairline-dark hover:border-mauve/40 transition-all duration-300 flex flex-col items-center justify-center text-center space-y-3 shadow-sm hover:shadow-md">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-mauve/15 text-mauve flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h4 className="text-2xl min-[380px]:text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                  <CountUp value={99} suffix=".9%" />
                </h4>
                <p className="text-xs sm:text-sm text-ink-secondary font-light">Platform Uptime</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- REAL MOMENTS SHOWCASE SECTION --- */}
        <RealMomentsSection />

        {/* --- SECTION 3: SIGNATURE INTERACTIVE PHOTO ORBIT --- */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col items-center">
            <div className="text-center max-w-2xl mx-auto space-y-3 sm:space-y-4 mb-10 sm:mb-16">
              <span className="text-[10px] sm:text-xs font-bold text-mauve tracking-widest uppercase block">SIGNATURE EXPERIENCE</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-ink font-playfair">
                Interactive Memory Orbit
              </h2>
              <p className="text-ink-secondary font-light max-w-xs sm:max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
                Hover over photos to zoom in. A beautiful visual universe revolving around your unique event gallery.
              </p>
            </div>

            {/* Orbit Container */}
            <div className="relative w-full h-[380px] min-[390px]:h-[420px] sm:h-[480px] md:h-[580px] flex items-center justify-center">
              {/* Outer orbit path rings */}
              <div className="absolute h-[260px] w-[260px] min-[390px]:h-[300px] min-[390px]:w-[300px] sm:h-[360px] sm:w-[360px] md:h-[440px] md:w-[440px] border border-dashed border-ink/15 rounded-full -z-10" />
              <div className="absolute h-[170px] w-[170px] min-[390px]:h-[190px] min-[390px]:w-[190px] sm:h-[230px] sm:w-[230px] md:h-[280px] md:w-[280px] border border-dashed border-ink/10 rounded-full -z-10" />

              {/* Center Focal Card (QR Mockup) */}
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="z-20 w-[120px] min-[390px]:w-[135px] sm:w-[150px] md:w-[170px] bg-surface-card-elevated p-3.5 sm:p-5 rounded-2xl shadow-2xl border border-hairline-dark text-center space-y-2 sm:space-y-3"
              >
                <div className="bg-mauve/5 p-2 sm:p-3 rounded-xl border border-hairline-dark flex items-center justify-center">
                  <QrCode className="h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 text-ink" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[8px] sm:text-[10px] font-bold text-ink-secondary uppercase tracking-widest">SCAN TO ACCESS</h4>
                  <p className="text-[10px] sm:text-[11px] font-bold text-ink truncate">Kate & Leo's Gallery</p>
                </div>
              </motion.div>

              {/* Rotating outer ring of photos */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
                className="absolute w-[280px] h-[280px] min-[390px]:w-[320px] min-[390px]:h-[320px] sm:w-[380px] sm:h-[380px] md:w-[460px] md:h-[460px] flex items-center justify-center"
              >
                {orbitPhotos.map((photo, index) => {
                  const angle = (index / orbitPhotos.length) * 2 * Math.PI
                  const radius = isSmallOrbit ? (typeof window !== "undefined" && window.innerWidth < 390 ? 115 : 135) : 210
                  const x = Math.round(Math.cos(angle) * radius * 100) / 100
                  const y = Math.round(Math.sin(angle) * radius * 100) / 100
                  return (
                    <div
                      key={index}
                      className="absolute"
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.25, zIndex: 40, transition: { duration: 0.2 } }}
                        className="w-[72px] h-[92px] min-[390px]:w-[82px] min-[390px]:h-[102px] sm:w-[95px] sm:h-[120px] md:w-[110px] md:h-[140px] bg-white p-1.5 pb-4 sm:p-2 sm:pb-5 rounded-xl shadow-xl border border-slate-100 cursor-pointer flex flex-col justify-between"
                      >
                        <motion.div
                          animate={{ rotate: -360 }}
                          transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
                          className="w-full h-full flex flex-col"
                        >
                          <div className="w-full h-[76%] overflow-hidden rounded bg-slate-50">
                            <img src={photo.src} className="w-full h-full object-cover" alt={photo.label} />
                          </div>
                          <span className="text-[7px] sm:text-[8px] text-center text-slate-400 mt-1 font-serif italic truncate">{photo.label}</span>
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
        <section className="py-16 sm:py-24 bg-surface-card border-y border-hairline-dark">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto space-y-3 sm:space-y-4 mb-12 sm:mb-20">
              <span className="text-[10px] sm:text-xs font-bold text-mauve tracking-widest uppercase block">POWERFUL CAPABILITIES</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-ink font-playfair">
                Everything you need for perfect events
              </h2>
              <p className="text-ink-secondary font-light max-w-xs sm:max-w-lg mx-auto text-xs sm:text-sm leading-relaxed">
                A seamless photography experience packed with client watermarking, real-time feedback, and automated delivery.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3 max-w-6xl mx-auto">
              <BentoCard
                title="QR Code Galleries"
                description="Unique print-ready QR codes for tables or screens. Guests scan and instantly upload without app installs."
                icon={QrCode}
                className="md:col-span-2"
              >
                <div className="relative w-full h-[120px] sm:h-[150px] bg-mauve/5 rounded-2xl border border-hairline-dark p-3 sm:p-4 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-mauve/10 to-mauve-strong/5" />
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="bg-surface-card-elevated p-2.5 sm:p-3 rounded-xl shadow-md border border-hairline-dark flex flex-col items-center gap-1.5"
                  >
                    <QrCode className="h-10 w-10 sm:h-14 sm:w-14 text-ink" />
                    <span className="text-[7px] sm:text-[8px] font-bold text-ink-secondary uppercase tracking-widest">SCAN TO UPLOAD</span>
                  </motion.div>
                  <div className="absolute h-20 w-20 sm:h-24 sm:w-24 border border-dashed border-mauve/30 rounded-full animate-[spin_20s_linear_infinite]" />
                </div>
              </BentoCard>

              <BentoCard
                title="Instant Photo Sharing"
                description="Live, real-time photo uploads. Check progress instantly from any device browser."
                icon={ImageIcon}
              >
                <div className="relative w-full h-[140px] bg-mauve/5 rounded-2xl border border-hairline-dark p-4 flex items-center justify-center overflow-hidden">
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                    className="relative bg-surface-card-elevated p-3 rounded-xl shadow-lg border border-hairline-dark flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-mauve/15 text-mauve flex items-center justify-center">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-ink block">live_feed_active</span>
                      <span className="text-[9px] text-emerald-400 font-medium">● 4 photos uploading</span>
                    </div>
                  </motion.div>
                </div>
              </BentoCard>

              <BentoCard
                title="AI Face Search"
                description="Find photos of anyone in seconds. Guests take a quick selfie to index and isolate matching shots instantly."
                icon={Sparkles}
              >
                <div className="relative w-full h-[140px] bg-mauve/5 rounded-2xl border border-hairline-dark p-4 flex items-center justify-center overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" className="h-12 w-12 rounded-full object-cover border-2 border-mauve shadow-md" />
                      <div className="absolute -bottom-1 -right-1 bg-mauve text-[#1a1410] rounded-full p-0.5 shadow">
                        <Sparkles className="h-2.5 w-2.5" />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <div className="h-1 w-20 bg-ink/10 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ x: [-80, 80] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="h-full w-8 bg-gradient-to-r from-mauve to-mauve-strong"
                        />
                      </div>
                      <div className="text-[9px] font-bold text-mauve bg-mauve/10 px-1.5 py-0.5 rounded border border-mauve/20">
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
                <div className="relative w-full h-[140px] bg-mauve/5 rounded-2xl border border-hairline-dark overflow-hidden flex items-center justify-center">
                  <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=80" className="absolute inset-0 h-full w-full object-cover blur-[2px] opacity-30" />
                  <div className="absolute inset-0 bg-surface-dark/60 backdrop-blur-[1px]" />
                  <div className="relative bg-surface-card-elevated p-3 rounded-xl shadow-lg border border-hairline-dark flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-bold text-ink">Secure Vault</div>
                      <div className="text-[8px] text-ink-secondary font-light">Custom Watermarking</div>
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
        <section id="how-it-works" className="py-16 sm:py-24 relative">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto space-y-3 sm:space-y-4 mb-12 sm:mb-20">
              <span className="text-[10px] sm:text-xs font-bold text-mauve tracking-widest uppercase block">SIMPLE PROCESS</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-ink font-playfair">
                How Snapsy Works
              </h2>
              <p className="text-ink-secondary font-light max-w-xs sm:max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
                Four simple steps to capture raw emotion and deliver beautiful real-time galleries.
              </p>
            </div>

            {/* Stepper Grid */}
            <div className="grid gap-8 lg:grid-cols-12 max-w-6xl mx-auto items-start">
              {/* Triggers */}
              <div className="lg:col-span-5 space-y-3 sm:space-y-4">
                {roadmapSteps.map((step) => {
                  const isActive = activeRoadmap === step.id
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveRoadmap(step.id)}
                      className={`w-full text-left flex items-center gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${isActive
                        ? "bg-mauve/10 border-mauve/30 shadow-sm"
                        : "bg-surface-card border-hairline-dark hover:bg-mauve/5"
                        }`}
                    >
                      <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-sm sm:text-base transition-colors ${isActive ? "bg-mauve text-[#1a1410] shadow-md" : "bg-ink/10 text-ink-secondary"
                        }`}>
                        {step.num}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className={`font-bold text-xs sm:text-sm transition-colors ${isActive ? "text-mauve" : "text-ink"}`}>
                          {step.title}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-ink-secondary font-light">{step.subtitle}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Visual Preview Displays */}
              <div className="lg:col-span-7 bg-surface-card border border-hairline-dark rounded-3xl p-6 md:p-8 shadow-inner min-h-[420px] flex items-center justify-center overflow-hidden relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-mauve/10 blur-3xl" />

                <AnimatePresence mode="wait">
                  {activeRoadmap === "step1" && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-md bg-surface-card-elevated border border-hairline-dark rounded-2xl shadow-xl p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-hairline-dark pb-4">
                        <h4 className="font-bold text-ink text-sm">Dashboard / Event Settings</h4>
                        <span className="text-[10px] bg-mauve/15 text-mauve font-bold px-2 py-0.5 rounded border border-mauve/20">Live</span>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] text-ink-secondary font-bold uppercase">Subdomain Link</span>
                          <div className="bg-mauve/5 px-3 py-2 rounded-lg border border-hairline-dark text-xs text-ink-secondary font-mono">
                            snapsy.events/kate-and-leo
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-y border-hairline-dark">
                          <span className="text-xs text-ink-secondary">Watermark Protection</span>
                          <div className="h-5 w-9 rounded-full bg-mauve p-0.5 flex justify-end items-center cursor-pointer">
                            <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-hairline-dark">
                          <span className="text-xs text-ink-secondary">Auto-Approve Uploads</span>
                          <div className="h-5 w-9 rounded-full bg-ink/10 p-0.5 flex justify-start items-center cursor-pointer">
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
                      className="w-full max-w-sm bg-surface-card-elevated border border-hairline-dark rounded-2xl shadow-xl p-8 text-center space-y-4"
                    >
                      <div className="border-2 border-dashed border-hairline-dark p-4 rounded-xl space-y-4">
                        <span className="text-[10px] text-ink-secondary font-bold uppercase tracking-widest">TABLE TENT CARD</span>
                        <h4 className={`text-xl font-light leading-tight font-playfair text-ink`}>
                          Help us capture <br />
                          the <span className="italic font-light text-mauve">magic</span>
                        </h4>
                        <div className="bg-mauve/5 p-4 rounded-lg inline-block border border-hairline-dark">
                          <QrCode className="h-28 w-28 text-ink" />
                        </div>
                        <p className="text-[9px] text-ink-secondary font-light">Scan code to upload your snapshots</p>
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
                      className="w-full max-w-[280px] bg-surface-card-elevated text-ink border border-hairline-dark rounded-3xl shadow-xl p-5 space-y-4 relative"
                    >
                      <div className="h-4 w-20 bg-black rounded-full mx-auto -mt-2 mb-2 flex items-center justify-center" />
                      <div className="flex items-center justify-between border-b border-hairline-dark pb-3">
                        <span className="text-xs font-bold flex items-center gap-1.5"><Camera className="h-3.5 w-3.5 text-mauve" /> Web Gallery</span>
                        <span className="text-[9px] text-ink-secondary font-mono">Upload active</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="aspect-square bg-mauve/5 rounded-lg overflow-hidden relative border border-hairline-dark">
                          <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=150&q=80" className="h-full w-full object-cover opacity-80" alt="Wedding snapshot" />
                          <div className="absolute inset-0 bg-surface-dark/40 flex items-center justify-center">
                            <span className="text-[9px] font-mono">100%</span>
                          </div>
                        </div>
                        <div className="aspect-square bg-mauve/5 rounded-lg overflow-hidden relative border border-hairline-dark">
                          <img src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=150&q=80" className="h-full w-full object-cover opacity-60 animate-pulse" alt="Birthday blowout" />
                          <div className="absolute inset-0 bg-surface-dark/60 flex items-center justify-center">
                            <div className="h-1 w-12 bg-ink/20 rounded-full overflow-hidden">
                              <div className="h-full w-2/3 bg-mauve" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-center text-ink-secondary font-light pt-2">No app install required for guests.</div>
                    </motion.div>
                  )}

                  {activeRoadmap === "step4" && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-sm bg-surface-card-elevated border border-hairline-dark rounded-2xl shadow-xl p-6 space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80" className="h-10 w-10 rounded-full object-cover border border-hairline-dark" alt="Guest avatar" />
                        <div className="text-left">
                          <h5 className="text-xs font-bold text-ink">Kate's Selfie Search</h5>
                          <p className="text-[9px] text-ink-secondary">Indexed across 1,200 photos</p>
                        </div>
                      </div>
                      <div className="border-t border-hairline-dark pt-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="aspect-square bg-mauve/5 rounded-lg overflow-hidden border border-hairline-dark">
                            <img src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=100&q=80" className="h-full w-full object-cover" alt="Matched photo 1" />
                          </div>
                          <div className="aspect-square bg-mauve/5 rounded-lg overflow-hidden border border-hairline-dark">
                            <img src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=100&q=80" className="h-full w-full object-cover" alt="Matched photo 2" />
                          </div>
                          <div className="aspect-square bg-mauve/5 rounded-lg overflow-hidden border border-hairline-dark">
                            <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=100&q=80" className="h-full w-full object-cover" alt="Matched photo 3" />
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-mauve bg-mauve/10 px-2 py-1 rounded border border-mauve/20 flex items-center justify-center gap-1.5">
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
        <section className="py-16 sm:py-24 bg-surface-dark border-t border-hairline-dark">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto space-y-3 sm:space-y-4 mb-12 sm:mb-20">
              <span className="text-[10px] sm:text-xs font-bold text-mauve tracking-widest uppercase block">EVENT GALLERY</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-ink font-playfair">
                Memories that last forever
              </h2>
              <p className="text-ink-secondary font-light max-w-xs sm:max-w-lg mx-auto text-xs sm:text-sm leading-relaxed">
                From weddings and concerts to milestone birthdays, explore what communities build with Snapsy.
              </p>
            </div>

            {/* Asymmetric Bento Masonry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:auto-rows-[220px] max-w-6xl mx-auto">
              {galleryItems.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className={`group relative overflow-hidden rounded-3xl border border-hairline-dark cursor-pointer flex flex-col justify-end p-5 sm:p-6 ${item.className}`}
                >
                  <img
                    src={item.src}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/80 via-surface-dark/30 to-transparent" />

                  <div className="relative z-10 space-y-1 text-white">
                    <span className="text-[9px] sm:text-[10px] font-bold text-mauve uppercase tracking-widest block">{item.category}</span>
                    <h4 className="text-sm sm:text-base font-bold leading-tight">{item.title}</h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 7: PREMIUM PRICING GRID --- */}
        <section className="py-16 sm:py-24 bg-surface-card border-y border-hairline-dark" id="pricing">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto space-y-3 sm:space-y-4 mb-12 sm:mb-20">
              <span className="text-[10px] sm:text-xs font-bold text-mauve tracking-widest uppercase block">SIMPLE & TRANSPARENT</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-ink font-playfair">
                Choose the perfect plan
              </h2>
              <p className="text-ink-secondary font-light max-w-xs sm:max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
                Transparent flat pricing based on your event capacity. Upgrade or customize bounds at any point.
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto items-stretch">
              {plansList.map((plan) => (
                <PricingCard key={plan.name} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 8: HIGH IMPACT CTA --- */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="relative rounded-3xl bg-surface-card text-ink overflow-hidden px-5 py-14 sm:px-8 sm:py-24 text-center shadow-2xl border border-hairline-dark">
              {/* Accent mesh blur */}
              <div className="absolute inset-0 bg-gradient-to-b from-surface-card via-surface-card-elevated to-surface-card -z-10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[350px] w-[350px] sm:h-[500px] sm:w-[500px] rounded-full bg-mauve/15 blur-3xl" />

              <div className="relative z-10 max-w-2xl mx-auto space-y-4 sm:space-y-6">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="text-3xl sm:text-4xl md:text-6xl font-light tracking-tight leading-[1.1] font-playfair"
                >
                  Ready to create <br />
                  unforgettable <span className="italic font-light bg-gradient-to-r from-mauve to-mauve-strong bg-clip-text text-transparent">memories</span>?
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                  className="text-ink-secondary max-w-xs sm:max-w-md mx-auto text-xs sm:text-sm font-light leading-relaxed"
                >
                  Join thousands of photographers, event planners, and hosts delivering beautiful real-time galleries with Snapsy.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="pt-4 sm:pt-6"
                >
                  <Link href="/signup">
                    <Button size="lg" className="rounded-full bg-mauve hover:bg-mauve-strong text-[#1a1410] font-semibold px-8 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-mauve/10 border-none">
                      Start Free Today
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
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
