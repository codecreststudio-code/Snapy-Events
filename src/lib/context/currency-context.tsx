"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type Currency = "INR" | "USD"

interface CurrencyContextType {
  currency: Currency
  symbol: string
  setCurrency: (curr: Currency) => void
  formatPrice: (priceInr: number, priceUsd: number) => string
  getPrice: (priceInr: number, priceUsd: number) => number
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("INR")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("snapsy_currency") as Currency | null
      if (saved === "USD" || saved === "INR") {
        setCurrencyState(saved)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const setCurrency = (c: Currency) => {
    setCurrencyState(c)
    try {
      localStorage.setItem("snapsy_currency", c)
      document.cookie = `snapsy_currency=${c}; path=/; max-age=31536000`
    } catch {
      // ignore storage errors
    }
  }

  const symbol = currency === "USD" ? "$" : "₹"

  const getPrice = (priceInr: number, priceUsd: number) => {
    if (currency === "USD") {
      if (priceInr === 0) return 0
      // If priceUsd is not explicitly set, calculate fallback approximation ($1 = ~₹83)
      return priceUsd > 0 ? priceUsd : Math.round(priceInr / 80) || 1
    }
    return priceInr
  }

  const formatPrice = (priceInr: number, priceUsd: number) => {
    const val = getPrice(priceInr, priceUsd)
    return `${symbol}${val}`
  }

  return (
    <CurrencyContext.Provider value={{ currency, symbol, setCurrency, formatPrice, getPrice }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    return {
      currency: "INR" as Currency,
      symbol: "₹",
      setCurrency: () => {},
      formatPrice: (inr: number, usd: number) => `₹${inr}`,
      getPrice: (inr: number, usd: number) => inr,
    }
  }
  return ctx
}
