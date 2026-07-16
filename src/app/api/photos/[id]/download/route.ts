import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/server"
import { getFeatureFlags } from "@/lib/platform-settings"
import { applyWatermark } from "@/lib/integrations/image-processing"
import { logger } from "@/lib/logger"

const uuidSchema = z.string().uuid()

// Public guest-facing photo download — there was previously no download
// endpoint at all for guests (the gallery page's Download icon/button had
// no handler wired up). No auth is required here on purpose: the photos
// storage bucket already serves these files at a public, unauthenticated
// URL (see publicUrl() in src/lib/integrations/storage.ts) for anyone who
// has the gallery link, so this doesn't expose anything new — it just adds
// a real "download as attachment" endpoint, with the watermark burned in
// server-side when Admin > Feature Flags → "Automated Image Watermarking"
// is on. Only images get a burned-in mark; video/audio are streamed as-is
// (no ffmpeg dependency in this project to re-encode video).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const parsed = uuidSchema.safeParse(rawId)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid photo ID" }, { status: 400 })
    }
    const photoId = parsed.data

    const supabase = await createServiceClient()
    const { data: photo, error } = await supabase
      .from("photos")
      .select("id, storage_path, original_filename, mime_type, is_approved, gallery_id")
      .eq("id", photoId)
      .single()

    if (error || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }
    if (photo.is_approved === false) {
      return NextResponse.json({ error: "Photo not available" }, { status: 404 })
    }

    // Public galleries only — matches the visibility already granted by the
    // bucket's public URL, just double-checked here before we serve it.
    const { data: gallery } = await supabase
      .from("galleries")
      .select("is_public")
      .eq("id", photo.gallery_id)
      .maybeSingle()
    if (gallery && gallery.is_public === false) {
      return NextResponse.json({ error: "Photo not available" }, { status: 404 })
    }

    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("photos")
      .download(photo.storage_path)
    if (downloadErr || !fileData) {
      return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 })
    }

    let buffer = Buffer.from(await fileData.arrayBuffer())
    const mimeType = photo.mime_type || "image/jpeg"
    const isImage = mimeType.startsWith("image/")

    if (isImage) {
      const flags = await getFeatureFlags()
      if (flags.watermark_enabled) {
        try {
          buffer = await applyWatermark(buffer, mimeType)
        } catch (err) {
          // Better to serve the un-watermarked original than fail the
          // download outright over a compositing error.
          logger.error("Failed to apply watermark, serving original", { photoId, error: String(err) })
        }
      }
    }

    const filename = photo.original_filename || `snapsy-${photoId}`
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    logger.error("photo download internal error", { error: String(err) })
    return NextResponse.json({ error: "Failed to download photo" }, { status: 500 })
  }
}
