import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PublicFooter } from "@/lib/components/layout/public-footer"
import { Button } from "@/lib/components/ui/button"
import { Camera, Calendar, MapPin, QrCode, Lock, Image, Upload } from "lucide-react"
import { Logo } from "@/lib/components/layout/logo"

interface EventData {
  id: string
  name: string
  slug: string
  description: string | null
  event_date: string | null
  end_date: string | null
  venue: string | null
  timezone: string
  cover_image_url: string | null
  settings: {
    is_public: boolean
    password_protected: boolean
    password?: string
    allow_guest_uploads: boolean
    enable_countdown: boolean
    countdown_date?: string
  }
  organization: {
    name: string
    branding: {
      brand_color?: string | null
      logo_url?: string | null
    }
  } | null
  galleries: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    cover_image_url: string | null
    reveal_enabled: boolean
    reveal_at: string | null
  }>
}

export async function generateMetadata({ params }: PageProps<"/event/[slug]">) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: ev } = await supabase
    .from("events")
    .select("name, description, cover_image_url")
    .eq("slug", slug)
    .single()

  if (!ev) return { title: "Event Not Found" }
  return {
    title: ev.name,
    description: ev.description ?? undefined,
    openGraph: ev.cover_image_url ? { images: [ev.cover_image_url] } : undefined,
  }
}

export default async function PublicEventPage({ params }: PageProps<"/event/[slug]">) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: ev } = await supabase
    .from("events")
    .select(`
      *,
      organization:organizations(name, branding),
      galleries(*)
    `)
    .eq("slug", slug)
    .single()

  if (!ev) notFound()

  const settings = ev.settings as EventData["settings"]
  const event = ev as unknown as EventData

  const isRevealed = !settings.enable_countdown ||
    (settings.countdown_date && new Date(settings.countdown_date) <= new Date())

  const visibleGalleries = event.galleries?.filter((g) => {
    if (!g.reveal_enabled) return true
    return g.reveal_at && new Date(g.reveal_at) <= new Date()
  }) || []

  const formatEventDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {event.organization?.branding?.logo_url ? (
              <img
                src={event.organization.branding.logo_url}
                alt={event.organization.name}
                className="h-8 w-auto"
              />
            ) : (
              <Logo />
            )}
          </Link>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/event/${event.slug}/upload`}>
                <Upload className="h-4 w-4" />
                Upload
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          {event.cover_image_url && (
            <div
              className="absolute inset-0 -z-10 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${event.cover_image_url})` }}
            />
          )}
          <div className="mx-auto max-w-5xl px-6 py-20 text-center">
            {event.organization?.branding?.logo_url && (
              <img
                src={event.organization.branding.logo_url}
                alt={event.organization.name}
                className="mx-auto mb-4 h-10"
              />
            )}
            <p className="text-sm uppercase tracking-widest text-muted-foreground">
              {event.organization?.name ?? "Event"}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              {event.name}
            </h1>
            {event.description && (
              <p className="mx-auto mt-3 max-w-2xl text-pretty text-muted-foreground">
                {event.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              {event.event_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatEventDate(event.event_date)}
                </span>
              )}
              {event.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.venue}
                </span>
              )}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {settings.allow_guest_uploads && (
                <Button asChild size="lg">
                  <Link href={`/event/${event.slug}/upload`}>
                    <Camera className="mr-2 h-4 w-4" />
                    Upload Photos
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <Link href={`/event/${event.slug}/qr`}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Get QR Code
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            {isRevealed ? "Galleries" : "Coming Soon"}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {isRevealed
              ? `${visibleGalleries.length} gallery (${visibleGalleries.reduce((acc, g) => acc, 0)} photos)`
              : "Photos will be revealed soon"}
          </p>

          {visibleGalleries.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {visibleGalleries.map((gallery) => (
                <Link
                  key={gallery.id}
                  href={`/event/${event.slug}/gallery`}
                  className="group block overflow-hidden rounded-2xl border bg-card transition hover:shadow-md"
                >
                  <div
                    className="aspect-[4/3] bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20"
                    style={
                      gallery.cover_image_url
                        ? {
                            backgroundImage: `url(${gallery.cover_image_url})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  />
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium group-hover:underline">{gallery.name}</p>
                      {gallery.description && (
                        <p className="text-xs text-muted-foreground">{gallery.description}</p>
                      )}
                    </div>
                    <Image className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">Photos Coming Soon</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                {settings.enable_countdown && settings.countdown_date
                  ? `Photos will be revealed on ${formatEventDate(settings.countdown_date)}`
                  : "Photos will be available shortly. Check back soon!"}
              </p>
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}