"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { duration, easing } from "@/lib/motion/tokens"
import { useReducedMotion } from "@/lib/motion/use-reduced-motion"

interface CountdownValues {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(targetDate: string): CountdownValues {
  const difference = new Date(targetDate).getTime() - new Date().getTime()

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

export function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<CountdownValues>(() =>
    calculateTimeLeft(targetDate)
  )
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  const timeBlocks = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
      {timeBlocks.map(({ label, value }) => (
        <div key={label} className="text-center">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-hairline-dark bg-surface-card shadow-sm md:h-28 md:w-28">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={value}
                    initial={prefersReducedMotion ? { opacity: 0 } : { y: -12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { y: 12, opacity: 0 }}
                    transition={{ duration: duration.fast, ease: easing.easeOut }}
                    className="text-4xl font-bold text-ink md:text-5xl"
                  >
                    {value.toString().padStart(2, "0")}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-wider text-ink-tertiary">
                {label}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}