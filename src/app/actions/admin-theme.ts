"use server"

import { createClient } from "@/lib/supabase/server"

export async function saveAdminTheme(theme: "light" | "dark" | "system") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase.auth.updateUser({
    data: { theme }
  })

  if (error) return { error: error.message }
  return { success: true }
}
