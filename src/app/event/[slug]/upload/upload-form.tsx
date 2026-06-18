"use client"

import { useState } from "react"
import { Card } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/lib/components/ui/select"
import { UploadCloud, Check } from "lucide-react"

type Gallery = { id: string; name: string; slug: string; requires_access_code: boolean }

export function UploadForm({ galleries }: { galleries: Gallery[] }) {
  const [galleryId, setGalleryId] = useState(galleries[0]?.id ?? "")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [files, setFiles] = useState<FileList | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState<{ count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!files || !galleryId) return
    setPending(true); setError(null)
    let count = 0
    for (const f of Array.from(files)) {
      const fd = new FormData()
      fd.set("file", f)
      fd.set("uploader_name", name)
      fd.set("uploader_email", email)
      fd.set("is_approved", "true")
      const res = await fetch(`/api/photos/upload?gallery_id=${galleryId}`, { method: "POST", body: fd })
      if (res.ok) count++
    }
    if (count === 0) setError("No files uploaded — check size and format.")
    else setDone({ count })
    setPending(false)
  }

  if (done) return (
    <Card className="mt-8 p-8 text-center">
      <Check className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-3 text-lg font-medium">Thanks for sharing!</h2>
      <p className="mt-1 text-sm text-muted-foreground">{done.count} photos uploaded.</p>
    </Card>
  )

  return (
    <Card className="mt-8 p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label>Gallery</Label>
          <Select value={galleryId} onValueChange={setGalleryId}>
            <SelectTrigger><SelectValue placeholder="Pick a gallery" /></SelectTrigger>
            <SelectContent>{galleries.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2"><Label htmlFor="name">Your name (optional)</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="email">Email (optional)</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Drop photos here or click to choose</p>
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setFiles(e.target.files)} />
          {files && <p className="text-xs">{files.length} file(s) selected</p>}
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || !files}>{pending ? "Uploading…" : "Upload photos"}</Button>
      </form>
    </Card>
  )
}
