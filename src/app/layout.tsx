import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/lib/hooks/query-provider"
import { AuthProvider } from "@/lib/hooks/use-auth"
import { TooltipProvider } from "@/lib/components/ui/tooltip"

const inter = Inter({ subsets: ["latin"] })

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
    siteName: "Snapsy",
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
      <body className={inter.className} suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}