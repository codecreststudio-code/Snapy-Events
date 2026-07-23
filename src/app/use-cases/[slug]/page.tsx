import { notFound } from "next/navigation"
import Link from "next/link"
import { Sparkles, QrCode, Shield, Check, ArrowRight, Camera, Smartphone, Layers } from "lucide-react"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { Button } from "@/lib/components/ui/button"

export const revalidate = 86400

interface UseCaseData {
  title: string
  subtitle: string
  metaDescription: string
  badge: string
  heroImage: string
  benefits: { title: string; description: string; icon: any }[]
  steps: { number: string; title: string; detail: string }[]
  faq: { q: string; a: string }[]
}

const USE_CASES_DATA: Record<string, UseCaseData> = {
  weddings: {
    title: "Wedding Photo Sharing Made Effortless",
    subtitle: "Collect every candid memory from your guests without downloading any apps or chasing down links after the big day with Snapsy Events.",
    metaDescription: "Collect wedding guest photos seamlessly with Snapsy Events. App-free QR code table cards, live TV slideshows, and instant AI face search for guests.",
    badge: "WEDDING PHOTO CAPSULE",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    benefits: [
      {
        title: "100% App-Free QR Access",
        description: "Guests simply point their phone camera at table QR cards to open your private Snapsy Events wedding portal instantly in Safari or Chrome.",
        icon: QrCode,
      },
      {
        title: "Instant AI Selfie Matching",
        description: "Guests take a quick selfie to immediately filter and download every photo they appear in across thousands of wedding pictures.",
        icon: Sparkles,
      },
      {
        title: "Live TV Reception Slideshow",
        description: "Stream guest photos live on reception screens or projectors as your loved ones snap and upload them throughout the evening.",
        icon: Smartphone,
      },
      {
        title: "High-Res Original Downloads",
        description: "Preserve full-resolution uncompressed photo downloads for print albums, memory books, and high-definition keepsakes.",
        icon: Shield,
      },
    ],
    steps: [
      { number: "01", title: "Create Wedding Capsule", detail: "Set up your wedding date, venue, custom subdomain, and bride & groom branding in Snapsy Events." },
      { number: "02", title: "Place Table QR Cards", detail: "Print high-resolution QR cards for reception tables, bar stations, and guest entrance boards." },
      { number: "03", title: "Guests Snap & Share", detail: "Friends and family scan to upload candid photos, voice notes, and heartfelt congratulations instantly." },
      { number: "04", title: "AI Photo Search", detail: "Guests use AI face matching to find all their photos in seconds while you enjoy your honeymoon." },
    ],
    faq: [
      { q: "Do guests need to download an app?", a: "No! Snapsy Events runs completely in the mobile web browser. Guests scan the table QR code and upload photos in seconds without downloading anything." },
      { q: "Can we review photos before they show on the Live Wall?", a: "Yes. Snapsy Events provides an optional host moderation queue where you or your designated coordinator can approve photos before they appear on live screens." },
    ],
  },
  "wedding-photo-sharing": {
    title: "The Ultimate Wedding Photo Sharing Platform",
    subtitle: "Replace group chats and forgotten hashtags. Snapsy Events gives your guests a beautiful shared wedding gallery in seconds.",
    metaDescription: "Discover how Snapsy Events simplifies wedding photo sharing. Real-time guest uploads, custom branding, and instant AI face matching.",
    badge: "WEDDING PHOTO SHARING",
    heroImage: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80",
    benefits: [
      {
        title: "Unified Family Gallery",
        description: "Gather photos from ceremony, cocktail hour, reception, and afterparty into one elegant Snapsy Events gallery.",
        icon: Layers,
      },
      {
        title: "Custom Photographer Watermarks",
        description: "Protect photographer preview images with custom watermarks before full resolution delivery.",
        icon: Shield,
      },
      {
        title: "Zero Compression Loss",
        description: "Unlike social media apps, Snapsy Events retains maximum image quality for professional printing.",
        icon: Camera,
      },
      {
        title: "AI Face Recognition",
        description: "Let guests find all their photos effortlessly without endless manual scrolling.",
        icon: Sparkles,
      },
    ],
    steps: [
      { number: "01", title: "Setup Event", detail: "Initialize your custom wedding capsule on Snapsy Events." },
      { number: "02", title: "Share QR Link", detail: "Distribute table cards and digital invitation QR links." },
      { number: "03", title: "Collect Memories", detail: "Guests upload raw unscripted moments in real time." },
      { number: "04", title: "Download Album", detail: "Download full-resolution ZIP archives of all guest uploads." },
    ],
    faq: [
      { q: "How long are photos stored on Snapsy Events?", a: "Depending on your event plan, photos are stored securely for 30 days to indefinitely with full backup options." },
    ],
  },
  "disposable-camera-alternative": {
    title: "Digital Disposable Camera Alternative for Modern Events",
    subtitle: "Ditch expensive single-use plastic cameras. Give every guest a digital disposable camera on their phone with Snapsy Events.",
    metaDescription: "Modern digital disposable camera experience for weddings and parties. App-free QR photo uploads, custom frame reveals, and instant AI gallery indexing by Snapsy Events.",
    badge: "DISPOSABLE CAMERA ALTERNATIVE",
    heroImage: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1200&q=80",
    benefits: [
      {
        title: "Save Thousands on Developing",
        description: "Eliminate expensive physical camera purchases, film developing fees, and lost camera rolls.",
        icon: Camera,
      },
      {
        title: "Timed Photo Reveals",
        description: "Build excitement by revealing guest photos the morning after the event or on your first anniversary.",
        icon: Sparkles,
      },
      {
        title: "Unlimited Digital Roll",
        description: "Set custom shot limits per guest or let guests upload unlimited high-resolution candids.",
        icon: Smartphone,
      },
      {
        title: "Eco-Friendly & Zero Waste",
        description: "Reduce plastic waste while collecting 10x more candid photos than traditional disposable cameras.",
        icon: Shield,
      },
    ],
    steps: [
      { number: "01", title: "Create Digital Roll", detail: "Configure shot counts, timed photo reveal dates, and custom camera filters in Snapsy Events." },
      { number: "02", title: "Print QR Placeholders", detail: "Place stylized digital disposable QR cards on every table." },
      { number: "03", title: "Guests Snap Photos", detail: "Guests snap photos through their phone browser as if holding a vintage disposable camera." },
      { number: "04", title: "Grand Reveal", detail: "Unlock the full event roll simultaneously for all guests to view and share." },
    ],
    faq: [
      { q: "Can we limit how many photos each guest can take?", a: "Yes! Snapsy Events allows you to set custom photo limits per guest (e.g. 5, 10, or 25 shots) to recreate the authentic disposable camera feel." },
    ],
  },
  "corporate-events": {
    title: "Real-Time Photo Sharing for Corporate Summits & Galas",
    subtitle: "Drive brand engagement and capture executive keynotes, team retreats, and award nights with Snapsy Events.",
    metaDescription: "Streamline corporate event photography with Snapsy Events. Branded QR portals, real-time photo walls, custom logo watermarks, and instant AI attendance gallery delivery.",
    badge: "CORPORATE EVENT SOLUTIONS",
    heroImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&q=80",
    benefits: [
      {
        title: "Branded QR Portal",
        description: "Customize the web uploader with corporate logo marks, brand color schemes, and sponsor watermarks.",
        icon: Shield,
      },
      {
        title: "Live Keynote Stage Projection",
        description: "Stream attendee photos and team moments live on stage LED screens during gala dinners.",
        icon: Smartphone,
      },
      {
        title: "Enterprise Access Controls",
        description: "Protect sensitive corporate retreats with passcodes, domain restrictions, and SSO integration.",
        icon: Layers,
      },
      {
        title: "AI Attendee Gallery Delivery",
        description: "Allow attendees to find their networking photos instantly with high-speed AI face matching.",
        icon: Sparkles,
      },
    ],
    steps: [
      { number: "01", title: "Brand Configuration", detail: "Apply your corporate logo, custom domain, and watermark rules." },
      { number: "02", title: "Venue Display", detail: "Project QR codes on keynote slides, badge lanyards, and digital signage." },
      { number: "03", title: "Attendee Engagement", detail: "Attendees share team photos and breakout session highlights instantly." },
      { number: "04", title: "Analytics & Export", detail: "Export engagement analytics and download high-resolution event media archives." },
    ],
    faq: [
      { q: "Is Snapsy Events GDPR compliant for enterprise events?", a: "Yes. Snapsy Events enforces enterprise data privacy standards, secure encryption, and self-service data deletion workflows." },
    ],
  },
  "parties-and-celebrations": {
    title: "Capture Every Party Angle with Snapsy Events",
    subtitle: "From milestone anniversaries to VIP cocktail parties, collect every guest photo in one place instantly.",
    metaDescription: "Party photo sharing app-free with Snapsy Events. QR code sharing, live wall streaming, and instant AI photo retrieval.",
    badge: "PARTY & CELEBRATION PHOTO HUB",
    heroImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80",
    benefits: [
      {
        title: "Instant Guest Scanning",
        description: "Scan QR code at the bar or DJ booth to upload party shots without leaving the dance floor.",
        icon: QrCode,
      },
      {
        title: "Party Wall Stream",
        description: "Project guest photos live behind the DJ booth or main bar screen.",
        icon: Smartphone,
      },
      {
        title: "AI Face Search",
        description: "Guests snap a selfie to see all their party photos in under a second.",
        icon: Sparkles,
      },
      {
        title: "Private Password Protection",
        description: "Keep party photos exclusive to confirmed guests with optional passcode locks.",
        icon: Shield,
      },
    ],
    steps: [
      { number: "01", title: "Create Party Space", detail: "Launch your party gallery on Snapsy Events in under 60 seconds." },
      { number: "02", title: "Show QR Code", detail: "Place QR prints around the party venue and bar." },
      { number: "03", title: "Party Uploads", detail: "Guests snap and share unscripted party candids." },
      { number: "04", title: "Relive the Night", detail: "Download the complete party roll the next morning." },
    ],
    faq: [
      { q: "Can guests upload videos as well as photos?", a: "Yes! Snapsy Events supports short video clip uploads along with high-resolution photos." },
    ],
  },
  birthdays: {
    title: "Make Birthday Memories Unforgettable with Snapsy Events",
    subtitle: "Gather all birthday party photos from family and friends without endless texting or emailing.",
    metaDescription: "Collect birthday party photos app-free with Snapsy Events. Scan QR codes to share party candids and use AI selfie search.",
    badge: "BIRTHDAY CELEBRATIONS",
    heroImage: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80",
    benefits: [
      { title: "No App Needed", description: "Friends scan and upload birthday candids in seconds.", icon: QrCode },
      { title: "Cake Cutting Live Wall", description: "Display live photo uploads during the birthday toast.", icon: Smartphone },
      { title: "AI Guest Matching", description: "Each guest finds their birthday photos instantly.", icon: Sparkles },
      { title: "High-Res Memory Album", description: "Export the full birthday photo collection in one click.", icon: Shield },
    ],
    steps: [
      { number: "01", title: "Setup Birthday Capsule", detail: "Enter party details and theme colors." },
      { number: "02", title: "Display Birthday QR", detail: "Place QR standees on cake & gift tables." },
      { number: "03", title: "Snap & Upload", detail: "Guests upload cake cutting and dance moments." },
      { number: "04", title: "Download Collection", detail: "Save all birthday memories in high resolution." },
    ],
    faq: [
      { q: "Is Snapsy Events suitable for kids' birthday parties?", a: "Absolutely! Parents and guests can scan and upload safely with private gallery access control." },
    ],
  },
  "baby-showers": {
    title: "Capture Every Sweet Moment of Your Baby Shower",
    subtitle: "Collect precious photos from family and friends with Snapsy Events' easy QR photo sharing.",
    metaDescription: "Baby shower photo sharing made simple with Snapsy Events. App-free QR code uploads, digital guest book, and instant downloads.",
    badge: "BABY SHOWER MEMORIES",
    heroImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80",
    benefits: [
      { title: "App-Free QR Access", description: "Guests upload baby shower moments effortlessly.", icon: QrCode },
      { title: "Digital Guest Messages", description: "Collect audio voice notes and heartfelt wishes.", icon: Sparkles },
      { title: "Private Family Gallery", description: "Keep baby shower photos safe and secure.", icon: Shield },
      { title: "Instant AI Search", description: "Find individual guest photos in milliseconds.", icon: Smartphone },
    ],
    steps: [
      { number: "01", title: "Create Event", detail: "Set up your baby shower page on Snapsy Events." },
      { number: "02", title: "Place Table Cards", detail: "Print cute QR cards for game tables." },
      { number: "03", title: "Guests Share", detail: "Collect gift reveals and party games candids." },
      { number: "04", title: "Preserve Memories", detail: "Export the full photo album for the baby book." },
    ],
    faq: [
      { q: "Can we add custom message prompts for guests?", a: "Yes! Guests can add messages alongside their photo uploads." },
    ],
  },
  graduations: {
    title: "Celebrate Academic Milestones with Snapsy Events",
    subtitle: "Gather diploma handoffs, cap tosses, and family celebration photos seamlessly in one place.",
    metaDescription: "Graduation party photo sharing with Snapsy Events. QR code guest uploads, AI face matching, and high-resolution photo exports.",
    badge: "GRADUATION CELEBRATIONS",
    heroImage: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1200&q=80",
    benefits: [
      { title: "Seamless QR Sharing", description: "Graduates and guests scan to share instantly.", icon: QrCode },
      { title: "AI Cap Toss Match", description: "Find yourself in crowd photos in one click.", icon: Sparkles },
      { title: "Live Party Slideshow", description: "Stream graduation party photos live on screen.", icon: Smartphone },
      { title: "Full Resolution Export", description: "Download print-ready graduation photo archives.", icon: Shield },
    ],
    steps: [
      { number: "01", title: "Setup Gallery", detail: "Create your graduation event space on Snapsy Events." },
      { number: "02", title: "Share QR", detail: "Display QR codes at ceremony and party venues." },
      { number: "03", title: "Upload Moments", detail: "Collect cap toss and celebration candids." },
      { number: "04", title: "Download Album", detail: "Keep high-res archives of your graduation day." },
    ],
    faq: [
      { q: "Can multiple family members manage the graduation gallery?", a: "Yes! You can invite co-hosts to manage uploads and moderation." },
    ],
  },
  "photo-booth-alternative": {
    title: "The Smart Virtual Photo Booth Alternative",
    subtitle: "Transform every guest's smartphone into a digital photo booth with custom frames, stickers, and instant sharing.",
    metaDescription: "Replace bulky physical photo booths with Snapsy Events. App-free mobile photo booth experience with QR scanning, custom overlays, and AI selfie search.",
    badge: "VIRTUAL PHOTO BOOTH",
    heroImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80",
    benefits: [
      { title: "Zero Equipment Rental Costs", description: "Save thousands on physical photo booth hardware rentals and attendants.", icon: Camera },
      { title: "Custom Event Overlays", description: "Apply branded frames, event logos, and custom watermarks automatically.", icon: Shield },
      { title: "Instant QR Access", description: "Every guest holds a photo booth in their pocket everywhere at the venue.", icon: QrCode },
      { title: "AI Instant Delivery", description: "Guests receive their branded photo booth shots directly to their phone.", icon: Sparkles },
    ],
    steps: [
      { number: "01", title: "Upload Frame Overlay", detail: "Add your custom event logo overlay in Snapsy Events." },
      { number: "02", title: "Display Photo Booth QR", detail: "Place QR signs at your backdrop area." },
      { number: "03", title: "Guests Snap Props", detail: "Guests strike a pose and snap with mobile web filters." },
      { number: "04", title: "Instant Downloads", detail: "Guests download branded photos immediately." },
    ],
    faq: [
      { q: "Does Snapsy Events support custom photo overlay frames?", a: "Yes! You can upload PNG overlay frames with transparent cutouts that automatically wrap around every guest photo." },
    ],
  },
  "digital-guest-book": {
    title: "Interactive Digital Guest Book with Photos & Voice Notes",
    subtitle: "Combine candid guest photos with heartfelt written wishes and voice audio notes in one digital keepsake.",
    metaDescription: "Create a digital guest book with Snapsy Events. Collect photo messages, voice audio wishes, and QR code entries.",
    badge: "DIGITAL GUEST BOOK",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    benefits: [
      { title: "Photos + Handwritten Notes", description: "Guests attach personal stories to their uploaded candids.", icon: Sparkles },
      { title: "Voice Audio Greetings", description: "Record live voice audio wishes straight from the web browser.", icon: Smartphone },
      { title: "App-Free QR Access", description: "Guests scan the guest book table QR code to contribute.", icon: QrCode },
      { title: "Printable Memory Book Export", description: "Export your digital guest book into a publication-grade PDF keepsake.", icon: Shield },
    ],
    steps: [
      { number: "01", title: "Setup Guest Book", detail: "Activate the Digital Guest Book feature in Snapsy Events." },
      { number: "02", title: "Place Table Sign", detail: "Put QR guest book cards next to your welcome table." },
      { number: "03", title: "Collect Wishes", detail: "Guests submit photos, text wishes, and voice notes." },
      { number: "04", title: "PDF & Web Keep", detail: "Review and export your digital guest book anytime." },
    ],
    faq: [
      { q: "Can we export the guest book to print later?", a: "Yes! Snapsy Events generates a high-resolution PDF memory summary with photos and notes ready for printing." },
    ],
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = USE_CASES_DATA[slug]
  if (!data) return { title: "Use Case | Snapsy Events" }

  return {
    title: `${data.title} | Snapsy Events`,
    description: data.metaDescription,
    openGraph: {
      title: `${data.title} | Snapsy Events`,
      description: data.metaDescription,
      images: [{ url: data.heroImage }],
    },
  }
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = USE_CASES_DATA[slug]

  if (!data) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-dark text-ink font-sans selection:bg-mauve/30">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 border-b border-hairline-dark overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-mauve/15 via-transparent to-transparent" />
          <div className="mx-auto max-w-6xl grid lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-mauve bg-mauve/10 border border-mauve/20">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{data.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-playfair font-light text-ink leading-tight">
                {data.title}
              </h1>

              <p className="text-base sm:text-lg text-ink-secondary font-light leading-relaxed max-w-xl">
                {data.subtitle}
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button asChild size="lg" className="rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold px-8 shadow-lg shadow-mauve/15">
                  <Link href="/signup">
                    Get Started Free with Snapsy Events
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full border-hairline-dark hover:bg-mauve/5 text-ink font-medium px-6">
                  <Link href="/pricing">View Event Pricing</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border-4 border-hairline-dark shadow-2xl aspect-[4/3]">
                <img src={data.heroImage} alt={data.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                  <span className="text-xs font-bold text-white tracking-widest uppercase bg-mauve/80 px-3 py-1 rounded-full backdrop-blur">
                    POWERED BY SNAPSY EVENTS
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Key Benefits Grid */}
        <section className="py-20 px-6 bg-surface-card border-b border-hairline-dark">
          <div className="mx-auto max-w-6xl space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-mauve uppercase tracking-widest">WHY SNAPSY EVENTS</span>
              <h2 className="text-3xl sm:text-4xl font-playfair font-light text-ink">
                Built to elevate your event memory experience.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {data.benefits.map((benefit, idx) => {
                const IconComponent = benefit.icon
                return (
                  <div key={idx} className="bg-surface-dark p-6 rounded-3xl border border-hairline-dark space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-mauve/10 text-mauve flex items-center justify-center">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-ink">{benefit.title}</h3>
                    <p className="text-xs text-ink-secondary font-light leading-relaxed">{benefit.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Step-by-Step Flow */}
        <section className="py-20 px-6 bg-surface-dark border-b border-hairline-dark">
          <div className="mx-auto max-w-6xl space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-mauve uppercase tracking-widest">HOW SNAPSY EVENTS WORKS</span>
              <h2 className="text-3xl sm:text-4xl font-playfair font-light text-ink">
                Four effortless steps from QR scan to AI gallery.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.steps.map((step, idx) => (
                <div key={idx} className="bg-surface-card p-6 rounded-3xl border border-hairline-dark space-y-3">
                  <span className="text-xs font-extrabold text-mauve bg-mauve/10 px-3 py-1 rounded-full">
                    {step.number}
                  </span>
                  <h3 className="text-base font-bold text-ink pt-2">{step.title}</h3>
                  <p className="text-xs text-ink-secondary font-light leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-6 bg-surface-card border-b border-hairline-dark">
          <div className="mx-auto max-w-4xl space-y-10">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-mauve uppercase tracking-widest">QUESTIONS & ANSWERS</span>
              <h2 className="text-3xl sm:text-4xl font-playfair font-light text-ink">Frequently asked questions.</h2>
            </div>

            <div className="space-y-6">
              {data.faq.map((item, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-surface-dark border border-hairline-dark space-y-2 text-left">
                  <h3 className="text-base font-bold text-ink">{item.q}</h3>
                  <p className="text-xs text-ink-secondary font-light leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-surface-dark text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h2 className="text-4xl font-playfair font-light text-ink">
              Ready to launch your <span className="italic text-mauve">Snapsy Events capsule?</span>
            </h2>
            <p className="text-sm text-ink-secondary font-light max-w-lg mx-auto">
              Start your free event gallery today or choose from flexible event pricing plans.
            </p>
            <div className="pt-2">
              <Button asChild size="lg" className="rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold px-9 py-6 text-sm">
                <Link href="/signup">Create Event Now</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
