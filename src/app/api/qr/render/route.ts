import { NextResponse } from "next/server"
import { generateQrDataUrl } from "@/lib/integrations/qr"
import { ok } from "@/lib/api/response"
import { z } from "zod"

const renderSchema = z.object({
  data: z.string().min(1, "data is required").max(2048, "data must be ≤ 2048 characters"),
  size: z.number().int().min(64).max(2048).default(512),
})

export async function POST(request: Request) {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = renderSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { data, size } = parsed.data
  const png = await generateQrDataUrl({ data, size })
  return ok({ png })
}
