import { cn } from "@/lib/utils"

// NOTE on the source assets: every logo file exported to public/ (Logo.png,
// logo_png.png, logo-email*.png) is a full "mockup" render with an opaque
// cream or moody-gray backdrop baked into the pixels — none were exported
// with real transparency. Using logo_png.png directly (the old behavior)
// meant a visible gray rectangle patch around the mark on every dark
// surface it sat on (navbar, sidebar, auth pages) — the exact "logo doesn't
// belong to the brand" disconnect this redesign pass is fixing.
// logo-mark-transparent.png / logo-icon-transparent.png are chroma-keyed
// derivatives (the source background was a near-uniform cream, so it keys
// out cleanly) with a real alpha channel, generated for this pass. If a
// true vector/transparent export becomes available from the designer, drop
// it in under these same filenames and everything below picks it up
// automatically — no component changes needed.
export function Logo({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <img
        src="/logo-mark-transparent.png"
        alt="Snapsy Events"
        className={cn("h-16 min-[380px]:h-20 sm:h-22 md:h-24 max-h-[84px] w-auto object-contain shrink-0 transition-transform duration-200 hover:scale-[1.02]", imgClassName)}
      />
    </div>
  )
}

// Compact icon-only mark (ribbon "S" + sparkle, no wordmark) for tight
// spaces — collapsed sidebar rail, mobile top bar, favicon-style chips.
export function LogoIcon({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <div className={cn("flex items-center justify-center shrink-0", className)}>
      <img
        src="/logo-icon-transparent.png"
        alt="Snapsy Events"
        className={cn("h-9 w-9 object-contain", imgClassName)}
      />
    </div>
  )
}
