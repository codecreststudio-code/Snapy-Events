// Edit page: reuses the New page editor with pre-filled data
// For the static data system, we redirect to /admin/blog/new with an id param
// In a full DB-backed system, this would load the post by ID
import { redirect } from "next/navigation"

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // For now, redirect to new page (in production, load post by ID and pre-fill editor)
  redirect(`/admin/blog/new?id=${id}`)
}
