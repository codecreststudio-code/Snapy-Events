"use client"

import { Playfair_Display, Inter } from "next/font/google"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { ContactForm } from "./contact-form"
import { motion } from "framer-motion"
import { Mail, Shield, Sparkles, MessageSquare } from "lucide-react"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export default function ContactPage() {
  return (
    <div className={`flex min-h-screen flex-col bg-surface-dark text-white selection:bg-mauve/30 ${inter.className}`}>
      <PublicNavbar />

      <main className="flex-1 bg-surface-dark overflow-hidden relative py-12 md:py-20">
        {/* Subtle mesh glow */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-15 blur-3xl">
          <div className="h-[450px] w-[550px] rounded-full bg-gradient-to-tr from-mauve via-mauve-strong to-mauve" />
        </div>

        <section className="mx-auto max-w-6xl px-6 py-8 md:py-16 text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-mauve bg-mauve/10 border border-mauve/20"
          >
            <span>CONNECT WITH US</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className={`text-4xl font-light tracking-tight md:text-6xl text-white leading-tight ${playfair.className}`}
          >
            Let's start a <span className="italic font-light bg-gradient-to-r from-mauve to-mauve-strong bg-clip-text text-transparent">conversation</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-md text-white/60 max-w-xl mx-auto font-light leading-relaxed"
          >
            Have questions about custom event volumes, features, or integrations? We'll get back to you within 24 hours.
          </motion.p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-12 lg:grid-cols-12 items-start max-w-5xl mx-auto">
            {/* Left Details */}
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-5 bg-surface-card rounded-2xl border border-hairline-dark">
                  <div className="h-10 w-10 rounded-xl bg-mauve/15 text-mauve flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">General Support</h3>
                    <p className="text-xs text-white/60 font-light mt-1">Get fast help with event creation or uploader sessions.</p>
                    <span className="text-xs font-bold text-mauve block mt-2 hover:underline cursor-pointer">support@snapsy.events</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-surface-card rounded-2xl border border-hairline-dark">
                  <div className="h-10 w-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Sales & Enterprise</h3>
                    <p className="text-xs text-white/60 font-light mt-1">Custom quotes, SLA agreements, or photographer bundle deals.</p>
                    <span className="text-xs font-bold text-red-400 block mt-2 hover:underline cursor-pointer">sales@snapsy.events</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-surface-card rounded-2xl border border-hairline-dark">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Press & Inquiries</h3>
                    <p className="text-xs text-white/60 font-light mt-1">For media files, logos, interviews, and partnership deals.</p>
                    <span className="text-xs font-bold text-emerald-400 block mt-2 hover:underline cursor-pointer">press@snapsy.events</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Contact Card Form */}
            <div className="lg:col-span-7 bg-surface-card p-8 rounded-3xl border border-hairline-dark shadow-lg relative">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/10 hidden md:block">
                <span className="text-4xl text-mauve/30 select-none">✦</span>
              </div>

              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
