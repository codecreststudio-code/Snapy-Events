import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateQrDataUrl } from "@/lib/integrations/qr"
import { ok } from "@/lib/api/response"

const bodySchema = { data: "", size: 512 }

export async function POST(request: Request) {
  let body: { data: string; size?: number }
  try { body = await request.json() } catch { body = bodySchema }
  if (!body?.data) return NextResponse.json({ success: false, error: "Missing data" }, { status: 422 })
  const png = await generateQrDataUrl({ data: body.data, size: body.size ?? 512 })
  return ok({ png })
}
