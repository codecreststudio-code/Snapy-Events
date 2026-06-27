import { createClient } from "@/lib/supabase/server"
import { publicUrl } from "@/lib/integrations/storage"
import { GalleryGallery } from "./gallery-view"
import { GuestCaptureModal } from "@/lib/components/events/guest-capture-modal"

export const metadata = { title: "Gallery" }

export default async function GalleryPage({ params }: PageProps<"/event/[slug]/g/[gallerySlug]">) {
  const { slug, gallerySlug } = await params
  const supabase = await createClient()
  const { data: ev } = await supabase.from("events").select("id, name, organization_id").eq("slug", slug).eq("status", "published").single()
  if (!ev) return <div className="p-8 text-center text-sm text-muted-foreground">Event not found.</div>
  const { data: gallery } = await supabase.from("galleries").select("*").eq("event_id", ev.id).eq("slug", gallerySlug).single()
  if (!gallery) return <div className="p-8 text-center text-sm text-muted-foreground">Gallery not found.</div>
  const { data: photos } = await supabase.from("photos").select("id, storage_path, original_filename, uploader_name, created_at").eq("gallery_id", gallery.id).eq("is_approved", true).order("created_at", { ascending: false }).limit(200)
  const urls = (photos ?? []).map((p) => ({ ...p, url: publicUrl("PHOTOS", p.storage_path) }))
  return (
    <>
      <GuestCaptureModal eventId={ev.id} eventName={ev.name} />
      <GalleryGallery eventName={ev.name} galleryName={gallery.name} galleryDescription={gallery.description} photos={urls} />
    </>
  )
}
