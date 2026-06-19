"use client"

import { useState } from "react"
import Link from "next/link"
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
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { motion, AnimatePresence } from "framer-motion"
import IntroAnimation from "@/lib/components/ui/scroll-morph-hero"

const features = [
  {
    name: "QR Code Galleries",
    description: "Generate unique QR codes for each event. Guests scan and instantly access the gallery to upload photos without downloading any app.",
    icon: QrCode,
  },
  {
    name: "Instant Photo Sharing",
    description: "Share moments in real-time. Guests can upload photos directly from their mobile browser with a single tap.",
    icon: ImageIcon,
  },
  {
    name: "AI Face Search",
    description: "Find photos of anyone in seconds. Our state-of-the-art AI detects and matches faces across your entire gallery.",
    icon: Sparkles,
  },
  {
    name: "Guest Management",
    description: "Track RSVPs, manage guest lists, and control who can access your event galleries with secure access levels.",
    icon: Users,
  },
  {
    name: "Secure & Private",
    description: "Password protection, approval workflows, and granular permissions keep your memories and client photos safe.",
    icon: Shield,
  },
  {
    name: "Lightning Fast",
    description: "Optimized global CDN delivery ensures your galleries load instantly, even with thousands of raw photos.",
    icon: Zap,
  },
]

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

export default function HomePage() {
  const [activeRoadmap, setActiveRoadmap] = useState("step1")

  interface LandingPlan {
    name: string
    price: number
    period: string
    description: string
    features: string[]
    popular?: boolean
  }

  const plans: LandingPlan[] = [
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full h-[85vh] min-h-[600px] md:h-[90vh] md:min-h-[800px] border-b bg-card overflow-hidden">
          <IntroAnimation />
        </section>

        {/* Features Section */}
        <section className="py-24 bg-muted/30 border-y">
          <div className="container px-4 mx-auto sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Everything you need</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful features to manage any event, big or small, with client watermarking, galleries, and automation.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  key={feature.name}
                  className="group relative rounded-2xl border bg-card p-8 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold group-hover:text-primary transition-colors">{feature.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Roadmap / How It Works */}
        <section className="py-24">
          <div className="container px-4 mx-auto sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Explore the interactive roadmap of the Snapsy photo-sharing experience
              </p>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-12 max-w-6xl mx-auto items-start">
              {/* Tab triggers */}
              <div className="lg:col-span-5 space-y-3">
                {roadmapSteps.map((step) => {
                  const isActive = activeRoadmap === step.id
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveRoadmap(step.id)}
                      className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        isActive
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-transparent border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg font-bold text-sm transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {step.num}
                      </div>
                      <div>
                        <h4 className={`font-bold transition-colors ${isActive ? "text-primary" : "text-foreground"}`}>
                          {step.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">{step.subtitle}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content Display */}
              <div className="lg:col-span-7 border rounded-2xl bg-card p-8 lg:p-10 shadow-sm min-h-[380px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  {roadmapSteps.map((step) => {
                    if (step.id !== activeRoadmap) return null
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-6"
                      >
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                            {step.subtitle}
                          </span>
                          <h3 className="text-2xl font-bold mt-4">{step.title}</h3>
                          <p className="mt-3 text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>

                        <div className="space-y-3 pt-2">
                          <h5 className="text-sm font-semibold text-foreground">Key Capabilities:</h5>
                          <ul className="grid gap-2">
                            {step.details.map((detail) => (
                              <li key={detail} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                <div className="pt-6 border-t mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">
                    Fully automated with Supabase storage and indexing.
                  </span>
                  <Link href="/signup">
                    <Button size="sm" className="gap-2">
                      Try This Flow
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 bg-muted/30 border-y" id="pricing">
          <div className="container px-4 mx-auto sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Choose the plan that matches your event volume. Upgrade or add limits as needed.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border bg-white p-8 shadow-sm flex flex-col justify-between transition-all duration-300 ${
                    plan.popular
                      ? "ring-2 ring-orange-500 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)] lg:scale-[1.03]"
                      : "border-slate-200 hover:border-slate-350 hover:shadow-md"
                  }`}
                >
                  <div>
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-xs font-bold text-white tracking-wide uppercase">
                        Most Popular
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">₹{plan.price}</span>
                      <span className="text-slate-500 text-sm">/ {plan.period}</span>
                    </div>
                    <p className="mt-4 text-xs text-slate-550 text-muted-foreground leading-relaxed min-h-[32px]">{plan.description}</p>

                    <ul className="mt-6 space-y-3.5 border-t border-slate-100 pt-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-650 text-muted-foreground">
                          <Check className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4">
                    <Link href={`/signup?plan=${plan.name.toLowerCase()}`}>
                      <Button
                        className={`w-full font-bold py-5 rounded-xl ${
                          plan.popular
                            ? "bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_12px_rgba(249,115,22,0.2)] border-none"
                            : "bg-slate-100 text-slate-800 hover:bg-slate-200 border-none"
                        }`}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container px-4 mx-auto sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-primary overflow-hidden px-6 py-20 text-center shadow-xl shadow-primary/10 max-w-5xl mx-auto">
              {/* Background accent circles for CTA */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-xl transform translate-x-20 -translate-y-20" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full filter blur-xl transform -translate-x-20 translate-y-20" />

              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <h2 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
                  Ready to transform your events?
                </h2>
                <p className="text-lg text-primary-foreground/80 leading-relaxed">
                  Join thousands of photographers, event planners, and hosts delivering beautiful real-time galleries with Snapsy.
                </p>
                <div className="pt-4">
                  <Link href="/signup">
                    <Button size="lg" variant="secondary" className="gap-2 font-bold hover:scale-[1.03] active:scale-[0.98] transition-transform">
                      Start Free Today
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
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