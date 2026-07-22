import Link from "next/link"
import { WifiOff } from "lucide-react"
import { Logo } from "@/lib/components/layout/logo"

// Served by the service worker (public/sw.js) as the fallback for any
// navigation that fails while offline, except "/" itself which the SW
// serves from its own precache. Kept as a plain Server Component with no
// data fetching — it must render correctly with zero network access.
export const metadata = {
  title: "You're offline - Snapsy",
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#141110] px-6 text-center text-white">
      <Logo />
      <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
        <WifiOff className="h-8 w-8 text-[#B28DAE]" />
      </div>
      <h1 className="font-playfair mt-6 text-2xl font-medium text-white">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-white/60">
        This page needs an internet connection. Check your network and try again — anything you were
        uploading will still be there when you&apos;re back online.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-[#B28DAE] px-6 py-3 text-sm font-bold text-[#141110] transition-transform hover:scale-[1.02] hover:bg-[#a468a0] active:scale-[0.98]"
      >
        Back to Home
      </Link>
    </div>
  )
}
