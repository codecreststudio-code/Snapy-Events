import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ok, fail } from "@/lib/api/handler"

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) return fail("AUTH_ERROR", error.message, 500)
  return ok({ loggedOut: true })
}
