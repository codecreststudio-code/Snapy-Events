"use client"

import { useState, useEffect } from "react"

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
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-card shadow-sm md:h-28 md:w-28">
                <span className="text-4xl font-bold md:text-5xl">
                  {value.toString().padStart(2, "0")}
                </span>
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-wider text-muted-foreground">
                {label}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}