"use client"

import { useEffect } from "react"
import Clarity from "@microsoft/clarity"

interface MicrosoftClarityProps {
  projectId?: string
}

export function MicrosoftClarity({ projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID }: MicrosoftClarityProps) {
  useEffect(() => {
    if (!projectId || typeof window === "undefined") {
      return
    }

    try {
      Clarity.init(projectId)
    } catch (error) {
      console.error("[Microsoft Clarity] Failed to initialize:", error)
    }
  }, [projectId])

  return null
}

/** Helper to identify users in Clarity sessions */
export function identifyClarityUser(customId: string, customSessionId?: string, customPageId?: string, friendlyName?: string) {
  if (typeof window !== "undefined" && Clarity) {
    try {
      Clarity.identify(customId, customSessionId, customPageId, friendlyName)
    } catch (err) {
      console.warn("[Microsoft Clarity] Identify error:", err)
    }
  }
}

/** Helper to track custom events in Clarity */
export function trackClarityEvent(eventName: string) {
  if (typeof window !== "undefined" && Clarity) {
    try {
      Clarity.event(eventName)
    } catch (err) {
      console.warn("[Microsoft Clarity] Event error:", err)
    }
  }
}

/** Helper to set custom tags in Clarity */
export function setClarityTag(key: string, value: string | string[]) {
  if (typeof window !== "undefined" && Clarity) {
    try {
      Clarity.setTag(key, value)
    } catch (err) {
      console.warn("[Microsoft Clarity] SetTag error:", err)
    }
  }
}
