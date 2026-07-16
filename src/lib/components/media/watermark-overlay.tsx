"use client"

// Small corner logo watermark shown over photo/video media wherever it's
// displayed on the platform (guest gallery grid + lightbox, host dashboard
// timeline) when Admin > Feature Flags → "Automated Image Watermarking" is
// on. This is a display-time CSS overlay, not baked into pixels — cheap to
// render on every thumbnail without re-encoding images. The downloaded
// *file* is separately, actually watermarked server-side via
// applyWatermark() in src/lib/integrations/image-processing.ts (using the
// same logo file), since a CSS overlay obviously wouldn't travel with an
// exported file.
//
// Previously this tiled a rotated "SNAPSY" text string across the whole
// image, which made thumbnails unreadable (looked like visual noise/a QR
// code). Replaced with a single small logo mark pinned to the bottom-right
// corner, out of the way of the actual photo.
export function WatermarkOverlay({ dense = false }: { dense?: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 select-none z-10"
      aria-hidden="true"
    >
      <img
        src="/Favicon.png"
        alt=""
        className={
          dense
            ? "absolute bottom-3 right-3 h-9 w-9 sm:h-11 sm:w-11 object-contain opacity-85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]"
            : "absolute bottom-1.5 right-1.5 h-5 w-5 sm:h-6 sm:w-6 object-contain opacity-85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]"
        }
      />
    </div>
  )
}
