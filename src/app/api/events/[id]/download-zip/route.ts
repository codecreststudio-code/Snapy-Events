import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { checkEventFeatureAccess } from "@/lib/plans/feature-gate"
import JSZip from "jszip"
import { logger } from "@/lib/logger"

const uuidSchema = z.string().uuid()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const uuidParse = uuidSchema.safeParse(rawId)
    if (!uuidParse.success) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 })
    }
    const eventId = uuidParse.data

    const supabase = await createServiceClient()

    // Require authenticated user (host must own the event download). The service
    // client has no session cookie, so auth must use the SSR client — otherwise
    // getUser() is always null and this endpoint 401s for everyone.
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // 1. Fetch event metadata and verify ownership
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("title, slug, host_id")
      .eq("id", eventId)
      .single()

    if (eventErr || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (event.host_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 2. Check feature access for print_ready_downloads
    const gate = await checkEventFeatureAccess(eventId, "print_ready_downloads")
    if (!gate.allowed) {
      return NextResponse.json(
        { error: gate.reason || "Print-ready high-res downloads are disabled for this plan. Please upgrade." },
        { status: 403 }
      )
    }

    // 3. Fetch all approved photos in the event
    const { data: photos, error: photoErr } = await supabase
      .from("photos")
      .select("id, storage_path, original_filename")
      .eq("event_id", eventId)

    if (photoErr || !photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos available to download" }, { status: 400 })
    }

    const MAX_ZIP_BYTES = 500 * 1024 * 1024
    const zip = new JSZip()
    const folderName = `${event.slug || "event"}-highres-photos`
    const folder = zip.folder(folderName)
    let totalBytes = 0

    // Download each photo from storage and attach to zip archive
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i]
      try {
        const { data: fileData, error: downloadErr } = await supabase.storage
          .from("photos")
          .download(p.storage_path)

        if (fileData && !downloadErr) {
          const buffer = await fileData.arrayBuffer()
          if (totalBytes + buffer.byteLength > MAX_ZIP_BYTES) break
          const filename = p.original_filename || `photo-${i + 1}.jpg`
          folder?.file(filename, buffer)
          totalBytes += buffer.byteLength
        }
      } catch (err) {
        logger.error("Failed to download photo into ZIP", { photoId: p.id, error: String(err) })
      }
    }

    if (totalBytes === 0) {
      return NextResponse.json({ error: "No photos could be downloaded" }, { status: 500 })
    }

    const zipArray = await zip.generateAsync({ type: "uint8array" })
    const sanitizedTitle = (event.title || "snapsy-event").replace(/[^a-zA-Z0-9_-]/g, "_")

    return new NextResponse(zipArray as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${sanitizedTitle}-print-ready.zip"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error: any) {
    logger.error("download-zip internal error", { error: String(error) })
    return NextResponse.json({ error: "Failed to generate ZIP archive" }, { status: 500 })
  }
}
