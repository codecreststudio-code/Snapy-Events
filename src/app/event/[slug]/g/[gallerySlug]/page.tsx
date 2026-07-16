import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { publicUrl } from "@/lib/integrations/storage"
import { getFeatureFlags } from "@/lib/platform-settings"
import { GalleryGallery } from "./gallery-view"
import { GuestCaptureModal } from "@/lib/components/events/guest-capture-modal"
import { hasGuestSessionSSR, isEventHost } from "@/lib/security/guest-session"

export const metadata = { title: "Gallery" }

export default async function GalleryPage({ params }: PageProps<"/event/[slug]/g/[gallerySlug]">) {
  const { slug, gallerySlug } = await params
  const supabase = await createClient()
  const { data: ev } = await supabase.from("events").select("id, name, settings, host_id").eq("slug", slug).neq("status", "archived").single()
  if (!ev) return <div className="p-8 text-center text-sm text-muted-foreground">Event not found.</div>

  // Real check-in gate — this is the actual photo content, not just the
  // landing page teaser, so it's the most important place to enforce it.
  // A guest who never checked in (or dismissed the popup without
  // submitting) gets bounced back to the landing page to complete check-in
  // instead of seeing any photos.
  const checkedIn = (await hasGuestSessionSSR(ev.id)) || (await isEventHost(ev.host_id))
  if (!checkedIn) redirect(`/event/${slug}`)

  const { data: gallery } = await supabase.from("galleries").select("*").eq("event_id", ev.id).eq("slug", gallerySlug).single()
  if (!gallery) return <div className="p-8 text-center text-sm text-muted-foreground">Gallery not found.</div>
  const { data: photos } = await supabase.from("photos").select("id, storage_path, thumbnail_path, original_filename, uploader_name, mime_type, created_at").eq("gallery_id", gallery.id).neq("is_approved", false).order("created_at", { ascending: false }).limit(200)
  const urls = (photos ?? []).map((p) => ({ ...p, url: publicUrl("PHOTOS", p.storage_path) }))
  const flags = await getFeatureFlags()
  const voiceNoteDurationLimit = Number((ev.settings as any)?.voice_note_duration_limit) || 10
  return (
    <>
      <GuestCaptureModal eventId={ev.id} eventName={ev.name} />
      <GalleryGallery
        eventName={ev.name}
        galleryName={gallery.name}
        galleryDescription={gallery.description}
        photos={urls}
        watermarkEnabled={flags.watermark_enabled}
        voiceNoteDurationLimit={voiceNoteDurationLimit}
      />
    </>
  )
}
