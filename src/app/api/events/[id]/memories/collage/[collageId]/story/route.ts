import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { composeStoryFormat } from "@/lib/integrations/image-processing"
import { logger } from "@/lib/logger"

const paramsSchema = z.object({ id: z.string().uuid(), collageId: z.string().uuid() })

// "Save for Instagram Story" export for a generated Auto Collage — host-only
// (collages are a private dashboard preview, not guest-facing), mirrors the
// ownership check used by the sibling collage routes. Pads/crops the
// composited collage image into a 1080x1920 canvas with the brand watermark
// burned in, same treatment as /api/photos/[id]/story for individual photos.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collageId: string }> }
) {
  try {
    const parsed = paramsSchema.safeParse(await params)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }
    const { id: eventId, collageId } = parsed.data

    // Cookie-aware client to identify the caller — createServiceClient()
    // below uses the service-role key directly and has no request session,
    // so the auth check has to happen against this client first.
    const authClient = await createClient()
    const { data: authData } = await authClient.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const supabase = await createServiceClient()

    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, host_id")
      .eq("id", eventId)
      .single()
    if (eventErr || !eventRow) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    if (eventRow.host_id !== userId) {
      return NextResponse.json({ error: "You don't have access to this event" }, { status: 403 })
    }

    const { data: collage, error: collageErr } = await supabase
      .from("event_collages")
      .select("id, storage_path")
      .eq("id", collageId)
      .eq("event_id", eventId)
      .single()
    if (collageErr || !collage) {
      return NextResponse.json({ error: "Collage not found" }, { status: 404 })
    }

    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("photos")
      .download(collage.storage_path)
    if (downloadErr || !fileData) {
      return NextResponse.json({ error: "Failed to fetch collage" }, { status: 500 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const storyBuffer = await composeStoryFormat(buffer)

    return new NextResponse(storyBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="snapsy-collage-${collageId}-story.jpg"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    logger.error("collage story-export internal error", { error: String(err) })
    return NextResponse.json({ error: "Failed to build story export" }, { status: 500 })
  }
}
