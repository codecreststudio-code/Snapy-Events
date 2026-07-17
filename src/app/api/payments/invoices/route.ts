import { z } from "zod"
import { defineRoute, ok, fail, paginate } from "@/lib/api/handler"
import { createClient } from "@/lib/supabase/server"

const querySchema = z.object({ 
  page: z.coerce.number().min(1).default(1), 
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["created", "issued", "paid", "expired", "cancelled"]).optional(),
  sort: z.enum(["issued_at", "paid_at", "total"]).default("issued_at"),
})

export const GET = defineRoute({
  method: "GET",
  query: querySchema,
  requireAuth: true,
  audit: "billing.invoices.viewed",
  handler: async ({ query, auth }) => {
    const supabase = await createClient()
    
    let q = supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        status,
        currency,
        subtotal,
        tax,
        total,
        issued_at,
        paid_at,
        due_at,
        subscription:subscriptions(
          id,
          plan:plans(id, name)
        )
      `, { count: "exact" })
      .eq("user_id", auth.user!.id)

    if (query.status) {
      q = q.eq("status", query.status)
    }

    const { data, count, error } = await q
      .order(query.sort, { ascending: false })
      .range((query.page - 1) * query.pageSize, query.pageSize - 1)

    if (error) return fail("DB_ERROR", error.message, 500)
    
    return ok(data ?? [], { 
      pagination: paginate({ 
        page: query.page, 
        pageSize: query.pageSize, 
        total: count ?? 0 
      }) 
    })
  },
}).GET
