"use client"

import React from "react"
import { useCurrency, Currency } from "@/lib/context/currency-context"
import { cn } from "@/lib/utils"
import { Globe } from "lucide-react"

export function CurrencyToggle({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className={cn("inline-flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner", className)}>
      <div className="px-1.5 text-slate-400 flex items-center gap-1">
        <Globe className="h-3.5 w-3.5" />
      </div>
      <button
        type="button"
        onClick={() => setCurrency("INR")}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-extrabold transition-all duration-200 flex items-center gap-1",
          currency === "INR"
            ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 scale-[1.02]"
            : "text-slate-500 hover:text-slate-800"
        )}
      >
        <span>₹</span>
        <span>INR</span>
      </button>

      <button
        type="button"
        onClick={() => setCurrency("USD")}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-extrabold transition-all duration-200 flex items-center gap-1",
          currency === "USD"
            ? "bg-violet-600 text-white shadow-sm scale-[1.02]"
            : "text-slate-500 hover:text-slate-800"
        )}
      >
        <span>$</span>
        <span>USD</span>
      </button>
    </div>
  )
}
