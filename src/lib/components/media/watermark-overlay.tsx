"use client"

// Tiled "SNAPSY" watermark shown over photo/video media wherever it's
// displayed on the platform (guest gallery grid + lightbox, host dashboard
// timeline) when Admin > Feature Flags → "Automated Image Watermarking" is
// on. This is a display-time CSS overlay, not baked into pixels — cheap to
// render on every thumbnail without re-encoding images. The downloaded
// *file* is separately, actually watermarked server-side via
// applyWatermark() in src/lib/integrations/image-processing.ts, since a CSS
// overlay obviously wouldn't travel with an exported file.
export function WatermarkOverlay({ dense = false }: { dense?: boolean }) {
  const count = dense ? 9 : 6
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-10"
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex flex-wrap content-around justify-around -rotate-[28deg] scale-125">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className="whitespace-nowrap px-4 py-3 text-[10px] font-bold tracking-[0.2em] text-white/40 sm:text-xs"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
          >
            SNAPSY
          </span>
        ))}
      </div>
    </div>
  )
}
