import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"
import { createQRCodeSchema } from "@/lib/validators"
import { generateQrCode } from "@/lib/integrations/qr"
import { generateQrDataUrl } from "@/lib/integrations/qr"
import { uploadFile } from "@/lib/integrations/storage"

const params = z.object({ id: z.string().uuid() })

export const GET = defineRoute<unknown, unknown, { id: string }>({
  method: "GET",
  requireAuth: true,
  handler: async ({ params, auth }) => {
    const { id } = params
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("event_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
    if (error) return fail("DB_ERROR", error.message, 500)
    return ok(data ?? [])
  },
}).GET

export const POST = defineRoute<z.infer<typeof createQRCodeSchema>, unknown, { id: string }>({
  method: "POST",
  body: createQRCodeSchema,
  requireAuth: true,
  audit: "qr.created",
  handler: async ({ params, body, auth }) => {
    const { id } = params
    const code = generateQrCode()
    const supabase = await createClient()
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://snapy-events.vercel.app"
    const redirectUrl = `${base}/event/scan/${code}`
    const png = await generateQrDataUrl({ data: redirectUrl, size: 512 })
    const up = await uploadFile({ bucket: "QR_CODES", path: `${id}/${code}.png`, file: await dataUrlToBlob(png), contentType: "image/png" })
    const { data, error } = await supabase
      .from("qr_codes")
      .insert({
        event_id: id,
        gallery_id: body.gallery_id ?? null,
        code,
        name: body.name ?? null,
        redirect_url: redirectUrl,
        expires_at: body.expires_at ?? null,
        settings: { qr_storage_path: up.path },
      })
      .select()
      .single()
    if (error) return fail("DB_ERROR", error.message, 400)
    return ok(data)
  },
}).POST

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}
