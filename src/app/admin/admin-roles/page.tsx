import { getAdminProfiles } from "@/app/actions/admin-roles"
import { AdminRolesClient } from "./admin-roles-client"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Admin Roles | Snapsy Admin",
}

export default async function AdminRolesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: admins, success } = await getAdminProfiles()
  
  return <AdminRolesClient initialAdmins={(admins as any[]) || []} currentUserId={user?.id} />
}
