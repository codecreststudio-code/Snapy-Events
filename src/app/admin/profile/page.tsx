import { createClient } from "@/lib/supabase/server"
import { AdminProfileClient } from "./admin-profile-client"

export const metadata = {
  title: "Profile Settings | Snapsy Admin",
}

export default async function AdminProfilePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }
  
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, is_admin")
    .eq("id", user.id)
    .single()
    
  return <AdminProfileClient user={user} profile={profile} />
}
