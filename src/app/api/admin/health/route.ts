import { defineRoute } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const GET = defineRoute({
  method: "GET",
  requireAuth: "admin",
  handler: async () => {
    try {
      const supabase = await createClient()
      
      // Perform a lightweight query to check DB health
      const { data, error } = await supabase.from("users").select("id").limit(1)
      
      if (error) {
        return NextResponse.json({ status: "degraded", error: error.message }, { status: 503 })
      }
      
      return NextResponse.json({ status: "healthy", timestamp: new Date().toISOString() })
    } catch (e: any) {
      return NextResponse.json({ status: "offline", error: e.message }, { status: 503 })
    }
  }
}).GET
