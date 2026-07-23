import { notFound } from "next/navigation"
import Link from "next/link"
import { Check, X, Sparkles, Shield, QrCode, ArrowRight, Smartphone } from "lucide-react"
import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { Button } from "@/lib/components/ui/button"

export const revalidate = 86400

interface ComparisonData {
  title: string
  subtitle: string
  metaDescription: string
  competitorName: string
  tableRows: { feature: string; snapsy: boolean | string; competitor: boolean | string }[]
  highlights: { title: string; detail: string }[]
}

const COMPARISONS_DATA: Record<string, ComparisonData> = {
  "all-alternatives": {
    title: "Why Snapsy Events is the #1 Choice for Event Photo Sharing",
    subtitle: "Compare Snapsy Events against traditional disposable cameras, app-download tools, and static drive uploaders.",
    metaDescription: "Comprehensive comparison of Snapsy Events versus traditional disposable cameras, GuestPix, POV Camera, and WedUploader.",
    competitorName: "Traditional Alternatives",
    tableRows: [
      { feature: "App-Free Web Browser Scanning", snapsy: true, competitor: "Requires App / Email" },
      { feature: "Sub-Second AI Face Search", snapsy: true, competitor: false },
      { feature: "Live TV Photo Wall Stream", snapsy: true, competitor: "Limited or Extra Cost" },
      { feature: "Custom Photographer Watermark", snapsy: true, competitor: false },
      { feature: "Digital Guest Book & Voice Notes", snapsy: true, competitor: false },
      { feature: "High-Resolution Uncompressed Exports", snapsy: true, competitor: "Compressed Images" },
    ],
    highlights: [
      { title: "Zero App Friction", detail: "Guests never drop off due to app store passwords or mandatory registration." },
      { title: "Instant AI Search", detail: "Guests find their individual photo memories in less than a second using AI selfie indexing." },
      { title: "Complete Privacy & Host Control", detail: "Hosts maintain password control, moderation queues, and high-res photo archives." },
    ],
  },
  "vs-pov-camera": {
    title: "Snapsy Events vs POV Camera App Comparison",
    subtitle: "See why event hosts choose Snapsy Events over app-download alternatives like POV Camera for zero-friction guest photo sharing.",
    metaDescription: "Snapsy Events vs POV Camera app comparison. Discover why app-free web QR code sharing and AI face indexing win over mobile app downloads.",
    competitorName: "POV Camera App",
    tableRows: [
      { feature: "App Store Download Required", snapsy: "No (100% Web Browser)", competitor: "Yes (Mandatory App)" },
      { feature: "Instant QR Code Guest Scan", snapsy: true, competitor: false },
      { feature: "AI Face Recognition Search", snapsy: true, competitor: false },
      { feature: "Live TV Reception Slideshow", snapsy: true, competitor: false },
      { feature: "Custom Photographer Watermarks", snapsy: true, competitor: false },
      { feature: "Uncompressed High-Res Downloads", snapsy: true, competitor: "App Compress" },
    ],
    highlights: [
      { title: "100% Guest Participation", detail: "App downloads stop older relatives and casual guests from sharing photos. Snapsy Events works on any browser without downloads." },
      { title: "AI Search vs Manual Scrolling", detail: "Instead of searching through 2,000 photos manually in an app, Snapsy Events matches face embeddings instantly." },
    ],
  },
  "vs-guestpix": {
    title: "Snapsy Events vs GuestPix Comparison",
    subtitle: "Compare features, AI capabilities, and pricing between Snapsy Events and GuestPix for weddings and corporate events.",
    metaDescription: "Snapsy Events vs GuestPix comparison. Compare instant AI face search, live photo wall streaming, and event pricing.",
    competitorName: "GuestPix",
    tableRows: [
      { feature: "AI Selfie Face Matching", snapsy: true, competitor: false },
      { feature: "App-Free QR Code Uploads", snapsy: true, competitor: true },
      { feature: "Live TV Stream Photo Wall", snapsy: true, competitor: "Basic View" },
      { feature: "Custom Branding & Watermarking", snapsy: true, competitor: "Limited Tiers" },
      { feature: "Voice Audio Greetings", snapsy: true, competitor: false },
    ],
    highlights: [
      { title: "AI Selfie Search", detail: "GuestPix relies on manual gallery scrolling. Snapsy Events lets guests take a selfie to retrieve all their photos in 1 second." },
      { title: "Live Venue Projection", detail: "Snapsy Events includes real-time live stream TV photo wall mode built into all event plans." },
    ],
  },
  "vs-weduploader": {
    title: "Snapsy Events vs WedUploader Comparison",
    subtitle: "Upgrade from static Google Drive folders to Snapsy Events' interactive AI guest photo gallery platform.",
    metaDescription: "Snapsy Events vs WedUploader. Why Snapsy Events offers a far superior guest experience with AI selfie search and live wall slideshows.",
    competitorName: "WedUploader",
    tableRows: [
      { feature: "Interactive Guest Gallery UI", snapsy: true, competitor: "Raw Drive Links" },
      { feature: "AI Face Recognition Search", snapsy: true, competitor: false },
      { feature: "Live Screen TV Slideshow", snapsy: true, competitor: false },
      { feature: "Custom Watermarking", snapsy: true, competitor: false },
      { feature: "Digital Guest Book & Voice Notes", snapsy: true, competitor: false },
    ],
    highlights: [
      { title: "Beautiful Memory Experience", detail: "WedUploader dumps photos into plain folders. Snapsy Events creates a luxury interactive gallery presentation." },
      { title: "AI Speed", detail: "Snapsy Events indexes all uploaded photos so guests find their moments instantly." },
    ],
  },
  "vs-once-film": {
    title: "Snapsy Events vs Once Film App Comparison",
    subtitle: "Why Snapsy Events delivers 10x higher guest participation without app store downloads or mandatory registration.",
    metaDescription: "Snapsy Events vs Once Film app comparison. Compare web browser QR photo sharing and instant AI face matching.",
    competitorName: "Once Film App",
    tableRows: [
      { feature: "App Store Download Required", snapsy: "No (100% Web)", competitor: "Yes" },
      { feature: "AI Face Matching", snapsy: true, competitor: false },
      { feature: "Live TV Photo Wall", snapsy: true, competitor: false },
      { feature: "Watermark Protection", snapsy: true, competitor: false },
    ],
    highlights: [
      { title: "Zero Download Barrier", detail: "Once Film forces every guest to install an app. Snapsy Events works instantly through Safari and Chrome." },
    ],
  },
  "vs-disposable-cameras": {
    title: "Snapsy Events vs Physical Disposable Cameras",
    subtitle: "Save $1,500+ on single-use plastic cameras and film developing costs with Snapsy Events.",
    metaDescription: "Snapsy Events vs Disposable Cameras. Save money, eliminate developing delays, and get 10x higher photo quality.",
    competitorName: "Physical Disposable Cameras",
    tableRows: [
      { feature: "Cost for 100 Guests", snapsy: "Flat Event Plan", competitor: "$1,200+ (Cameras + Film)" },
      { feature: "Photo Quality & Lighting", snapsy: "High-Res Smartphone HD", competitor: "Dark Grainy Flash" },
      { feature: "Instant Morning-After Delivery", snapsy: true, competitor: "Weeks Developing Delay" },
      { feature: "AI Selfie Search", snapsy: true, competitor: false },
      { feature: "Eco-Friendly & Zero Waste", snapsy: true, competitor: "Plastic Waste" },
    ],
    highlights: [
      { title: "Massive Cost Savings", detail: "Physical disposable cameras cost $20 each plus $15 film developing fees per camera. Snapsy Events saves up to 90% of event costs." },
      { title: "Instant Photo Viewing", detail: "Don't wait weeks for blurry dark prints. Enjoy crisp high-resolution photo galleries the next morning." },
    ],
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = COMPARISONS_DATA[slug]
  if (!data) return { title: "Compare | Snapsy Events" }

  return {
    title: `${data.title} | Snapsy Events`,
    description: data.metaDescription,
  }
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = COMPARISONS_DATA[slug]

  if (!data) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-dark text-ink font-sans selection:bg-mauve/30">
      <PublicNavbar />

      <main className="flex-1">
        {/* Header Section */}
        <section className="relative py-20 px-6 border-b border-hairline-dark overflow-hidden text-center">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-mauve/15 via-transparent to-transparent" />
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-mauve bg-mauve/10 border border-mauve/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SNAPSY EVENTS COMPARISON MATRIX</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-playfair font-light text-ink leading-tight">
              {data.title}
            </h1>

            <p className="text-base sm:text-lg text-ink-secondary font-light max-w-2xl mx-auto leading-relaxed">
              {data.subtitle}
            </p>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-20 px-6 bg-surface-card border-b border-hairline-dark">
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-mauve uppercase tracking-widest">SIDE-BY-SIDE FEATURE MATRIX</span>
              <h2 className="text-3xl sm:text-4xl font-playfair font-light text-ink">
                Snapsy Events vs {data.competitorName}
              </h2>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-hairline-dark bg-surface-dark shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-hairline-dark bg-mauve/5">
                    <th className="p-6 text-sm font-bold text-ink">Feature / Capability</th>
                    <th className="p-6 text-sm font-bold text-mauve">Snapsy Events</th>
                    <th className="p-6 text-sm font-bold text-ink-secondary">{data.competitorName}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-dark text-xs sm:text-sm">
                  {data.tableRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-mauve/5 transition-colors">
                      <td className="p-6 font-semibold text-ink">{row.feature}</td>
                      <td className="p-6 font-bold text-mauve">
                        {typeof row.snapsy === "boolean" ? (
                          row.snapsy ? <Check className="h-5 w-5 text-mauve" /> : <X className="h-5 w-5 text-red-400" />
                        ) : (
                          row.snapsy
                        )}
                      </td>
                      <td className="p-6 text-ink-secondary">
                        {typeof row.competitor === "boolean" ? (
                          row.competitor ? <Check className="h-5 w-5 text-emerald-400" /> : <X className="h-5 w-5 text-red-400" />
                        ) : (
                          row.competitor
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Key Highlights */}
        <section className="py-20 px-6 bg-surface-dark border-b border-hairline-dark">
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-mauve uppercase tracking-widest">WHY SNAPSY EVENTS WINS</span>
              <h2 className="text-3xl sm:text-4xl font-playfair font-light text-ink">Key advantages for your event.</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {data.highlights.map((h, idx) => (
                <div key={idx} className="bg-surface-card p-6 rounded-3xl border border-hairline-dark space-y-3">
                  <div className="h-10 w-10 rounded-2xl bg-mauve/10 text-mauve flex items-center justify-center font-bold">
                    0{idx + 1}
                  </div>
                  <h3 className="text-base font-bold text-ink">{h.title}</h3>
                  <p className="text-xs text-ink-secondary font-light leading-relaxed">{h.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-surface-card text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h2 className="text-4xl font-playfair font-light text-ink">
              Experience the <span className="italic text-mauve">Snapsy Events difference.</span>
            </h2>
            <p className="text-sm text-ink-secondary font-light max-w-lg mx-auto">
              Create your event gallery today with zero app downloads and instant AI face matching.
            </p>
            <div className="pt-2">
              <Button asChild size="lg" className="rounded-full bg-mauve hover:bg-mauve-strong text-[#faf6ed] font-semibold px-9 py-6 text-sm">
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
