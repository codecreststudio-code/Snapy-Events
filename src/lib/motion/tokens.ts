// Shared motion foundation for the guest-facing flow (and, over time, the
// rest of the app). Centralizing durations/easings/variants here means every
// redesigned screen moves with the same "premium" feel instead of each
// component inventing its own timing — and gives us exactly one place to
// tune the whole app's motion later.
//
// Easing curves are expressed as cubic-bezier arrays (Framer Motion's
// `ease` prop accepts these directly). `easeOut` in particular is the classic
// "expo-out" curve used by Apple/Linear/Vercel-style interfaces for anything
// entering the screen — fast start, gentle settle, never bouncy unless we
// explicitly want a spring (see `spring` below).
export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const

export const easing = {
  // Snappy, decisive — default for most enter/exit transitions.
  easeOut: [0.16, 1, 0.3, 1] as const,
  // Symmetric, for things that move both in and out of view (tabs, toggles).
  easeInOut: [0.65, 0, 0.35, 1] as const,
  // Subtle deceleration for large surfaces (page/section reveals).
  gentle: [0.22, 1, 0.36, 1] as const,
}

// Spring presets for anything that should feel physical/tactile (button
// presses, shutter buttons, drag-released elements) rather than eased.
export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 30, mass: 0.5 },
  soft: { type: "spring", stiffness: 300, damping: 26 },
  bouncy: { type: "spring", stiffness: 400, damping: 17 },
} as const

// Stagger timing for lists/grids of items revealing in sequence (form
// fields, gallery grids, filter carousels).
export const stagger = {
  tight: 0.04,
  base: 0.06,
  loose: 0.09,
}

// --- Reusable Framer Motion variants -------------------------------------
// Import these directly into `motion.div` etc. via `variants={fadeInUp}`.
// Each respects reduced-motion by keeping opacity-only fallback logic out of
// here (handled instead by the `usePrefersReducedMotion` hook below, which
// callers use to pick a near-instant duration/no-transform variant).

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base, ease: easing.easeOut } },
}

export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easing.easeOut },
  },
}

export const fadeInDown = {
  hidden: { opacity: 0, y: -12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easing.easeOut },
  },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.base, ease: easing.easeOut },
  },
}

// Parent container that staggers its children's own variants (pair with
// fadeInUp/scaleIn on each child).
export function staggerContainer(staggerAmount: number = stagger.base, delayChildren = 0) {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerAmount,
        delayChildren,
      },
    },
  }
}

// Press feedback for tappable surfaces (buttons, cards, shutter). Use with
// `whileTap={tapScale}` directly — no variants wiring needed.
export const tapScale = { scale: 0.96 }
export const tapScaleSubtle = { scale: 0.98 }
