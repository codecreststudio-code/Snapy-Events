"use client"

import { use } from "react"
import AdminBlogEditorPage from "../../editor-client"

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <AdminBlogEditorPage postId={id} />
}
