"use client"

import React from "react"
import { useCurrency, Currency } from "@/lib/context/currency-context"
import { cn } from "@/lib/utils"
import { Globe } from "lucide-react"

export function CurrencyToggle({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className={cn("inline-flex items-center gap-1 bg-mauve/10 p-1 rounded-full border border-mauve/20 shadow-sm backdrop-blur-md", className)}>
      <div className="pl-2 pr-0.5 text-mauve/80 flex items-center justify-center">
        <Globe className="h-3.5 w-3.5" />
      </div>

      <button
        type="button"
        onClick={() => setCurrency("INR")}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer",
          currency === "INR"
            ? "bg-mauve text-[#faf6ed] shadow-md shadow-mauve/20 scale-[1.02]"
            : "text-ink-secondary hover:text-ink hover:bg-mauve/10"
        )}
      >
        <span>₹</span>
        <span>INR</span>
      </button>

      <button
        type="button"
        onClick={() => setCurrency("USD")}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer",
          currency === "USD"
            ? "bg-mauve text-[#faf6ed] shadow-md shadow-mauve/20 scale-[1.02]"
            : "text-ink-secondary hover:text-ink hover:bg-mauve/10"
        )}
      >
        <span>$</span>
        <span>USD</span>
      </button>
    </div>
  )
}
