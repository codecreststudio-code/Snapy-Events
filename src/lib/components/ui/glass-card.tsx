import * as React from "react"
import { cn } from "@/lib/utils"

// Frosted/glass panel primitive — the "floating over media" look used for
// the reference app's info overlays (distance/time/steps card floating over
// the AR camera view). Wraps the shared .glass-panel CSS class (see
// globals.css) so every floating panel in Snapy Events — invite cards,
// upload-progress overlays, stat overlays on cover photos — looks identical
// instead of each screen reimplementing its own backdrop-blur/border combo.
export function GlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-panel rounded-2xl", className)} {...props} />
}

/** A small floating stat row, e.g. "3h left · 12 people · 48 moments" over a cover photo. */
export function GlassStatRow({
  stats,
  className,
}: {
  stats: Array<{ label: string; value: string | number }>
  className?: string
}) {
  return (
    <GlassCard className={cn("flex items-center gap-4 px-4 py-2.5", className)}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div className="h-6 w-px bg-hairline-dark" />}
          <div className="text-center leading-tight">
            <p className="font-playfair text-base font-medium text-white">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/50">{s.label}</p>
          </div>
        </React.Fragment>
      ))}
    </GlassCard>
  )
}
