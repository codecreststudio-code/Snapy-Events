import { z } from "zod"
import { defineRoute, ok, fail } from "@/lib/api/handler"
import { generateQrDataUrl } from "@/lib/integrations/qr"

const renderSchema = z.object({
  data: z.string().min(1, "data is required").max(2048, "data must be ≤ 2048 characters"),
  size: z.number().int().min(64).max(2048).default(512),
})

export const POST = defineRoute({
  method: "POST",
  body: renderSchema,
  handler: async ({ body }) => {
    const png = await generateQrDataUrl({ data: body.data, size: body.size })
    return ok({ png })
  },
}).POST
