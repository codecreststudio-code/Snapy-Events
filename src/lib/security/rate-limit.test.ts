import { describe, it, expect } from "vitest"
import { rateLimit } from "./rate-limit"

describe("Rate Limiter Security Engine", () => {
  it("enforces strict rate limits and blocks requests exceeding the threshold", async () => {
    const key = `test:ip:127.0.0.1:${Date.now()}`
    const limit = 3
    const windowSeconds = 60

    const r1 = await rateLimit({ key, limit, windowSeconds })
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = await rateLimit({ key, limit, windowSeconds })
    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = await rateLimit({ key, limit, windowSeconds })
    expect(r3.allowed).toBe(true)
    expect(r3.remaining).toBe(0)

    // 4th attempt exceeds limit
    const r4 = await rateLimit({ key, limit, windowSeconds })
    expect(r4.allowed).toBe(false)
    expect(r4.remaining).toBe(0)
    expect(r4.resetIn).toBeGreaterThan(0)
  })
})
