// src/lib/movie/movie-renderer.ts
//
// Client-side "Movie" renderer — the whole reason this exists is to avoid
// repeating the old "Recap Video" feature's failure mode. That feature ran
// ffmpeg synchronously inside a single Vercel serverless function (no
// queue/worker infra in this codebase to escape the request's own timeout
// budget) and "never rendered reliably in production" (see the removal note
// in src/lib/integrations/recap-video.ts). This module does the equivalent
// job — photos + Ken Burns pan/zoom + crossfades + music, composited into a
// 9:16 video — entirely on the host's own device: an offscreen <canvas> is
// drawn frame-by-frame and captured in real time via the browser's built-in
// MediaRecorder API. The server never touches ffmpeg or any native binary;
// it only ever stores a file the browser already finished encoding, exactly
// like uploadCollage() already does for composited images (collage.ts).
//
// Trade-off, stated plainly: this is CapCut/Instagram-Reels-from-photos
// tier editing (smooth zoom, crossfades, a title card, music), not full
// AI-driven cinematic editing — and the browser tab has to stay open and
// the screen on for roughly the movie's own duration while it records,
// since MediaRecorder captures in real time. Output format is best-effort
// MP4 where the browser's MediaRecorder supports it (e.g. Safari), falling
// back to WebM everywhere else (Chrome/Firefox/Android) — WebM plays back
// fine in-app and uploads fine to Instagram/etc, it just isn't natively
// "Save to Photos"-able on iOS the way an MP4 is.

export interface MovieRenderPhoto {
  id: string
  url: string
}

export interface RenderMovieOptions {
  photos: MovieRenderPhoto[]
  durationSeconds: number
  musicUrl?: string | null
  eventName?: string | null
  onProgress?: (fraction: number) => void
}

export interface RenderMovieResult {
  blob: Blob
  mimeType: string
  durationSeconds: number
  width: number
  height: number
}

const WIDTH = 1080
const HEIGHT = 1920
const CROSSFADE_MS = 500
const FPS = 30
const MIN_SLOT_MS = 1800

export class MovieRenderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = "MovieRenderError"
  }
}

export async function renderMovie(opts: RenderMovieOptions): Promise<RenderMovieResult> {
  const { photos, durationSeconds, musicUrl, eventName, onProgress } = opts
  if (photos.length === 0) throw new MovieRenderError("No photos are available to build a movie")
  if (typeof MediaRecorder === "undefined") {
    throw new MovieRenderError("This browser doesn't support recording video. Try a recent Chrome, Safari, or Edge.")
  }

  let images: HTMLImageElement[]
  try {
    images = await Promise.all(photos.map((p) => loadImage(p.url)))
  } catch (err) {
    throw new MovieRenderError("Couldn't load one or more photos for the movie", err)
  }

  const logo = await loadImage("/Favicon.png").catch(() => null)

  const perSlotMs = Math.max(MIN_SLOT_MS, (durationSeconds * 1000) / images.length)

  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) throw new MovieRenderError("Canvas rendering isn't supported on this device")

  const canvasStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(FPS)
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()]

  let audioCleanup: (() => void) | null = null
  if (musicUrl) {
    try {
      const audioEl = document.createElement("audio")
      audioEl.src = musicUrl
      audioEl.loop = true
      audioEl.muted = false
      audioEl.volume = 0.55
      await new Promise<void>((resolve) => {
        const done = () => resolve()
        audioEl.addEventListener("canplaythrough", done, { once: true })
        audioEl.addEventListener("error", done, { once: true })
        audioEl.load()
        // Bail out after 4s regardless — a slow/missing track shouldn't block the render.
        setTimeout(done, 4000)
      })
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioCtx = new AudioCtx()
      const source = audioCtx.createMediaElementSource(audioEl)
      const dest = audioCtx.createMediaStreamDestination()
      source.connect(dest)
      tracks.push(...dest.stream.getAudioTracks())
      await audioEl.play().catch(() => { /* autoplay may be blocked — video still records, just silent */ })
      audioCleanup = () => {
        audioEl.pause()
        audioCtx.close().catch(() => {})
      }
    } catch {
      // Same-origin /audio/slideshow/*.mp3 assets shouldn't hit CORS issues,
      // but if the Web Audio graph fails for any reason, render silently
      // rather than failing the whole movie over background music.
    }
  }

  const combinedStream = new MediaStream(tracks)
  const mimeType = pickSupportedMimeType()
  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 4_000_000 })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const totalMs = perSlotMs * images.length

  try {
    recorder.start(250)
    await new Promise<void>((resolve) => {
      const startTime = performance.now()
      function frame(now: number) {
        const elapsed = now - startTime
        drawFrame(ctx!, images, elapsed, perSlotMs, logo, eventName)
        onProgress?.(Math.min(0.98, elapsed / totalMs))
        if (elapsed < totalMs) {
          requestAnimationFrame(frame)
        } else {
          resolve()
        }
      }
      requestAnimationFrame(frame)
    })

    recorder.stop()
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })
  } catch (err) {
    audioCleanup?.()
    // SecurityError specifically means a photo's storage URL didn't pass a
    // CORS check when drawn into the canvas, tainting it — surfaced with an
    // actionable message rather than a generic failure.
    if (err instanceof DOMException && err.name === "SecurityError") {
      throw new MovieRenderError("Couldn't render the movie because one of the photos blocked cross-origin access. Please try again.", err)
    }
    throw new MovieRenderError("Couldn't render the movie", err)
  }

  audioCleanup?.()
  onProgress?.(1)

  const blob = new Blob(chunks, { type: mimeType })
  if (blob.size === 0) {
    throw new MovieRenderError("The recorded movie came out empty. Please try again.")
  }

  return { blob, mimeType, durationSeconds: totalMs / 1000, width: WIDTH, height: HEIGHT }
}

