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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href={`/event/${event.slug}/upload`}>
              <Camera className="h-4 w-4" />
              Upload
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center space-y-6 max-w-2xl">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">
              {event.user?.name ?? "Event"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {event.name}
            </h1>
            <p className="text-lg text-muted-foreground">
              Photos Coming Soon
            </p>
          </div>

          <div className="py-8">
            <CountdownTimer targetDate={countdownDate} />
          </div>

          <div className="rounded-lg border bg-card p-6 text-center">
            <h2 className="font-semibold mb-2">What happens next?</h2>
            <p className="text-sm text-muted-foreground">
              Our photographer is busy capturing amazing moments. Once the gallery is ready,
              you&apos;ll be able to view and download all the photos from this event.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
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

          <div className="pt-8">
            <p className="text-sm text-muted-foreground mb-4">
              Want to be notified when photos are ready?
            </p>
            <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button>
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