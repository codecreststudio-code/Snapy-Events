import DashboardClient from "./dashboard-client"

export const metadata = {
  title: "Admin Dashboard | Snapsy",
  description: "Snapsy Platform Executive Management Portal",
}

export default async function AdminHome() {
  return <DashboardClient />
}
