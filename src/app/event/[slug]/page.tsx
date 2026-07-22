import { PublicNavbar, PublicFooter } from "@/lib/components/layout"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/lib/components/ui/button"
import { Camera, Calendar, MapPin, QrCode, Lock, Upload } from "lucide-react"
import { Logo } from "@/lib/components/layout/logo"
import { GuestCaptureModal } from "@/lib/components/events/guest-capture-modal"
import { hasGuestSessionSSR } from "@/lib/security/guest-session"
import { publicUrl } from "@/lib/integrations/storage"
import { getFeatureFlags } from "@/lib/platform-settings"
import { MediaGrid, type GridPhoto } from "@/lib/components/media/media-grid"
import { GuestFaceSearchButton } from "@/lib/components/guest/guest-face-search-button"
import { pickBestShots } from "@/lib/integrations/quality-score"

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
    // Host toggle (Event Settings -> Capsule Locks & Limits) — when true,
    // GuestCaptureModal requires the event's join_code before check-in can
    // succeed (enforced server-side in src/app/actions/guest.ts).
    require_join_code?: boolean
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

  const revealMode = String(
    (settings as any)?.photo_reveal_mode ||
    (settings as any)?.reveal_type ||
    (settings as any)?.reveal_experience ||
    ""
  ).toLowerCase()

  const isRevealed =
    revealMode.includes("instant") ||
    revealMode.includes("immediately") ||
    revealMode.includes("during") ||
    !settings?.enable_countdown ||
    (settings?.countdown_date && new Date(settings.countdown_date) <= new Date())

  // Real, server-checked gate — replaces what used to be a purely cosmetic
  // check-in popup. Until a guest has actually completed check-in (see
  // src/app/actions/guest.ts), they don't get gallery links or an upload
  // entry point from this page, and the upload/react API routes reject them
  // even if they reach those URLs directly.
  const checkedIn = await hasGuestSessionSSR(event.id)

  const visibleGalleries = event.galleries?.filter((g) => {
    if (isRevealed) return true
    if (!g.reveal_enabled) return true
    return g.reveal_at && new Date(g.reveal_at) <= new Date()
  }) || []

  // Fetch event photos inline — query by event.id so all uploaded photos for this event display
  const photosByGallery: Record<string, GridPhoto[]> = {}
  if (checkedIn && isRevealed) {
    const requiresModeration = (settings as any)?.auto_approve_photos === false || (settings as any)?.moderate_uploads === true
    const aiFeatures = ((settings as any)?.ai_features as Record<string, boolean>) || {}

    let photoQuery = supabase
      .from("photos")
      // `metadata` (reactions/comments) was previously missing from this
      // select entirely, so the ❤️ reaction-count badge in MediaGrid always
      // rendered as 0 on first load regardless of how many guests had
      // actually reacted — it only ever "worked" via the optimistic client
      // update right after you reacted yourself, in the same page load.
      // blur_score/brightness_score/smile_score/is_duplicate back Best Shot
      // Selection and Smart Duplicate Detection (settings.ai_features).
      .select("id, gallery_id, event_id, storage_path, thumbnail_path, original_filename, uploader_name, mime_type, created_at, is_approved, metadata, is_duplicate, blur_score, brightness_score, smile_score, tags")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(200)

    if (requiresModeration) {
      photoQuery = photoQuery.neq("is_approved", false)
    }

    // Smart Duplicate Detection: near-identical burst shots are hidden from
    // this guest-facing grid by default (the host still sees everything via
    // the dashboard timeline, which doesn't apply this filter).
    if (aiFeatures.duplicate_detection === true) {
      photoQuery = photoQuery.eq("is_duplicate", false)
    }

    const { data: photos } = await photoQuery

    // Best Shot Selection: rank this batch by sharpness/brightness/smile and
    // flag the top slice so MediaGrid can show a "✨ Highlight" badge. This
    // uses only the static per-photo signals computed at upload time (see
    // image-quality.ts/face.ts) — the fuller engagement-blended ranking used
    // for Auto Collage/Slideshow/Movie (getScoredPhotos in memories.ts) also
    // factors in live reaction/comment counts, which isn't worth
    // recomputing on every page load of the main event page.
    const bestShotIds = aiFeatures.best_shot === true
      ? pickBestShots((photos ?? []).map((p) => ({
          id: p.id,
          blurScore: p.blur_score,
          brightnessScore: p.brightness_score,
          smileScore: p.smile_score,
        })))
      : new Set<string>()

    for (const p of photos ?? []) {
      const withUrl = {
        ...p,
        url: publicUrl("PHOTOS", p.storage_path),
        is_best_shot: bestShotIds.has(p.id),
      } as GridPhoto & { gallery_id: string }
      const key = p.gallery_id || "default"
      if (!photosByGallery[key]) photosByGallery[key] = []
      photosByGallery[key].push(withUrl)
    }
  }
  const flags = await getFeatureFlags()
  const voiceNoteDurationLimit = Number((settings as any)?.voice_note_duration_limit) || 10

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
      <GuestCaptureModal eventId={event.id} eventName={event.name} requireJoinCode={!!settings.require_join_code} />

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
                className="rounded-full border border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-[#B28DAE]"
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
            <p className="text-sm uppercase tracking-widest text-[#B28DAE]">
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
                  className="rounded-full bg-[#B28DAE] px-6 text-[#141110] hover:bg-[#a468a0]"
                >
                  <Link href={`/event/${event.slug}/upload`}>
                    <Camera className="mr-2 h-4 w-4" />
                    Upload Photos
                  </Link>
                </Button>
              )}
              {checkedIn && (
                <GuestFaceSearchButton
                  eventId={event.id}
                  galleryId={visibleGalleries[0]?.id}
                />
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

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="font-playfair text-2xl font-medium tracking-tight text-white">
            {!checkedIn ? "Private Memory Capsule" : isRevealed ? "Photos" : "Coming Soon"}
          </h2>
          <p className="mt-1 text-white/60">
            {!checkedIn
              ? "Check in above with your name and contact details to view and share photos."
              : isRevealed
              ? `${visibleGalleries.reduce((acc, g) => acc + (photosByGallery[g.id]?.length ?? 0), 0)} photos`
              : "Photos will be revealed soon"}
          </p>

          {!checkedIn ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-[#3D332A] bg-[#1C1814] px-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                <Lock className="h-8 w-8 text-[#B28DAE]" />
              </div>
              <h3 className="font-playfair mt-4 text-lg font-medium text-white">Check In to Continue</h3>
              <p className="mt-2 max-w-md text-sm text-white/60">
                {settings.require_join_code
                  ? "This event is private to invited guests. Complete check-in above with the event code your host shared with you to view galleries and share your own photos."
                  : "This event is private to invited guests. Complete the check-in above to view galleries and share your own photos."}
              </p>
            </div>
          ) : (Object.values(photosByGallery).flat().length > 0 || visibleGalleries.length > 0) ? (
            <div className="mt-6 space-y-12">
              {visibleGalleries.length > 0 ? (
                visibleGalleries.map((gallery) => (
                  <div key={gallery.id}>
                    {visibleGalleries.length > 1 && (
                      <div className="mb-1">
                        <h3 className="font-playfair text-lg font-medium text-white">{gallery.name}</h3>
                        {gallery.description && <p className="text-sm text-white/60">{gallery.description}</p>}
                      </div>
                    )}
                    <MediaGrid
                      photos={photosByGallery[gallery.id] ?? Object.values(photosByGallery).flat()}
                      watermarkEnabled={flags.watermark_enabled}
                      voiceNoteDurationLimit={voiceNoteDurationLimit}
                    />
                  </div>
                ))
              ) : (
                <MediaGrid
                  photos={Object.values(photosByGallery).flat()}
                  watermarkEnabled={flags.watermark_enabled}
                  voiceNoteDurationLimit={voiceNoteDurationLimit}
                />
              )}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-[#3D332A] bg-[#1C1814] px-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                <Lock className="h-8 w-8 text-[#B28DAE]" />
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
