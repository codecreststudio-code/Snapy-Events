"use client"

import { Playfair_Display, Inter } from "next/font/google"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Play,
  Sparkles,
  Lock,
  Smile,
  Globe,
  Compass,
  Eye,
  Camera,
  Heart,
  Calendar,
  Cpu,
  Bookmark,
  Users
} from "lucide-react"
import { Button } from "@/lib/components/ui/button"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export default function AboutPage() {
  // Framer Motion Animation Variants
  const fadeUp: any = {
    hidden: { opacity: 0, y: 30 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.15,
        duration: 0.8,
        ease: [0.21, 0.47, 0.32, 0.98] as const,
      },
    }),
  }

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

  // Horizontal Timeline Milestones
  const timeline = [
    { year: "2023", title: "The Idea", desc: "Frustrated with lost memories, the idea was born.", icon: Sparkles },
    { year: "2023", title: "First Prototype", desc: "We built our first prototype and tested with friends.", icon: Compass },
    { year: "2024", title: "First Events", desc: "Snapsy powered its first real events and weddings.", icon: Calendar },
    { year: "2024", title: "1,000+ Events", desc: "Our community grew and so did the memories.", icon: Users },
    { year: "2025", title: "AI Face Search", desc: "We launched AI to help find every face in every memory.", icon: Cpu },
    { year: "2025", title: "And Beyond", desc: "We're just getting started. The best is yet to come.", icon: Globe },
  ]

  // Value Grid Items
  const values = [
    { 
      title: "Memories Matter", 
      desc: "We build for moments that last forever. Every photo is a story waiting to be retold.", 
      icon: Heart 
    },
    { 
      title: "Privacy First", 
      desc: "Your memories are yours. We protect them with enterprise-grade security and RLS policies.", 
      icon: Lock 
    },
    { 
      title: "Simplicity Wins", 
      desc: "No apps to download. No hurdles to jump. Just scan, snap, and view.", 
      icon: Smile 
    },
    { 
      title: "Built For Everyone", 
      desc: "From weddings to corporate events, communities, we are here for all celebrations.", 
      icon: Users 
    },
    { 
      title: "Capture Everything", 
      desc: "Every smile, every angle, every candid snapshot from every guest's lens.", 
      icon: Camera 
    },
    { 
      title: "Global Access", 
      desc: "Memories belong to everyone, to download, view, and share from anywhere globally.", 
      icon: Globe 
    },
  ]

  // Partner trust logos
  const partners = [
    { name: "WEDDINGWIRE", style: "font-serif tracking-widest text-white/50 font-bold" },
    { name: "eventbrite", style: "font-sans tracking-tight text-white/50 font-extrabold italic" },
    { name: "the knot", style: "font-serif tracking-wider text-white/50 font-medium lowercase" },
    { name: "HOORAY!", style: "font-sans tracking-wide text-white/50 font-black uppercase" },
    { name: "ZOLA", style: "font-sans tracking-widest text-white/50 font-light" },
    { name: "cvent", style: "font-sans tracking-normal text-white/50 font-semibold" },
  ]

  const handleScrollToStory = () => {
    document.getElementById("our-story")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className={`flex min-h-screen flex-col bg-surface-dark text-white selection:bg-mauve/30 ${inter.className}`}>
      <PublicNavbar />

      <main className="flex-1 overflow-hidden">
        {/* SECTION 1: HERO */}
        <section className="relative mx-auto max-w-7xl px-6 py-20 md:py-32 lg:px-8">
          {/* Subtle Lavender Background Gradients */}
          <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-20 blur-3xl">
            <div className="h-[400px] w-[500px] rounded-full bg-gradient-to-tr from-mauve via-mauve-strong to-mauve" />
          </div>

          <div className="grid gap-12 lg:grid-cols-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-8">
              <motion.div 
                initial="hidden"
                animate="visible"
                custom={0}
                variants={fadeUp}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-mauve bg-mauve/10 border border-mauve/20"
              >
                <span>ABOUT SNAPSY</span>
              </motion.div>

              <motion.h1
                initial="hidden"
                animate="visible"
                custom={1}
                variants={fadeUp}
                className={`text-5xl font-light tracking-tight md:text-7xl text-white leading-[1.08] ${playfair.className}`}
              >
                We help moments <br />
                last a <span className="italic font-light bg-gradient-to-r from-mauve to-mauve-strong bg-clip-text text-transparent">lifetime</span>.
              </motion.h1>

              <motion.p
                initial="hidden"
                animate="visible"
                custom={2}
                variants={fadeUp}
                className="text-lg text-white/60 max-w-lg leading-relaxed font-light"
              >
                Snapsy was created to help people collect, preserve, and relive the moments that matter most — together, without friction.
              </motion.p>

              <motion.div
                initial="hidden"
                animate="visible"
                custom={3}
                variants={fadeUp}
                className="flex flex-wrap items-center gap-4 pt-4"
              >
                <Button asChild size="lg" className="rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold px-8 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-mauve/10">
                  <Link href="/signup">Create Your Event</Link>
                </Button>
                <Button
                  onClick={handleScrollToStory}
                  variant="ghost"
                  size="lg"
                  className="rounded-full font-medium hover:bg-white/5 text-white border border-white/15"
                >
                  See how it works
                  <Play className="ml-2 h-4 w-4 fill-current text-white" />
                </Button>
              </motion.div>
            </div>

            {/* Right Polaroids Stack with floating movement */}
            <div className="lg:col-span-6 relative h-[450px] md:h-[550px] w-full mt-10 lg:mt-0 flex items-center justify-center">
              {/* Polaroid 1: Top Left - Concert/Group */}
              <motion.div 
                custom={4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="absolute z-10 top-[10%] left-[2%] md:left-[8%]"
              >
                <motion.div 
                  variants={floating(10, 6)}
                  animate="animate"
                  className="w-[150px] md:w-[190px] bg-white p-3 pb-6 rounded-lg shadow-xl border border-slate-100 rotate-[-8deg] hover:rotate-0 transition-transform duration-500 cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50 rounded">
                    <img 
                      src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=400&auto=format&fit=crop" 
                      alt="Friends laughing" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`mt-3 text-center text-xs text-slate-400 ${playfair.className} italic`}>Relive together</div>
                </motion.div>
              </motion.div>

              {/* Polaroid 2: Top Right - Wedding couple */}
              <motion.div 
                custom={5}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="absolute z-20 top-[2%] right-[5%] md:right-[15%]"
              >
                <motion.div 
                  variants={floating(-12, 5)}
                  animate="animate"
                  className="w-[160px] md:w-[210px] bg-white p-3.5 pb-8 rounded-lg shadow-2xl border border-slate-100 rotate-[6deg] hover:rotate-0 transition-transform duration-500 cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50 rounded">
                    <img 
                      src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=400&auto=format&fit=crop" 
                      alt="Wedding kiss" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`mt-4 text-center text-sm text-slate-400 ${playfair.className} italic`}>A lifetime memory</div>
                </motion.div>
              </motion.div>

              {/* Polaroid 3: Middle - QR scanning phone */}
              <motion.div 
                custom={6}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="absolute z-30 top-[42%] left-[28%] md:left-[32%]"
              >
                <motion.div 
                  variants={floating(14, 7)}
                  animate="animate"
                  className="w-[150px] md:w-[190px] bg-white p-3 pb-6 rounded-lg shadow-2xl border border-slate-100 rotate-[-2deg] hover:rotate-0 transition-transform duration-500 cursor-pointer"
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-slate-50 rounded">
                    <img 
                      src="https://images.unsplash.com/photo-1634973357973-f2ed255753e1?q=80&w=400&auto=format&fit=crop" 
                      alt="QR code scan" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`mt-3 text-center text-xs text-slate-400 ${playfair.className} italic`}>Scan & upload</div>
                </motion.div>
              </motion.div>

              {/* Polaroid 4: Middle Right - Purple crowd */}
              <motion.div 
                custom={7}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="absolute z-10 top-[35%] right-[-2%] md:right-[5%]"
              >
                <motion.div 
                  variants={floating(-10, 6.5)}
                  animate="animate"
                  className="w-[140px] md:w-[180px] bg-white p-3 pb-6 rounded-lg shadow-xl border border-slate-100 rotate-[12deg] hover:rotate-0 transition-transform duration-500 cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50 rounded">
                    <img 
                      src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop" 
                      alt="Dancing crowd" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`mt-3 text-center text-xs text-slate-400 ${playfair.className} italic`}>Pure joy</div>
                </motion.div>
              </motion.div>

              {/* Polaroid 5: Bottom - Group of bridesmaids */}
              <motion.div 
                custom={8}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="absolute z-20 bottom-[5%] left-[8%] md:left-[15%]"
              >
                <motion.div 
                  variants={floating(8, 5.5)}
                  animate="animate"
                  className="w-[150px] md:w-[190px] bg-white p-3 pb-6 rounded-lg shadow-2xl border border-slate-100 rotate-[-6deg] hover:rotate-0 transition-transform duration-500 cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50 rounded">
                    <img 
                      src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=400&auto=format&fit=crop" 
                      alt="Bridesmaids smiling" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className={`mt-3 text-center text-xs text-slate-400 ${playfair.className} italic`}>Best friends</div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHY WE BUILT SNAPSY */}
        <section id="our-story" className="relative bg-surface-card py-24 md:py-36">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-16 lg:grid-cols-12 items-center">
              {/* Left Column Story */}
              <div className="lg:col-span-5 space-y-6">
                <span className="text-xs font-semibold text-mauve tracking-wider uppercase block">OUR STORY</span>
                <h2 className={`text-4xl font-light tracking-tight md:text-5xl text-white leading-[1.1] ${playfair.className}`}>
                  Why we built Snapsy
                </h2>
                <div className="space-y-4 text-white/60 font-light leading-relaxed">
                  <p>
                    We've all been to amazing events. We take tons of photos. But when the event is over, those photos stay in our phones.
                  </p>
                  <p>
                    Hosts never get to see them. And those moments slowly fade away.
                  </p>
                  <p className="font-semibold text-mauve mt-6">
                    We built Snapsy to change that.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-8 border-t border-hairline-dark">
                  <div className="space-y-2">
                    <div className="h-10 w-10 rounded-full bg-mauve/15 flex items-center justify-center text-mauve">
                      <Camera className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-white">Guest Capture</h4>
                    <p className="text-[10px] text-white/50 leading-normal">Every guest captures beautiful moments.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-10 w-10 rounded-full bg-mauve/15 flex items-center justify-center text-mauve">
                      <Smile className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-white">Never Shared</h4>
                    <p className="text-[10px] text-white/50 leading-normal">But most photos never get shared.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="h-10 w-10 rounded-full bg-mauve/15 flex items-center justify-center text-mauve">
                      <Heart className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-white">Saved Forever</h4>
                    <p className="text-[10px] text-white/50 leading-normal">Memories fade when they're not together.</p>
                  </div>
                </div>
              </div>

              {/* Right Column Video Overlay */}
              <div className="lg:col-span-7 relative">
                {/* Background soft glow */}
                <div className="absolute -inset-4 -z-10 rounded-3xl bg-mauve/10 blur-2xl" />

                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-2xl border border-hairline-dark">
                  <img
                    src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1200&auto=format&fit=crop"
                    alt="Sparkler beach celebration at sunset"
                    className="w-full h-full object-cover"
                  />
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-dark/30">
                    <button className="h-16 w-16 rounded-full bg-mauve text-[#141110] flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95">
                      <Play className="h-6 w-6 fill-current text-[#141110] translate-x-0.5" />
                    </button>
                  </div>
                </div>

                {/* Overlaid Founder Quote Card */}
                <div className="absolute bottom-[-30px] right-[-10px] md:right-[20px] max-w-[280px] bg-surface-card-elevated p-5 rounded-2xl shadow-xl border border-hairline-dark space-y-3">
                  <span className="text-4xl text-mauve/60 font-serif leading-none block h-4">"</span>
                  <p className="text-xs text-white/70 leading-relaxed font-light italic">
                    Snapsy is our way of making sure every memory finds its home.
                  </p>
                  <div className="text-[10px] font-bold text-white/50 tracking-wider">
                    — THE SNAPSY TEAM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: TIMELINE */}
        <section className="relative py-24 md:py-36">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
              <span className="text-xs font-semibold text-mauve tracking-wider uppercase">OUR JOURNEY</span>
              <h2 className={`text-4xl font-light tracking-tight md:text-5xl text-white ${playfair.className}`}>
                How we got here
              </h2>
            </div>

            {/* Horizontal Timeline */}
            <div className="relative pt-8 pb-12 overflow-x-auto select-none no-scrollbar">
              {/* Timeline connecting line */}
              <div className="absolute top-[48px] left-[50px] right-[50px] h-0.5 bg-hairline-dark -z-10" />

              <div className="flex justify-between min-w-[900px] px-8">
                {timeline.map((step, idx) => (
                  <div key={idx} className="w-[130px] flex flex-col items-center text-center space-y-4 relative">
                    <span className="text-sm font-bold text-white/50">{step.year}</span>

                    {/* Circle icon marker */}
                    <div className="h-10 w-10 rounded-full bg-surface-card-elevated border-2 border-hairline-dark text-mauve flex items-center justify-center shadow-sm hover:border-mauve hover:scale-105 transition-all">
                      <step.icon className="h-4 w-4" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white">{step.title}</h4>
                      <p className="text-[10px] text-white/50 leading-normal px-1">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: VALUES */}
        <section className="relative bg-surface-card py-24 md:py-36 border-t border-hairline-dark">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-xl space-y-4 mb-20 text-left">
              <span className="text-xs font-semibold text-mauve tracking-wider uppercase block">OUR VALUES</span>
              <h2 className={`text-4xl font-light tracking-tight md:text-6xl text-white leading-none ${playfair.className}`}>
                What we believe <br />
                in <span className="italic font-light bg-gradient-to-r from-mauve to-mauve-strong bg-clip-text text-transparent">deeply</span>
              </h2>
            </div>

            {/* Minimal Grid - 6 cards max */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {values.map((v, idx) => (
                <div
                  key={idx}
                  className="bg-surface-card-elevated p-8 rounded-2xl border border-hairline-dark hover:border-mauve/40 transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    <div className="h-12 w-12 rounded-xl bg-mauve/15 flex items-center justify-center text-mauve transition-colors group-hover:bg-mauve group-hover:text-[#141110]">
                      <v.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{v.title}</h3>
                    <p className="text-sm text-white/60 font-light leading-relaxed">
                      {v.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5: FOUNDER NOTE */}
        <section className="relative py-24 md:py-36">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-16 lg:grid-cols-12 items-center">
              {/* Left Note Content */}
              <div className="lg:col-span-6 space-y-8">
                <span className="text-xs font-semibold text-mauve tracking-wider uppercase block">FOUNDER'S NOTE</span>
                <h2 className={`text-4xl font-light tracking-tight md:text-5xl text-white leading-[1.1] ${playfair.className}`}>
                  A note from <br />
                  our <span className="italic font-light bg-gradient-to-r from-mauve to-mauve-strong bg-clip-text text-transparent">founder</span>
                </h2>

                <div className="space-y-6 text-white/60 font-light leading-relaxed">
                  <p>
                    I started Snapsy after my best friend's wedding. We never got to see so many beautiful photos our guests took. I knew there had to be a better way.
                  </p>
                  <p>
                    Snapsy is that way. We make sharing effortless, preserving every memory in high resolution.
                  </p>
                </div>

                <div className="pt-6 space-y-2">
                  {/* Handwritten Signature SVG */}
                  <svg className="w-36 h-12 text-white fill-current" viewBox="0 0 150 50">
                    <path
                      d="M 10 30 Q 30 10 50 30 T 70 30 T 90 20 T 110 30 T 130 15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-bold text-white">Arjun Patel</h4>
                    <p className="text-xs text-white/50">Founder & CEO</p>
                  </div>
                </div>
              </div>

              {/* Right Founder portrait */}
              <div className="lg:col-span-6 flex justify-center relative">
                {/* Mauve background glow */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-mauve/20 to-mauve-strong/10 rounded-full blur-3xl scale-90" />

                <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] overflow-hidden rounded-full border-[10px] border-surface-card-elevated shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop" 
                    alt="Arjun Patel Portrait" 
                    className="w-full h-full object-cover object-top scale-105"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: TRUST SECTION */}
        <section className="py-12 md:py-20 border-t border-hairline-dark bg-surface-card">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center space-y-6">
            <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase block">
              TRUSTED BY AMAZING HOSTS & BRANDS
            </span>
            
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 md:gap-x-16">
              {partners.map((p, idx) => (
                <span key={idx} className={`${p.style} opacity-50 hover:opacity-100 transition-opacity select-none text-md md:text-lg`}>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 7: FINAL CTA */}
        <section className="relative py-20 md:py-32 bg-surface-card text-white overflow-hidden border-t border-hairline-dark">
          {/* Deep dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-surface-card via-surface-card-elevated to-surface-card -z-10" />

          {/* Subtle mauve radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-mauve/15 blur-3xl" />

          <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center space-y-8 relative">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className={`text-4xl md:text-6xl font-light tracking-tight max-w-3xl mx-auto leading-[1.1] ${playfair.className}`}
            >
              Let's make <span className="italic font-light bg-gradient-to-r from-mauve to-mauve-strong bg-clip-text text-transparent">memories</span> <br />
              impossible to lose.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-md text-white/60 max-w-lg mx-auto font-light leading-relaxed"
            >
              Join thousands of hosts who trust Snapsy to capture, share, and relive what matters most.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-wrap justify-center items-center gap-4 pt-4"
            >
              <Button asChild size="lg" className="rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold px-8 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-mauve/10">
                <Link href="/signup">Create Your Event</Link>
              </Button>
              <Button
                onClick={handleScrollToStory}
                variant="ghost"
                size="lg"
                className="rounded-full font-medium hover:bg-white/5 text-white border border-white/15 px-8"
              >
                See How It Works
              </Button>
            </motion.div>

            {/* Floating background event photos in Final CTA */}
            <div className="absolute -left-16 bottom-0 hidden lg:block opacity-20 rotate-[-12deg]">
              <div className="w-[120px] bg-white p-2 pb-4 rounded shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=200&auto=format&fit=crop" 
                  alt="Wedding memory" 
                  className="w-full h-full object-cover rounded-[2px]"
                />
              </div>
            </div>
            <div className="absolute -right-16 top-0 hidden lg:block opacity-25 rotate-[15deg]">
              <div className="w-[130px] bg-white p-2.5 pb-5 rounded shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=200&auto=format&fit=crop" 
                  alt="Wedding memory" 
                  className="w-full h-full object-cover rounded-[2px]"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
