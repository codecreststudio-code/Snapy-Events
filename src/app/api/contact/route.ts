import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, fail, ok } from "@/lib/api/handler"
import { createServiceClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/integrations/resend"

const form = z.object({ name: z.string().min(1), email: z.string().email(), message: z.string().min(10) })

export const POST = defineRoute({
  method: "POST",
  body: form,
  rateLimit: { key: "contact", limit: 5, windowSeconds: 60 },
  handler: async ({ body }) => {
    const supabase = await createServiceClient()
    await supabase.from("support_tickets").insert({
      subject: `Contact form: ${body.name}`,
      status: "open",
      priority: "normal",
      requester_email: body.email,
      requester_name: body.name,
      organization_id: null,
      messages: [{ from: "requester", body: body.message, created_at: new Date().toISOString() }],
    })
    void sendEmail({ to: "hello@snapsy.app", subject: `Contact form: ${body.name}`, html: `<p>${body.message}</p><p>From: ${body.name} &lt;${body.email}&gt;</p>` })
    return ok({ sent: true })
  },
}).POST
