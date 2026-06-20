"use client"

import { useState } from "react"
import { Playfair_Display, Inter } from "next/font/google"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { motion } from "framer-motion"
import { 
  Camera, 
  QrCode, 
  Sparkles, 
  Lock, 
  Globe, 
  Users, 
  Layout, 
  Zap, 
  Download, 
  FolderHeart, 
  Eye, 
  Layers 
} from "lucide-react"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

const groups = [
  { 
    title: "Collect", 
    icon: Camera,
    color: "text-violet-600 bg-violet-50",
    items: [
      { name: "QR code uploads", desc: "No app downloads, guests scan and upload from default browsers." },
      { name: "Camera capture (mobile)", desc: "Optimized snapping interface with direct device roll hook." },
      { name: "Bulk drag-and-drop", desc: "For hosts or professional photographers uploading massive folders." },
      { name: "Email-to-gallery", desc: "Each gallery gets a dedicated inbox address for desktop uploads." }
    ] 
  },
  { 
    title: "Organize", 
    icon: FolderHeart,
    color: "text-rose-600 bg-rose-50",
    items: [
      { name: "Multiple galleries per event", desc: "Separate folders for ceremony, cocktail hour, reception, or days." },
      { name: "AI face clustering", desc: "Isolate faces, match embeddings, and auto-group moments." },
      { name: "Auto-tag moments", desc: "Tag uploads by timestamp, uploader, or location metadata." },
      { name: "Slideshow & live wall", desc: "Stream guest photos in real time onto a TV or screen projection." }
    ] 
  },
  { 
    title: "Share", 
    icon: Globe,
    color: "text-emerald-600 bg-emerald-50",
    items: [
      { name: "Public gallery link", desc: "Elegant public event page customizable with custom layouts." },
      { name: "Password & expiry", desc: "Keep memories secure with password locks and custom expiration dates." },
      { name: "Watermarking", desc: "Protect client or raw event images with automatic logo watermarks." },
      { name: "Custom domain support", desc: "Map your gallery link to your own domain with free SSL certificate." }
    ] 
  },
  { 
    title: "Operate", 
    icon: Layers,
    color: "text-amber-600 bg-amber-50",
    items: [
      { name: "Team roles", desc: "Collaborate with owner, admin, member, and viewer level permissions." },
      { name: "Audit logs", desc: "Full security tracing of all views, downloads, uploads, and edits." },
      { name: "Storage usage dashboard", desc: "Monitor raw file storage, image counts, and bandwidth in real time." },
      { name: "CSV data export", desc: "Export guest contact lists, uploader logs, and image analytics." }
    ] 
  },
]

export default function FeaturesPage() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <div className={`flex min-h-screen flex-col bg-white text-slate-900 selection:bg-violet-100 ${inter.className}`}>
      <PublicNavbar />
      
      <main className="flex-1 bg-slate-50/20 overflow-hidden relative py-12 md:py-20">
        {/* Subtle mesh light glow */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-25 blur-3xl">
          <div className="h-[400px] w-[500px] rounded-full bg-gradient-to-tr from-violet-100 via-fuchsia-50 to-pink-50" />
        </div>

        <section className="mx-auto max-w-6xl px-6 py-12 md:py-20 text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-violet-600 bg-violet-50/80 border border-violet-100/50"
          >
            <span>PLATFORM CAPABILITIES</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className={`text-4xl font-normal tracking-tight md:text-6xl text-slate-900 leading-tight ${playfair.className}`}
          >
            Everything you need for <br />
            a <span className="italic font-normal bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">modern</span> photo event
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-md text-slate-500 max-w-xl mx-auto font-light leading-relaxed"
          >
            Built for weddings, conferences, school reunions, community celebrations, and corporate launches.
          </motion.p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-8 md:grid-cols-2">
            {groups.map((group, idx) => {
              const isHovered = hoveredIdx === idx
              return (
                <motion.div
                  key={group.title}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.05 }}
                  className="bg-white p-8 rounded-3xl border border-slate-150 shadow-sm hover:shadow-lg hover:border-slate-250 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-6">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${group.color}`}>
                      <group.icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{group.title}</h2>
                  </div>

                  <ul className="space-y-5 text-sm">
                    {group.items.map((item) => (
                      <li key={item.name} className="space-y-1 text-left">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-450 font-light leading-relaxed pl-3.5">
                          {item.desc}
                        </p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
