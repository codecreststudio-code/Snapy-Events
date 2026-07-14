import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/lib/hooks/query-provider"
import { AuthProvider } from "@/lib/hooks/use-auth"
import { TooltipProvider } from "@/lib/components/ui/tooltip"
import { CurrencyProvider } from "@/lib/context/currency-context"

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
    icon: "/Favicon.png",
    shortcut: "/Favicon.png",
    apple: "/Favicon.png",
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts origins to eliminate DNS/TCP overhead */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${inter.className}`} suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <CurrencyProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </CurrencyProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}