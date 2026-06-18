// src/lib/logger.ts
// Tiny structured logger. Sentry capture is wired in via the Sentry shim
// in `instrumentation.ts` (no-op if SENTRY_DSN is not set).

type Level = "debug" | "info" | "warn" | "error"

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ?? {}),
  }
  const line = JSON.stringify(payload)
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
  // Sentry shim
  if (level === "error" && typeof globalThis !== "undefined") {
    const sentry = (globalThis as { Sentry?: { captureException: (e: unknown) => void } }).Sentry
    if (sentry?.captureException) {
      sentry.captureException(new Error(msg))
    }
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
}