function pickSupportedMimeType(): string {
  const candidates = [
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return "video/webm"
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  images: HTMLImageElement[],
  elapsedMs: number,
  perSlotMs: number,
  logo: HTMLImageElement | null,
  eventName: string | null | undefined,
) {
  const totalIndex = elapsedMs / perSlotMs
  const index = Math.min(images.length - 1, Math.floor(totalIndex))
  const localT = Math.min(1, totalIndex - index)
  const nextIndex = Math.min(images.length - 1, index + 1)

  ctx.fillStyle = "#0a0a0a"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const kbScale = 1.0 + 0.12 * localT
  drawCover(ctx, images[index], kbScale)

  const fadeStart = 1 - CROSSFADE_MS / perSlotMs
  if (localT > fadeStart && index !== nextIndex) {
    const alpha = (localT - fadeStart) / (1 - fadeStart)
    ctx.save()
    ctx.globalAlpha = alpha
    drawCover(ctx, images[nextIndex], 1.0)
    ctx.restore()
  }

  if (logo) {
    const size = Math.round(WIDTH * 0.12)
    const pad = Math.round(WIDTH * 0.025)
    ctx.save()
    ctx.globalAlpha = 0.85
    ctx.drawImage(logo, WIDTH - size - pad, HEIGHT - size - pad, size, size)
    ctx.restore()
  }

  if (eventName) {
    const introMs = 2200
    const fadeMs = 500
    if (elapsedMs < introMs) {
      const alpha = elapsedMs > introMs - fadeMs ? Math.max(0, (introMs - elapsedMs) / fadeMs) : 1
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = "rgba(0,0,0,0.4)"
      ctx.fillRect(0, HEIGHT / 2 - 100, WIDTH, 200)
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.font = "700 58px system-ui, -apple-system, sans-serif"
      wrapText(ctx, eventName, WIDTH / 2, HEIGHT / 2, WIDTH * 0.85, 66)
      ctx.restore()
    }
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  const startY = cy - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineHeight))
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale: number) {
  const targetRatio = WIDTH / HEIGHT
  const imgRatio = img.width / img.height
  let sw: number, sh: number, sx: number, sy: number
  if (imgRatio > targetRatio) {
    sh = img.height
    sw = sh * targetRatio
    sx = (img.width - sw) / 2
    sy = 0
  } else {
    sw = img.width
    sh = sw / targetRatio
    sx = 0
    sy = (img.height - sh) / 2
  }
  const zoomW = sw / scale
  const zoomH = sh / scale
  const zx = sx + (sw - zoomW) / 2
  const zy = sy + (sh - zoomH) / 2
  ctx.drawImage(img, zx, zy, zoomW, zoomH, 0, 0, WIDTH, HEIGHT)
}
