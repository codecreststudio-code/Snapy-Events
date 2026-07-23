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
      .select("name, slug, host_id")
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

    // 3. Fetch this event's photos. Approval is a guest-facing moderation
    // concept (whether OTHER guests can see a photo in the public gallery)
    // — it has nothing to do with whether the HOST can download their own
    // event's content. Filtering on is_approved=true here meant "Download
    // All" 400'd with "No approved photos available" for any host who
    // hadn't manually approved every upload (which most never do, since
    // there's no moderation step in the normal flow), even on a fully
    // populated, paid event. The host already passed the ownership check
    // above, so every photo on this event is fair game.
    const { data: photos, error: photoErr } = await supabase
      .from("photos")
      .select("id, storage_path, original_filename, file_size")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })

    if (photoErr || !photos || photos.length === 0) {
      return NextResponse.json({ error: "No photos available to download yet" }, { status: 400 })
    }

    // Hard limits to prevent OOM — each file is buffered in-process.
    // A streaming ZIP library (archiver) would remove this cap; for now
    // we serve the first N files within the byte budget.
    const MAX_ZIP_FILES = 50
    const MAX_ZIP_BYTES = 200 * 1024 * 1024 // 200 MB cap (safe for Vercel 1 GB limit)

    const zip = new JSZip()
    const folderName = `${event.slug || "event"}-highres-photos`
    const folder = zip.folder(folderName)
    let totalBytes = 0
    let filesAdded = 0

    // Pass 1 (cheap, no I/O): decide which photos to actually fetch, using
    // the DB-stored file_size, so the MAX_ZIP_FILES/MAX_ZIP_BYTES budget is
    // respected in original (upload-order) priority — same selection logic
    // as before, just separated from the download step below.
    const candidates: { index: number; id: string; storage_path: string; original_filename: string | null }[] = []
    let budgetBytes = 0
    for (let i = 0; i < photos.length && candidates.length < MAX_ZIP_FILES; i++) {
      const p = photos[i]
      const knownSize = Number(p.file_size ?? 0)
      if (knownSize > 0 && budgetBytes + knownSize > MAX_ZIP_BYTES) break
      budgetBytes += knownSize
      candidates.push({ index: i, id: p.id, storage_path: p.storage_path, original_filename: p.original_filename })
    }

    // Pass 2: the actual downloads are independent per-file network calls,
    // so running them one-at-a-time (the original behavior) multiplied
    // per-file latency by file count for no reason. Bounded concurrency
    // keeps memory use predictable (buffers are still all held until
    // zip.generateAsync below) while letting the network calls overlap.
    const CONCURRENCY = 6
    const downloaded: { filename: string; buffer: ArrayBuffer }[] = []
    let cursor = 0
    async function downloadWorker() {
      while (cursor < candidates.length) {
        const c = candidates[cursor++]
        // Re-check the running byte budget — actual downloaded size can
        // differ slightly from the DB's stored file_size.
        if (totalBytes >= MAX_ZIP_BYTES) return
        try {
          const { data: fileData, error: downloadErr } = await supabase.storage
            .from("photos")
            .download(c.storage_path)
          if (fileData && !downloadErr) {
            const buffer = await fileData.arrayBuffer()
            if (totalBytes + buffer.byteLength > MAX_ZIP_BYTES) continue
            totalBytes += buffer.byteLength
            downloaded.push({ filename: c.original_filename || `photo-${c.index + 1}.jpg`, buffer })
          }
        } catch (err) {
          logger.error("Failed to download photo into ZIP", { photoId: c.id, error: String(err) })
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, downloadWorker))

    for (const d of downloaded) {
      folder?.file(d.filename, d.buffer)
      filesAdded++
    }

    if (filesAdded === 0) {
      return NextResponse.json({ error: "No photos could be downloaded" }, { status: 500 })
    }

    const zipArray = await zip.generateAsync({ type: "uint8array" })
    const sanitizedTitle = (event.name || "snapsy-event").replace(/[^a-zA-Z0-9_-]/g, "_")

    // filesAdded can be less than photos.length because of MAX_ZIP_FILES /
    // MAX_ZIP_BYTES above, or because individual downloads failed. Surface
    // that via response headers (can't attach a JSON body to a binary ZIP
    // response) instead of silently shipping a partial archive — the client
    // reads these to warn the host rather than letting a truncated download
    // look identical to a complete one.
    const truncated = filesAdded < photos.length
    return new NextResponse(zipArray as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${sanitizedTitle}-print-ready.zip"`,
        "Cache-Control": "no-cache",
        "X-Zip-Total-Photos": String(photos.length),
        "X-Zip-Included-Photos": String(filesAdded),
        "X-Zip-Truncated": String(truncated),
      },
    })
  } catch (error: any) {
    logger.error("download-zip internal error", { error: String(error) })
    return NextResponse.json({ error: "Failed to generate ZIP archive" }, { status: 500 })
  }
}
