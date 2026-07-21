"use client"

// Selectable pill-shaped filter chip — the category-filter row pattern
// (All / Sculpture / Artwork / Exhibition / Event) from the reference
// redesign. Extends the same cva convention as badge.tsx but renders a real
// <button> with aria-pressed, since chips are interactive filters, not
// static status labels.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const filterChipVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      active: {
        true: "border-transparent bg-mauve text-surface-dark",
        false: "border-hairline-dark bg-surface-card text-white/70 hover:border-mauve/40 hover:text-white",
      },
    },
    defaultVariants: { active: false },
  },
)

export interface FilterChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    VariantProps<typeof filterChipVariants> {}

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, active, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={!!active}
      className={cn(filterChipVariants({ active }), className)}
      {...props}
    />
  ),
)
FilterChip.displayName = "FilterChip"

/** Horizontally scrollable row of chips — hides the scrollbar but stays scrollable on mobile. */
export function FilterChipRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto no-scrollbar", className)}>
      {children}
    </div>
  )
}
