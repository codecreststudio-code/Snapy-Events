"use server"

import { createClient } from "@/lib/supabase/server"

export type HealthStatus = {
  status: "healthy" | "degraded" | "down"
  latencyMs: number
}

export async function getSystemHealth(): Promise<HealthStatus> {
  const start = Date.now()
  try {
    const supabase = await createClient()
    // Perform a lightweight query to check db connectivity
    const { error } = await supabase.from("users").select("id").limit(1)
    const latencyMs = Date.now() - start
    
    if (error) {
      return { status: "degraded", latencyMs }
    }
    
    return { 
      status: latencyMs > 1000 ? "degraded" : "healthy", 
      latencyMs 
    }
  } catch (err) {
    return { status: "down", latencyMs: Date.now() - start }
  }
}
