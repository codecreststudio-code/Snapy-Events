// src/lib/supabase/admin.ts
// Service-role Supabase client. Bypasses RLS. ONLY use in server-side
// trusted contexts (webhooks, cron jobs, admin tasks).

import { createServiceClient } from "@/lib/supabase/server"
import { serverEnv } from "@/lib/env"

export async function adminDb() {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")
  }
  return createServiceClient()
}
