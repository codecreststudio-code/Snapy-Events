"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getAdminProfiles() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: "Unauthorized" }
  
  const { data: currentUserProfile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single()
    
  if (!currentUserProfile?.is_admin) {
    return { success: false, error: "Unauthorized" }
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, created_at")
    .eq("is_admin", true)
    
  if (error) {
    console.error("Error fetching admin profiles:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function revokeAdminAccess(userIdToRevoke: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: "Unauthorized" }
  if (user.id === userIdToRevoke) return { success: false, error: "Cannot revoke your own access" }
  
  const { data: currentUserProfile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single()
    
  if (!currentUserProfile?.is_admin) {
    return { success: false, error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("users")
    .update({ is_admin: false })
    .eq("id", userIdToRevoke)
    
  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath("/admin/admin-roles")
  return { success: true }
}

export async function grantAdminAccessByEmail(email: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: "Unauthorized" }
  
  const { data: currentUserProfile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single()
    
  if (!currentUserProfile?.is_admin) {
    return { success: false, error: "Unauthorized" }
  }

  // Find user by email in the public.users table
  const { data: targetUser, error: findError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single()
    
  if (findError || !targetUser) {
    return { success: false, error: "User with this email not found in the system. They must sign up first." }
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ is_admin: true })
    .eq("id", targetUser.id)
    
  if (updateError) {
    return { success: false, error: updateError.message }
  }
  
  revalidatePath("/admin/admin-roles")
  return { success: true }
}
