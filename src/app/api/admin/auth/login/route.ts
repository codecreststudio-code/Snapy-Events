import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute, fail, created } from "@/lib/api/handler"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const POST = defineRoute({
  method: "POST",
  body: bodySchema,
  rateLimit: { key: "admin:login", limit: 5, windowSeconds: 60 },
  handler: async ({ body }) => {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com"
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123"

    const supabase = await createClient()

    // 1. Check if the admin user exists. If not, auto-seed.
    if (body.email === adminEmail && body.password === adminPassword) {
      const serviceClient = await createServiceClient()
      
      const { data: dbUser } = await serviceClient
        .from("users")
        .select("id")
        .eq("email", adminEmail)
        .maybeSingle()

      if (!dbUser) {
        // Attempt to create in Supabase Auth (or fetch if already created in Auth)
        try {
          const { data: authUser, error: authCreateErr } = await serviceClient.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: { full_name: "Super Admin" },
          })

          let userId = authUser?.user?.id

          if (authCreateErr) {
            // User might already exist in Auth but not in DB
            const { data: authList } = await serviceClient.auth.admin.listUsers()
            const foundUser = authList?.users?.find((u) => u.email === adminEmail)
            if (foundUser) {
              userId = foundUser.id
            } else {
              throw authCreateErr
            }
          }

          if (userId) {
            // Create a Premium Organization
            const { data: org } = await serviceClient
              .from("organizations")
              .insert({
                name: "Admin Workspace",
                slug: "admin-workspace",
                plan: "premium",
                settings: { is_admin_org: true },
              })
              .select()
              .single()

            if (org) {
              // Create user profile in DB
              await serviceClient.from("users").insert({
                id: userId,
                email: adminEmail,
                full_name: "Super Admin",
                role: "owner",
                is_admin: true,
                organization_id: org.id,
                permissions: ["*"],
              })
            }
          }
        } catch (err) {
          console.error("Failed to auto-seed admin credentials:", err)
        }
      }
    }

    // 2. Authenticate the admin user
    const { data, error } = await supabase.auth.signInWithPassword(body)
    if (error || !data.user) return fail("AUTH_ERROR", "Invalid credentials", 401)

    // 3. Confirm platform admin privileges
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin, role")
      .eq("id", data.user.id)
      .single()

    if (!profile?.is_admin && profile?.role !== "owner") {
      return fail("FORBIDDEN", "Not a platform admin", 403)
    }

    return created({ user: { id: data.user.id, email: data.user.email } })
  },
}).POST
