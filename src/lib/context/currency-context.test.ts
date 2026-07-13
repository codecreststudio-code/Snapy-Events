import { describe, it, expect } from "vitest"

describe("Currency Switcher & Price Formatter", () => {
  const INR_EXCHANGE_RATE = 80

  function formatPrice(amountInr: number, amountUsd?: number, currency: "INR" | "USD" = "INR"): string {
    if (currency === "USD") {
      const usdValue = amountUsd ?? Math.round(amountInr / INR_EXCHANGE_RATE)
      return `$${usdValue.toLocaleString("en-US")}`
    }
    return `₹${amountInr.toLocaleString("en-IN")}`
  }

  function getPrice(amountInr: number, amountUsd?: number, currency: "INR" | "USD" = "INR"): number {
    if (currency === "USD") {
      return amountUsd ?? Math.round(amountInr / INR_EXCHANGE_RATE)
    }
    return amountInr
  }

  it("formats prices in INR by default", () => {
    expect(formatPrice(1499, 18, "INR")).toBe("₹1,499")
    expect(getPrice(1499, 18, "INR")).toBe(1499)
  })

  it("formats prices in USD when currency is set to USD", () => {
    expect(formatPrice(1499, 18, "USD")).toBe("$18")
    expect(getPrice(1499, 18, "USD")).toBe(18)
  })

  it("falls back to estimated exchange rate if price_usd is missing", () => {
    expect(formatPrice(4000, undefined, "USD")).toBe("$50")
    expect(getPrice(4000, undefined, "USD")).toBe(50)
  })
})
