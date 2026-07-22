// src/lib/audit/log.ts
// Writes immutable audit records for sensitive actions.

import { createServiceClient } from "@/lib/supabase/server"
import type { NextRequest } from "next/server"
import { getClientIp } from "@/lib/security/client-ip"

export interface AuditInput {
  user_id?: string | null
  action: string
  resource_type: string
  resource_id: string | null
  changes?: Record<string, unknown> | null
  request?: NextRequest
}

export async function logAudit(input: AuditInput) {
  try {
    const supabase = await createServiceClient()
    const ip = input.request ? getClientIp(input.request.headers) : null
    const ua = input.request?.headers.get("user-agent") ?? null
    await supabase.from("audit_logs").insert({
      user_id: input.user_id,
      action: input.action,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      changes: input.changes ?? null,
      ip_address: ip,
      user_agent: ua,
    })
  } catch (e) {
    // Never let audit failures break the main flow.
    console.error("[audit] failed to write log", e)
  }
}
