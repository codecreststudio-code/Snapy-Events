"use client"

// Thin re-export of Framer Motion's own `useReducedMotion` hook (it already
// reads `prefers-reduced-motion` and subscribes to changes) so every
// redesigned component imports its reduced-motion check from the same place
// as the rest of the shared motion foundation (`@/lib/motion/tokens`),
// instead of reaching into `framer-motion` directly and drifting.
export { useReducedMotion } from "framer-motion"
