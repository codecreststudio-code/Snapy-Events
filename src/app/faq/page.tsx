"use client"

import { useState } from "react"
import { Playfair_Display, Inter } from "next/font/google"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Sparkles } from "lucide-react"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

const faqs = [
  { q: "Do my guests need to sign up?", a: "No. Guests scan your QR code and upload instantly — no app downloads, no accounts, zero friction." },
  { q: "How does AI face search work?", a: "We detect faces on upload, build secure vector embeddings, and let guests find every photo they're in by uploading a quick selfie. No data is shared publicly." },
  { q: "Can I password-protect a gallery?", a: "Yes. Each event supports custom access codes, host moderation queues, and auto-expiry dates for extra privacy control." },
  { q: "What if I want my own domain?", a: "On the Premium plan, you can connect your own custom domain (e.g. photos.yourbrand.com) with automatic secure SSL certificate verification." },
  { q: "How do refunds work?", a: "We offer a 7-day no-questions-asked refund policy on all of our paid plans. If you are not satisfied, contact support for a prompt refund." },
  { q: "Where is data stored?", a: "All data is securely hosted on Supabase Postgres databases. Image files transfer via encrypted TLS 1.3 tunnels and are stored encrypted at rest." },
]

function FAQItem({ item, isOpen, onClick }: { item: typeof faqs[0]; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm hover:border-slate-250 transition-all duration-300">
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center p-6 text-left focus:outline-none"
      >
        <span className="font-bold text-slate-800 text-sm md:text-base">{item.q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400"
        >
          <ChevronDown className="h-4.5 w-4.5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 pt-1 border-t border-slate-50 text-slate-500 font-light text-xs md:text-sm leading-relaxed">
              {item.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

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
            <span>ANSWERS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className={`text-4xl font-normal tracking-tight md:text-6xl text-slate-900 leading-tight ${playfair.className}`}
          >
            Frequently asked <span className="italic font-normal bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">questions</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-md text-slate-500 max-w-xl mx-auto font-light leading-relaxed"
          >
            Everything you need to know about Snapsy galleries, uploads, and security details.
          </motion.p>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <FAQItem
                key={idx}
                item={faq}
                isOpen={openIdx === idx}
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              />
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
