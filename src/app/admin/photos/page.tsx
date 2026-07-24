"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Search, RefreshCw, Trash2, CheckCircle2, ShieldAlert, AlertTriangle, Eye, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type PhotoItem = {
  id: string
  storage_path: string
  original_filename: string | null
  mime_type: string | null
  file_size: number | null
  is_approved: boolean
  created_at: string
  event: {
    name: string
  } | null
}

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)

  const fetchPhotos = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/photos?pageSize=50")
      if (!res.ok) throw new Error("Failed to load photos")
      const result = await res.json()
      setPhotos(result.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPhotos()
  }, [])

  const handleApprove = async (photoId: string) => {
    setActioningId(photoId)
    try {
      const res = await fetch("/api/admin/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: [photoId], action: "approve" }),
      })
      if (!res.ok) throw new Error("Failed to approve photo")
      toast({ title: "Approved", description: "Photo approved successfully." })
      setPhotos(photos.map(p => p.id === photoId ? { ...p, is_approved: true } : p))
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(prev => prev ? { ...prev, is_approved: true } : null)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to permanently delete this photo? This cannot be undone.")) return
    setActioningId(photoId)
    try {
      const res = await fetch(`/api/admin/photos?photoIds=${photoId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete photo")
      toast({ title: "Deleted", description: "Photo deleted from server storage." })
      setPhotos(photos.filter(p => p.id !== photoId))
      if (selectedPhoto?.id === photoId) setSelectedPhoto(null)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const filteredPhotos = photos.filter((p) => {
    const term = search.toLowerCase()
    return (
      (p.original_filename || "").toLowerCase().includes(term) ||
      (p.event?.name || "").toLowerCase().includes(term)
    )
  })

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-ink">Photo Moderation Center</h1>
          <p className="text-sm text-ink-secondary mt-1">Review guest uploads, filter flagged content, and perform safety audits.</p>
        </div>
        <Button onClick={fetchPhotos} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-ink-secondary bg-surface-card hover:bg-mauve/5 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-ink-secondary" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-ink-tertiary" />
        <Input
          placeholder="Filter by filename or event name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-surface-card border-hairline-dark text-ink shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Photos Grid List */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-6">
            {loading ? (
              <div className="p-12 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-mauve" />
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="p-12 text-center text-ink-tertiary text-sm font-semibold">
                No recent photos found on the server.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredPhotos.map((p) => {
                  const fileSizeMb = p.file_size ? (p.file_size / (1024 * 1024)).toFixed(2) : "0.0"
                  return (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedPhoto(p)}
                      className={cn(
                        "group border rounded-xl overflow-hidden cursor-pointer bg-ink/5 hover:border-mauve/30 transition-all",
                        selectedPhoto?.id === p.id ? "ring-2 ring-mauve/50 border-transparent" : "border-hairline-dark"
                      )}
                    >
                      <div className="h-28 bg-ink/10 flex items-center justify-center text-ink-tertiary relative">
                        <Eye className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-ink-secondary" />
                        <div className="absolute inset-0 bg-ink/5 group-hover:bg-black/30 transition-colors" />
                        <span className="text-[10px] uppercase font-bold text-ink-secondary absolute top-2 left-2 px-1.5 py-0.5 rounded bg-surface-card shadow-sm">
                          {fileSizeMb} MB
                        </span>
                        {!p.is_approved && (
                          <span className="bg-amber-500 text-white text-[8px] uppercase font-extrabold px-1.5 py-0.5 rounded absolute bottom-2 right-2 flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            <span>Review</span>
                          </span>
                        )}
                      </div>
                      <div className="p-3 text-[10px] space-y-1">
                        <p className="font-bold text-ink truncate">{p.original_filename || "untitled.jpg"}</p>
                        <p className="text-ink-tertiary truncate">{p.event?.name || "N/A"}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Photo Inspector Drawer */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm p-6 sticky top-6">
          {selectedPhoto ? (
            <div className="space-y-6">
              <div className="h-44 bg-ink/5 border border-hairline-dark rounded-xl flex flex-col items-center justify-center text-ink-tertiary relative overflow-hidden">
                <div className="absolute inset-0 bg-ink/5" />
                <Eye className="h-8 w-8 text-ink-tertiary z-10" />
                <span className="text-xs font-semibold z-10 text-ink-secondary mt-2">Storage File Preview</span>
                <span className="text-[10px] font-mono text-ink-tertiary mt-1 truncate max-w-[200px] z-10">{selectedPhoto.storage_path}</span>
              </div>

              <div className="border-t border-hairline-dark pt-4 space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Photo ID</span>
                  <span className="font-mono text-ink-secondary font-semibold">{selectedPhoto.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Filename</span>
                  <span className="text-ink-secondary font-semibold truncate max-w-[150px]">{selectedPhoto.original_filename || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">MIME Type</span>
                  <span className="text-ink-secondary font-semibold">{selectedPhoto.mime_type || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Event Name</span>
                  <span className="text-ink-secondary font-semibold">{selectedPhoto.event?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Upload Date</span>
                  <span className="text-ink-secondary font-semibold">{new Date(selectedPhoto.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Status</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase",
                    selectedPhoto.is_approved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {selectedPhoto.is_approved ? "Approved" : "Review Needed"}
                  </span>
                </div>
              </div>

              <div className="border-t border-hairline-dark pt-4 space-y-2">
                <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-2">Moderation Options</h4>
                <div className="grid grid-cols-2 gap-2">
                  {!selectedPhoto.is_approved ? (
                    <Button
                      onClick={() => handleApprove(selectedPhoto.id)}
                      disabled={actioningId === selectedPhoto.id}
                      className="w-full text-xs font-bold bg-mauve hover:bg-mauve-strong text-[#1a1410] shadow-sm flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve</span>
                    </Button>
                  ) : (
                    <Button
                      disabled
                      variant="outline"
                      className="w-full text-xs font-bold text-ink-tertiary border-hairline-dark bg-ink/5 cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approved</span>
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDelete(selectedPhoto.id)}
                    disabled={actioningId === selectedPhoto.id}
                    className="w-full text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 shadow-sm flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-center text-ink-tertiary">
              <ShieldAlert className="h-8 w-8 text-ink-tertiary mb-2" />
              <span className="text-xs font-semibold">Select any photo thumbnail to inspect server path metadata, view larger sizes, and execute moderation filters.</span>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
