"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { toast } from "@/lib/components/ui/toaster"
import { Search, RefreshCw, Trash2, ShieldAlert, Play, Eye, Loader2, Calendar, Film, Clock, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"

type VideoItem = {
  id: string
  storage_path: string
  thumbnail_path: string | null
  original_filename: string | null
  mime_type: string | null
  file_size: number | null
  created_at: string
  metadata: any
  event: {
    name: string
    id: string
  } | null
  uploader: {
    id: string
    email: string
    full_name: string | null
  } | null
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)

  const fetchVideos = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/videos?pageSize=50")
      if (!res.ok) throw new Error("Failed to load videos")
      const result = await res.json()
      setVideos(result.data || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const handleDelete = async (videoId: string) => {
    if (!confirm("Are you sure you want to permanently delete this video? This cannot be undone.")) return
    setActioningId(videoId)
    try {
      const res = await fetch(`/api/admin/videos?videoIds=${videoId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete video")
      toast({ title: "Deleted", description: "Video deleted successfully." })
      setVideos(videos.filter(v => v.id !== videoId))
      if (selectedVideo?.id === videoId) setSelectedVideo(null)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setActioningId(null)
    }
  }

  const filteredVideos = videos.filter((v) => {
    const term = search.toLowerCase()
    return (
      (v.original_filename || "").toLowerCase().includes(term) ||
      (v.event?.name || "").toLowerCase().includes(term) ||
      (v.uploader?.email || "").toLowerCase().includes(term)
    )
  })

  return (
    <main className="px-6 py-8 space-y-6 bg-surface-dark min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-light tracking-tight text-ink">Video Management</h1>
          <p className="text-sm text-ink-secondary mt-1">Review guest video uploads, monitor durations, and manage storage consumption.</p>
        </div>
        <Button onClick={fetchVideos} variant="outline" className="h-9 gap-1.5 border-hairline-dark text-ink-secondary bg-surface-card hover:bg-mauve/5 font-semibold shadow-sm">
          <RefreshCw className="h-4 w-4 text-ink-secondary" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="flex items-center max-w-sm relative">
        <Search className="h-4 w-4 absolute left-3 text-ink-tertiary" />
        <Input
          placeholder="Filter by filename, event, or uploader..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-surface-card border-hairline-dark text-ink shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Videos List Grid */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm overflow-hidden lg:col-span-2">
          <CardContent className="p-6">
            {loading ? (
              <div className="p-12 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-mauve" />
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="p-12 text-center text-ink-tertiary text-sm font-semibold">
                No videos found in the database.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredVideos.map((v) => {
                  const fileSizeMb = v.file_size ? (v.file_size / (1024 * 1024)).toFixed(2) : "0.0"
                  const duration = v.metadata?.duration || "10"
                  return (
                    <div 
                      key={v.id}
                      onClick={() => setSelectedVideo(v)}
                      className={cn(
                        "group border rounded-xl overflow-hidden cursor-pointer bg-ink/5 hover:border-mauve/30 transition-all flex flex-col justify-between",
                        selectedVideo?.id === v.id ? "ring-2 ring-mauve/50 border-transparent" : "border-hairline-dark"
                      )}
                    >
                      <div className="h-32 bg-surface-dark flex items-center justify-center text-ink relative">
                        <Play className="h-8 w-8 opacity-70 group-hover:opacity-100 transition-opacity z-10 text-ink" />
                        <span className="text-[9px] font-mono text-ink absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 shadow-sm flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{duration}s</span>
                        </span>
                        <span className="text-[9px] uppercase font-bold text-ink absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/40">
                          {fileSizeMb} MB
                        </span>
                      </div>
                      <div className="p-3 text-[10px] space-y-1 bg-surface-card border-t border-hairline-dark">
                        <p className="font-bold text-ink truncate">{v.original_filename || "video.mp4"}</p>
                        <p className="text-ink-tertiary truncate">Event: {v.event?.name || "N/A"}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Video details panel */}
        <Card className="bg-surface-card border-hairline-dark shadow-sm p-6 sticky top-6">
          {selectedVideo ? (
            <div className="space-y-6">
              <div className="h-44 bg-surface-dark border border-hairline-dark rounded-xl flex flex-col items-center justify-center text-ink relative overflow-hidden">
                <Play className="h-10 w-10 text-ink opacity-80" />
                <span className="text-xs font-semibold text-ink-tertiary mt-2">Video File Selected</span>
                <span className="text-[10px] font-mono text-ink-tertiary mt-1 truncate max-w-[220px]">{selectedVideo.storage_path}</span>
              </div>

              <div className="border-t border-hairline-dark pt-4 space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Video ID</span>
                  <span className="font-mono text-ink-secondary font-semibold">{selectedVideo.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Filename</span>
                  <span className="text-ink-secondary font-semibold truncate max-w-[150px]">{selectedVideo.original_filename || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Event Name</span>
                  <span className="text-ink-secondary font-semibold">{selectedVideo.event?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Uploader Email</span>
                  <span className="text-ink-secondary font-semibold">{selectedVideo.uploader?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Duration</span>
                  <span className="text-ink-secondary font-semibold">{selectedVideo.metadata?.duration || "10"} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Size</span>
                  <span className="text-ink-secondary font-semibold flex items-center gap-0.5">
                    <HardDrive className="h-3.5 w-3.5 text-ink-tertiary" />
                    <span>{(selectedVideo.file_size ? selectedVideo.file_size / (1024 * 1024) : 0).toFixed(2)} MB</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-bold uppercase tracking-wider">Upload Date</span>
                  <span className="text-ink-secondary font-semibold">{new Date(selectedVideo.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-hairline-dark pt-4 space-y-2">
                <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-2">Controls</h4>
                <Button
                  onClick={() => handleDelete(selectedVideo.id)}
                  disabled={actioningId === selectedVideo.id}
                  className="w-full text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Video</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col justify-center items-center text-center text-ink-tertiary">
              <Film className="h-8 w-8 text-ink-tertiary mb-2" />
              <span className="text-xs font-semibold">Select any video card to review duration metadata, associated events, and execute deletion.</span>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
