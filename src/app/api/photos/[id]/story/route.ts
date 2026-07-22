import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/server"
import { composeStoryFormat } from "@/lib/integrations/image-processing"
import { logger } from "@/lib/logger"

const uuidSchema = z.string().uuid()

// "Save for Instagram Story" export — same public visibility rules as
// /api/photos/[id]/download/route.ts (this file is a sibling of that route
// and intentionally mirrors its auth/visibility checks so the two stay in
// sync), but instead of serving the original file, it pads/crops the photo
// into a 1080x1920 (9:16) canvas via composeStoryFormat() so guests/hosts can
// drop it straight into an Instagram/Snapchat Story without doing their own
// cropping. Images only — video/audio aren't supported by this export (the
// dashboard UI hides the "Save for Story" action for those mime types).
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
    if (!photo.mime_type || !photo.mime_type.startsWith("image/")) {
      return NextResponse.json({ error: "Story export is only available for photos" }, { status: 400 })
    }

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

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const storyBuffer = await composeStoryFormat(buffer)

    const filename = (photo.original_filename || `snapsy-${photoId}`).replace(/\.[^.]+$/, "")
    return new NextResponse(storyBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}-story.jpg"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    logger.error("photo story-export internal error", { error: String(err) })
    return NextResponse.json({ error: "Failed to build story export" }, { status: 500 })
  }
}
