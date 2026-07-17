import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/lib/components/ui/button"
import { Camera, Calendar, MapPin, QrCode, Lock, Image, Upload } from "lucide-react"
import { Logo } from "@/lib/components/layout/logo"
import { GuestCaptureModal } from "@/lib/components/events/guest-capture-modal"
import { hasGuestSessionSSR } from "@/lib/security/guest-session"

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
  user: {
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
    photo_count: number
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
      host:users(full_name, avatar_url, preferences),
      galleries(*)
    `)
    .eq("slug", slug)
    .single()

  if (!ev) notFound()

  // events.view_count was read on the dashboard but nothing ever incremented
  // it, so every event permanently showed "0 views" regardless of real guest
  // traffic. Bump it on each page load — best-effort, never allowed to break
  // the page if it fails (matches the same non-atomic read-then-write the
  // existing blog post view counter uses).
  try {
    await supabase
      .from("events")
      .update({ view_count: (ev.view_count ?? 0) + 1 })
      .eq("id", ev.id)
  } catch {
    // View counting is best-effort; a failure here must never break the page.
  }

  const hostData = ev.host ? {
    name: ev.host.full_name,
    branding: (ev.host.preferences?.branding as any) || {}
  } : null

  const settings = ev.settings as EventData["settings"]
  const event = {
    ...ev,
    user: hostData
  } as unknown as EventData

  const isRevealed = (settings as any).photo_reveal_mode === "instant" ||
    (settings as any).reveal_type === "instant" ||
    (settings as any).reveal_experience === "immediately" ||
    (settings as any).reveal_experience === "during_event" ||
    !settings.enable_countdown ||
    (settings.countdown_date && new Date(settings.countdown_date) <= new Date())

  // Real, server-checked gate — replaces what used to be a purely cosmetic
  // check-in popup. Until a guest has actually completed check-in (see
  // src/app/actions/guest.ts), they don't get gallery links or an upload
  // entry point from this page, and the upload/react API routes reject them
  // even if they reach those URLs directly.
  const checkedIn = await hasGuestSessionSSR(event.id)

  const visibleGalleries = event.galleries?.filter((g) => {
    if (
      (settings as any).photo_reveal_mode === "instant" ||
      (settings as any).reveal_type === "instant" ||
      (settings as any).reveal_experience === "immediately" ||
      (settings as any).reveal_experience === "during_event"
    ) return true
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
    <div className="flex min-h-screen flex-col bg-[#141110] text-white/90">
      <GuestCaptureModal eventId={event.id} eventName={event.name} />

      <header className="sticky top-0 z-50 w-full border-b border-[#3D332A] bg-[#141110]/95 backdrop-blur supports-[backdrop-filter]:bg-[#141110]/80">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {event.user?.branding?.logo_url ? (
              <img
                src={event.user.branding.logo_url}
                alt={event.user.name}
                className="h-8 w-auto"
              />
            ) : (
              <Logo />
            )}
          </Link>
          <div className="flex items-center gap-4">
            {checkedIn && (
              <Button
                asChild
                size="sm"
                className="rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-[#D4AF37]"
              >
                <Link href={`/event/${event.slug}/upload`}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[#3D332A]">
          {event.cover_image_url && (
            <div
              className="absolute inset-0 -z-20 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${event.cover_image_url})` }}
            />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#141110]/30 via-[#141110]/70 to-[#141110]" />
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
            {event.user?.branding?.logo_url && (
              <img
                src={event.user.branding.logo_url}
                alt={event.user.name}
                className="mx-auto mb-4 h-10"
              />
            )}
            <p className="text-sm uppercase tracking-widest text-[#D4AF37]">
              {event.user?.name ?? "Event"}
            </p>
            <h1 className="font-playfair mt-2 text-4xl font-medium tracking-tight text-white sm:text-5xl">
              {event.name}
            </h1>
            {event.description && (
              <p className="mx-auto mt-3 max-w-2xl text-pretty text-white/60">
                {event.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-white/60">
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
              {settings.allow_guest_uploads && checkedIn && (
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-[#D4AF37] px-6 text-[#141110] hover:bg-[#c4a233]"
                >
                  <Link href={`/event/${event.slug}/upload`}>
                    <Camera className="mr-2 h-4 w-4" />
                    Upload Photos
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={`/event/${event.slug}/qr`}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Get QR Code
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="font-playfair text-2xl font-medium tracking-tight text-white">
            {!checkedIn ? "Private Memory Capsule" : isRevealed ? "Galleries" : "Coming Soon"}
          </h2>
          <p className="mt-1 text-white/60">
            {!checkedIn
              ? "Check in above with your name and contact details to view and share photos."
              : isRevealed
              ? `${visibleGalleries.length} gallery (${visibleGalleries.reduce((acc, g) => acc + (g.photo_count ?? 0), 0)} photos)`
              : "Photos will be revealed soon"}
          </p>

          {!checkedIn ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-[#3D332A] bg-[#1C1814] px-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                <Lock className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-playfair mt-4 text-lg font-medium text-white">Check In to Continue</h3>
              <p className="mt-2 max-w-md text-sm text-white/60">
                This event is private to invited guests. Complete the check-in above to view galleries and share your own photos.
              </p>
            </div>
          ) : visibleGalleries.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {visibleGalleries.map((gallery) => (
                <Link
                  key={gallery.id}
                  href={`/event/${event.slug}/g/${gallery.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-[#3D332A] bg-[#1C1814] transition hover:border-[#D4AF37]/40 hover:shadow-lg hover:shadow-black/30"
                >
                  <div
                    className="aspect-[4/3] bg-gradient-to-br from-[#D4AF37]/20 to-[#3D332A]/60"
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
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white group-hover:text-[#D4AF37] group-hover:underline">{gallery.name}</p>
                      {gallery.description && (
                        <p className="truncate text-xs text-white/60">{gallery.description}</p>
                      )}
                    </div>
                    <Image className="h-5 w-5 shrink-0 text-white/40" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-[#3D332A] bg-[#1C1814] px-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                <Lock className="h-8 w-8 text-[#D4AF37]" />
              </div>
              <h3 className="font-playfair mt-4 text-lg font-medium text-white">Photos Coming Soon</h3>
              <p className="mt-2 max-w-md text-sm text-white/60">
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