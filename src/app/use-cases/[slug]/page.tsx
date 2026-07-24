import Link from "next/link"
import { Sparkles, QrCode, Shield, Check, ArrowRight, Camera, Smartphone, Layers, Image as ImageIcon } from "lucide-react"
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
      { title: "100% App-Free QR Access", description: "Guests point their camera at table QR cards to open your private Snapsy Events wedding portal instantly in Safari or Chrome.", icon: QrCode },
      { title: "Instant AI Selfie Matching", description: "Guests take a quick selfie to immediately filter and download every photo they appear in across thousands of wedding pictures.", icon: Sparkles },
      { title: "Live TV Reception Slideshow", description: "Stream guest photos live on reception screens or projectors as your loved ones snap and upload them throughout the evening.", icon: Smartphone },
      { title: "High-Res Original Downloads", description: "Preserve full-resolution uncompressed photo downloads for print albums, memory books, and high-definition keepsakes.", icon: Shield },
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
  "wedding-photo-app": {
    title: "The #1 Web-Based Wedding Photo App",
    subtitle: "Give your guests the easiest wedding photo app experience — zero App Store downloads required with Snapsy Events.",
    metaDescription: "Discover why Snapsy Events is the top wedding photo web app. No app store downloads, QR table cards, and instant AI selfie search.",
    badge: "WEDDING PHOTO APP",
    heroImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80",
    benefits: [
      { title: "Works on Any Smartphone", description: "Compatible with iPhone and Android browsers out of the box.", icon: Smartphone },
      { title: "AI Face Recognition", description: "Index thousands of wedding photos in milliseconds.", icon: Sparkles },
      { title: "Custom Watermarking", description: "Protect photographer preview images with brand logos.", icon: Shield },
      { title: "Live Venue Slideshow", description: "Project live reception uploads on venue screens.", icon: QrCode },
    ],
    steps: [
      { number: "01", title: "Initialize App", detail: "Set up your wedding space on Snapsy Events." },
      { number: "02", title: "Generate QR", detail: "Place QR banners at the entrance and reception tables." },
      { number: "03", title: "Live Uploads", detail: "Guests upload raw unscripted wedding candids." },
      { number: "04", title: "AI Photo Gallery", detail: "Guests find their photos using AI selfie indexing." },
    ],
    faq: [
      { q: "Why choose web app over an App Store app?", a: "App Store downloads create friction for older guests and low-battery phones. Web apps load instantly in 1 second via QR codes." },
    ],
  },
  "wedding-disposable-cameras": {
    title: "Digital Disposable Cameras for Weddings",
    subtitle: "Recreate the nostalgia of wedding disposable cameras on your guests' smartphones with Snapsy Events.",
    metaDescription: "Digital disposable camera experience for weddings. App-free QR photo uploads, custom shot limits, timed photo reveals by Snapsy Events.",
    badge: "WEDDING DISPOSABLE CAMERAS",
    heroImage: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1200&q=80",
    benefits: [
      { title: "Save $1,000+ on Film", description: "No film developing fees or lost disposable camera rolls.", icon: Camera },
      { title: "Timed Morning Reveal", description: "Reveal all guest photos the next morning for maximum surprise.", icon: Sparkles },
      { title: "Custom Shot Limits", description: "Set 10 or 25 shots per guest to preserve the vintage disposable camera thrill.", icon: Smartphone },
      { title: "High Resolution Output", description: "Enjoy clear HD photos instead of dark, grainy disposable camera prints.", icon: Shield },
    ],
    steps: [
      { number: "01", title: "Configure Camera Roll", detail: "Set reveal dates and shot limits in Snapsy Events." },
      { number: "02", title: "Distribute QR Standees", detail: "Place vintage digital disposable camera QR cards on reception tables." },
      { number: "03", title: "Guests Snap Away", detail: "Guests snap photos through their phone browser camera." },
      { number: "04", title: "Morning-After Reveal", detail: "All photos unlock simultaneously for guests to view." },
    ],
    faq: [
      { q: "Can we print the digital disposable camera photos?", a: "Yes! All photos are saved in full high resolution ready for physical album printing." },
    ],
  },
  "wedding-qr-code": {
    title: "Wedding QR Code Photo Sharing Made Simple",
    subtitle: "Place custom wedding QR codes on tables and signs for instant app-free guest photo uploads with Snapsy Events.",
    metaDescription: "Generate custom wedding QR codes for photo sharing with Snapsy Events. High-resolution SVG print designs, instant scanning, and AI photo match.",
    badge: "WEDDING QR CODE SHARING",
    heroImage: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80",
    benefits: [
      { title: "High-Res SVG & PNG Exports", description: "Download vector QR code files for sign printing and invitations.", icon: QrCode },
      { title: "Instant Safari & Chrome Launch", description: "Scans open directly into the uploader without app downloads.", icon: Smartphone },
      { title: "Real-Time Scan Analytics", description: "Track how many guests scan and upload photos in real time.", icon: Sparkles },
      { title: "Custom Theme Matching", description: "Match QR cards to your wedding stationery colors.", icon: Shield },
    ],
    steps: [
      { number: "01", title: "Generate Vector QR", detail: "Create high-res SVG codes in Snapsy Events." },
      { number: "02", title: "Print Table Signs", detail: "Add QR codes to table numbers, bar menus, and welcome signs." },
      { number: "03", title: "Guests Scan & Upload", detail: "Guests point phone cameras to upload instantly." },
      { number: "04", title: "AI Photo Search", detail: "Guests scan selfie QR to find all their photos." },
    ],
    faq: [
      { q: "What format are the QR codes provided in?", a: "Snapsy Events provides high-resolution SVG and PNG formats suitable for professional print shops." },
    ],
  },
  "wedding-photo-sharing": {
    title: "The Ultimate Wedding Photo Sharing Platform",
    subtitle: "Replace group chats and forgotten hashtags. Snapsy Events gives your guests a beautiful shared wedding gallery in seconds.",
    metaDescription: "Discover how Snapsy Events simplifies wedding photo sharing. Real-time guest uploads, custom branding, and instant AI face matching.",
    badge: "WEDDING PHOTO SHARING",
    heroImage: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80",
    benefits: [
      { title: "Unified Family Gallery", description: "Gather photos from ceremony, cocktail hour, reception, and afterparty into one gallery.", icon: Layers },
      { title: "Custom Photographer Watermarks", description: "Protect photographer preview images with custom watermarks before full resolution delivery.", icon: Shield },
      { title: "Zero Compression Loss", description: "Unlike social media apps, Snapsy Events retains maximum image quality for professional printing.", icon: Camera },
      { title: "AI Face Recognition", description: "Let guests find all their photos effortlessly without endless manual scrolling.", icon: Sparkles },
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
  "photography-ideas": {
    title: "Creative Wedding & Event Photography Ideas",
    subtitle: "Inquire guest perspective photo ideas, sparkler exits, candid table moments, and live reception streams with Snapsy Events.",
    metaDescription: "Inspirational wedding and event photography ideas. Learn how Snapsy Events captures unscripted guest moments with QR codes and AI search.",
    badge: "PHOTOGRAPHY INSPIRATION",
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    benefits: [
      { title: "Unscripted Table Candids", description: "Capture laughing reactions and behind-the-scenes moments.", icon: Camera },
      { title: "Sparkler Exit Live Stream", description: "Stream late-night sparkler exits live on venue screens.", icon: Smartphone },
      { title: "Guest Perspective Views", description: "See what your guests saw from every angle of the room.", icon: Sparkles },
      { title: "Watermarked Previews", description: "Safeguard official photographer previews.", icon: Shield },
    ],
    steps: [
      { number: "01", title: "Plan Shots", detail: "Set up photo prompts and inspiration guides for guests." },
      { number: "02", title: "Place QR Cards", detail: "Distribute table cards with creative photo prompts." },
      { number: "03", title: "Collect Shots", detail: "Guests snap candids matching your inspiration." },
      { number: "04", title: "AI Organization", detail: "Sort photos by category and guest faces automatically." },
    ],
    faq: [
      { q: "Can we add photo prompt suggestions for guests?", a: "Yes! Snapsy Events allows you to add fun photo challenges and prompts on the guest uploader page." },
    ],
  },
  "destination-weddings": {
    title: "Photo Sharing for Destination Weddings",
    subtitle: "Collect photos across multi-day destination wedding itineraries — welcome dinners, beach days, and reception galas with Snapsy Events.",
    metaDescription: "Destination wedding photo sharing app-free with Snapsy Events. Multi-day event galleries, QR code access, and AI selfie match.",
    badge: "DESTINATION WEDDINGS",
    heroImage: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80",
    benefits: [
      { title: "Multi-Day Event Support", description: "Create separate sub-galleries for welcome cocktails, beach day, and wedding ceremony.", icon: Layers },
      { title: "No International Data App Install", description: "Guests upload over venue Wi-Fi via browser without downloading apps.", icon: QrCode },
      { title: "Global Cloud Backup", description: "All destination wedding photos backed up securely in multi-region storage.", icon: Shield },
      { title: "AI Selfie Retrieval", description: "Traveling guests find their photos in seconds.", icon: Sparkles },
    ],
    steps: [
      { number: "01", title: "Setup Destination Capsule", detail: "Configure welcome party, wedding day, and farewell brunch sub-galleries." },
      { number: "02", title: "Provide Welcome QR Cards", detail: "Include QR cards in guest welcome bags upon arrival." },
      { number: "03", title: "Upload Throughout Trip", detail: "Guests upload memories across the entire destination itinerary." },
      { number: "04", title: "Global Photo Export", detail: "Download full resolution master zip files." },
    ],
    faq: [
      { q: "Does Snapsy Events work internationally?", a: "Yes! Snapsy Events operates globally across any smartphone connected to Wi-Fi or cellular networks." },
    ],
  },
  "corporate-events": {
    title: "Real-Time Photo Sharing for Corporate Summits & Galas",
    subtitle: "Drive brand engagement and capture executive keynotes, team retreats, and award nights with Snapsy Events.",
    metaDescription: "Streamline corporate event photography with Snapsy Events. Branded QR portals, real-time photo walls, custom logo watermarks, and instant AI attendance gallery delivery.",
    badge: "CORPORATE EVENT SOLUTIONS",
    heroImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&q=80",
    benefits: [
      { title: "Branded QR Portal", description: "Customize the web uploader with corporate logo marks, brand color schemes, and sponsor watermarks.", icon: Shield },
      { title: "Live Keynote Stage Projection", description: "Stream attendee photos and team moments live on stage LED screens during gala dinners.", icon: Smartphone },
      { title: "Enterprise Access Controls", description: "Protect sensitive corporate retreats with passcodes, domain restrictions, and SSO integration.", icon: Layers },
      { title: "AI Attendee Gallery Delivery", description: "Allow attendees to find their networking photos instantly with high-speed AI face matching.", icon: Sparkles },
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
}

function getFallbackData(slug: string): UseCaseData {
  const formattedTitle = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

  return {
    title: `${formattedTitle} | Snapsy Events`,
    subtitle: `Discover how Snapsy Events elevates ${formattedTitle.toLowerCase()} with app-free QR code photo sharing, AI face search, and live venue streams.`,
    metaDescription: `Learn how Snapsy Events simplifies ${formattedTitle.toLowerCase()}. Instant QR code uploads, custom watermarks, and AI selfie matching.`,
    badge: formattedTitle.toUpperCase(),
    heroImage: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    benefits: [
      { title: "100% App-Free QR Access", description: "Guests scan table QR codes to upload photos directly in Safari or Chrome without downloading apps.", icon: QrCode },
      { title: "Instant AI Selfie Match", description: "Guests take a quick selfie to filter and retrieve every photo they appear in within 1 second.", icon: Sparkles },
      { title: "Live TV Photo Wall Stream", description: "Stream guest photos live on venue screens as your loved ones snap and upload them in real time.", icon: Smartphone },
      { title: "Custom Brand & Watermarks", description: "Protect your photos with custom watermarks, event branding, and password security controls.", icon: Shield },
    ],
    steps: [
      { number: "01", title: "Setup Event Capsule", detail: "Set up your event date, venue, custom subdomain, and branding in Snapsy Events." },
      { number: "02", title: "Place QR Cards", detail: "Print high-resolution QR cards for tables, entrances, and digital screens." },
      { number: "03", title: "Guests Snap & Share", detail: "Guests scan QR codes to upload photos, short videos, and messages instantly." },
      { number: "04", title: "AI Photo Search", detail: "Guests use AI selfie matching to find and download all their photos in seconds." },
    ],
    faq: [
      { q: "Do guests need to download an app?", a: "No! Snapsy Events operates entirely in the mobile web browser. Guests scan the QR code and upload photos in seconds without downloading anything." },
      { q: "Can we download high-resolution photos?", a: "Yes! Snapsy Events preserves full-resolution uncompressed photo downloads for all host archives." },
    ],
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = USE_CASES_DATA[slug] || getFallbackData(slug)

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
  const data = USE_CASES_DATA[slug] || getFallbackData(slug)

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
                <Button asChild size="lg" className="rounded-full bg-mauve hover:bg-mauve-strong text-[#1a1410] font-semibold px-8 shadow-lg shadow-mauve/15">
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
                const IconComponent = benefit.icon || Sparkles
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
              <Button asChild size="lg" className="rounded-full bg-mauve hover:bg-mauve-strong text-[#1a1410] font-semibold px-9 py-6 text-sm">
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
