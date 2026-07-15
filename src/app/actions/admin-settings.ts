"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export async function getPlatformSettings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: "Unauthorized" }
  
  // Verify user is admin
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single()
    
  if (!profile?.is_admin) {
    return { success: false, error: "Unauthorized" }
  }

  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value")
    
  if (error) {
    console.error("Error fetching platform settings:", error)
    return { success: false, error: error.message }
  }
  
  // Convert array of {key, value} to an object
  const settingsObj = data.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, any>)
  
  return { success: true, data: settingsObj }
}

export async function updatePlatformSettings(key: string, value: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Unauthorized" }

  // Verify user is admin
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) {
    return { success: false, error: "Unauthorized" }
  }

  // Merge (rather than replace) when both the incoming and existing values are
  // plain objects. Multiple admin screens write different subsets of keys
  // under the same settings `key` (e.g. Admin > Settings and Admin > Feature
  // Flags both write `feature_flags`) — a blind overwrite here meant saving
  // from one screen silently deleted whatever fields only the other screen
  // knew about. A shallow merge lets each screen safely save just the fields
  // it owns without touching the rest.
  let nextValue = value
  if (isPlainObject(value)) {
    const { data: existingRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle()
    if (isPlainObject(existingRow?.value)) {
      nextValue = { ...(existingRow!.value as Record<string, any>), ...value }
    }
  }

  const { error } = await supabase
    .from("platform_settings")
    .upsert({
      key,
      value: nextValue,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })
    
  if (error) {
    console.error(`Error updating platform settings for key ${key}:`, error)
    return { success: false, error: error.message }
  }
  
  revalidatePath("/admin/settings")
  revalidatePath("/admin/feature-flags")
  return { success: true }
}
