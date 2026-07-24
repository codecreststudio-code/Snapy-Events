import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display, DM_Sans } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/lib/hooks/query-provider"
import { AuthProvider } from "@/lib/hooks/use-auth"
import { TooltipProvider } from "@/lib/components/ui/tooltip"
import { CurrencyProvider } from "@/lib/context/currency-context"
import { PwaProvider } from "@/lib/pwa/pwa-provider"

// Apple splash screens (public/splash/*.png, generated alongside the icon
// set) — Apple still requires static <link rel="apple-touch-startup-image">
// entries with device-specific media queries; there's no manifest-driven
// equivalent to iOS's native splash screen the way Android has one. Not
// exhaustive of every historical device, just current-gen iPhone/iPad sizes;
// see the icon-generation script for how to add more.
const appleSplashScreens: Array<{ url: string; media: string }> = [
  { url: "/splash/iphone-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
  { url: "/splash/iphone-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/iphone-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/iphone-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/iphone-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/iphone-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
  { url: "/splash/ipad-1668x2388.png", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
  { url: "/splash/ipad-2048x2732.png", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
]

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "Snapsy - Event Photography Platform",
  description: "The complete event photography platform for hosts and guests. Create events, generate QR codes, manage galleries, and leverage AI-powered face search.",
  keywords: ["event photography", "photo sharing", "QR codes", "gallery", "face search"],
  authors: [{ name: "Snapsy" }],
  openGraph: {
    title: "Snapsy - Event Photography Platform",
    description: "The complete event photography platform for hosts and guests.",
    type: "website",
    locale: "en_US",
    siteName: "Snapy",
  },
  icons: {
    // Real square icon set (see public/icons/, generated from the brand
    // mark) — replaces the previous single non-square Favicon.png reference,
    // which rendered squished/cropped as a home-screen or browser tab icon.
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152" },
      { url: "/icons/apple-touch-icon-167.png", sizes: "167x167" },
    ],
    other: appleSplashScreens.map((s) => ({ rel: "apple-touch-startup-image", url: s.url, media: s.media })),
  },
  // Standalone/home-screen behavior for iOS Safari (Android/desktop take
  // their cues from manifest.ts's display:"standalone" instead).
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Snapsy",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#080808",
    "msapplication-config": "/browserconfig.xml",
  },
  twitter: {
    card: "summary_large_image",
    title: "Snapsy - Event Photography Platform",
    description: "The complete event photography platform for hosts and guests.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "QT_hUkLEcniarABR7a55mEDIeYyQd8HE-DursoIPuZs",
  },
}

// Next 14+ requires themeColor/colorScheme/viewport in a dedicated export
// rather than inside `metadata` (which now warns/ignores them there).
// viewportFit: "cover" + the safe-area-inset padding already used across
// the guest camera/upload UI (env(safe-area-inset-*)) is what makes the
// installed app draw correctly behind the iPhone notch/Dynamic Island and
// Android's gesture bar instead of leaving black bars.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
}

import { Toaster } from "@/lib/components/ui/toaster"
import { SmoothScrollProvider } from "@/lib/components/layout/smooth-scroll-provider"
import { MicrosoftClarity } from "@/lib/components/analytics/microsoft-clarity"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Scene",
    "operatingSystem": "All",
    "applicationCategory": "MultimediaApplication",
    "url": "https://scenedisposable.com",
    "description": "Disposable Camera App for Events & Weddings — Scene. Create events, generate QR codes, snap live guest photos, manage galleries, and share memories.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "1280",
    },
  }

  return (
    <html lang="en" suppressHydrationWarning className="dark selection:bg-white/20 selection:text-white">
      <head>
        {/* Preconnect to Google Fonts origins to eliminate DNS/TCP overhead */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${dmSans.variable} ${inter.variable} ${dmSans.className} bg-[#000000] text-[#fefefe] antialiased selection:bg-white/20 selection:text-white`} suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <CurrencyProvider>
              <TooltipProvider>
                <SmoothScrollProvider>
                  <PwaProvider>
                    <MicrosoftClarity />
                    {children}
                    <Toaster />
                  </PwaProvider>
                </SmoothScrollProvider>
              </TooltipProvider>
            </CurrencyProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}