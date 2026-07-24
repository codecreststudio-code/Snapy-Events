import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { publicUrl } from "@/lib/integrations/storage"
import { getFeatureFlags } from "@/lib/platform-settings"
import { GalleryGallery } from "./gallery-view"
import { GuestCaptureModal } from "@/lib/components/events/guest-capture-modal"
import { hasGuestSessionSSR, isEventHost } from "@/lib/security/guest-session"
import { pickBestShots } from "@/lib/integrations/quality-score"

export const metadata = { title: "Gallery" }

export default async function GalleryPage({ params }: PageProps<"/event/[slug]/g/[gallerySlug]">) {
  const { slug, gallerySlug } = await params
  const supabase = await createClient()
  const { data: ev } = await supabase.from("events").select("id, name, settings, host_id").eq("slug", slug).neq("status", "archived").single()
  if (!ev) return <div className="min-h-screen bg-[#faf6ed] p-8 text-center text-sm text-[#6b6055]">Event not found.</div>

  // Real check-in gate — this is the actual photo content, not just the
  // landing page teaser, so it's the most important place to enforce it.
  // A guest who never checked in (or dismissed the popup without
  // submitting) gets bounced back to the landing page to complete check-in
  // instead of seeing any photos.
  const checkedIn = (await hasGuestSessionSSR(ev.id)) || (await isEventHost(ev.host_id))
  if (!checkedIn) redirect(`/event/${slug}`)

  const { data: gallery } = await supabase.from("galleries").select("*").eq("event_id", ev.id).eq("slug", gallerySlug).single()
  if (!gallery) return <div className="min-h-screen bg-[#faf6ed] p-8 text-center text-sm text-[#6b6055]">Gallery not found.</div>

  const aiFeatures = ((ev.settings as any)?.ai_features as Record<string, boolean>) || {}
  let photosQuery = supabase
    // `metadata` (reactions/comments) was previously missing here too — see
    // the identical fix + explanation in src/app/event/[slug]/page.tsx.
    .from("photos")
    .select("id, storage_path, thumbnail_path, original_filename, uploader_name, mime_type, created_at, metadata, is_duplicate, blur_score, brightness_score, smile_score, tags")
    .eq("gallery_id", gallery.id)
    .neq("is_approved", false)
    .order("created_at", { ascending: false })
    .limit(200)
  if (aiFeatures.duplicate_detection === true) {
    photosQuery = photosQuery.eq("is_duplicate", false)
  }
  const { data: photos } = await photosQuery

  const bestShotIds = aiFeatures.best_shot === true
    ? pickBestShots((photos ?? []).map((p) => ({
        id: p.id,
        blurScore: p.blur_score,
        brightnessScore: p.brightness_score,
        smileScore: p.smile_score,
      })))
    : new Set<string>()
  const urls = (photos ?? []).map((p) => ({ ...p, url: publicUrl("PHOTOS", p.storage_path), is_best_shot: bestShotIds.has(p.id) }))
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
