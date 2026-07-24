import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/lib/components/ui/button"
import { Camera, Calendar, Clock, Mail } from "lucide-react"
import { Logo } from "@/lib/components/layout/logo"
import { CountdownTimer } from "./countdown-timer"

interface EventData {
  id: string
  name: string
  slug: string
  event_date: string | null
  settings: {
    enable_countdown: boolean
    countdown_date: string
  }
  user: {
    name: string
  } | null
}

export async function generateMetadata({ params }: PageProps<"/event/[slug]/countdown">) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: ev } = await supabase
    .from("events")
    .select("name, settings")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (!ev) return { title: "Event Not Found" }
  return { title: `${ev.name} - Photos Coming Soon` }
}

export default async function CountdownPage({ params }: PageProps<"/event/[slug]/countdown">) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: ev } = await supabase
    .from("events")
    .select(`
      *,
      host:users(full_name)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (!ev) notFound()

  const hostData = ev.host ? {
    name: ev.host.full_name
  } : null

  const event = {
    ...ev,
    user: hostData
  } as unknown as EventData
  const settings = event.settings
  const countdownDate = settings.countdown_date

  if (!settings.enable_countdown || !countdownDate) {
    redirect(`/event/${slug}`)
  }

  if (new Date(countdownDate) <= new Date()) {
    redirect(`/event/${slug}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-dark text-ink">
      <header className="pt-safe sticky top-0 z-50 w-full border-b border-hairline-dark bg-surface-dark/95 backdrop-blur supports-[backdrop-filter]:bg-surface-dark/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <Button
            asChild
            size="sm"
            className="rounded-full border border-ink/15 bg-transparent text-ink hover:bg-mauve/10 hover:text-mauve"
          >
            <Link href={`/event/${event.slug}/upload`}>
              <Camera className="h-4 w-4" />
              Upload
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center space-y-6 max-w-2xl">
          {/* Server Component hero — can't reach for Framer Motion hooks here,
              so the staggered entrance is pure CSS (existing keyframe
              utilities + .animate-delay-* steps from globals.css), same
              pattern as event/[slug]/page.tsx's hero section. */}
          <div className="animate-slide-up flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ink/5">
              <Clock className="h-10 w-10 text-mauve" />
            </div>
          </div>

          <div className="animate-slide-up animate-delay-1 space-y-2">
            <p className="text-sm uppercase tracking-widest text-mauve">
              {event.user?.name ?? "Event"}
            </p>
            <h1 className="font-playfair text-3xl font-medium tracking-tight text-ink md:text-4xl">
              {event.name}
            </h1>
            <p className="text-lg text-ink-secondary">
              Photos Coming Soon
            </p>
          </div>

          <div className="animate-slide-up animate-delay-2 py-8">
            <CountdownTimer targetDate={countdownDate} />
          </div>

          <div className="animate-slide-up animate-delay-3 rounded-2xl border border-hairline-dark bg-surface-card p-6 text-center">
            <h2 className="font-playfair font-medium text-ink mb-2">What happens next?</h2>
            <p className="text-sm text-ink-secondary">
              Our photographer is busy capturing amazing moments. Once the gallery is ready,
              you&apos;ll be able to view and download all the photos from this event.
            </p>
          </div>

          <div className="animate-slide-up animate-delay-3 flex flex-wrap items-center justify-center gap-4 text-sm text-ink-secondary">
            {event.event_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(event.event_date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          <div className="animate-slide-up animate-delay-4 pt-8">
            <p className="text-sm text-ink-secondary mb-4">
              Want to be notified when photos are ready?
            </p>
            <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email address"
                className="flex h-10 w-full rounded-full border border-hairline-dark bg-surface-card px-4 py-2 text-sm text-ink ring-offset-background placeholder:text-ink-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve focus-visible:ring-offset-2"
              />
              <Button className="rounded-full bg-mauve text-[#1a1410] hover:bg-mauve-strong">
                <Mail className="h-4 w-4" />
                Notify Me
              </Button>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}