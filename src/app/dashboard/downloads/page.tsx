"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks"
import { formatDate, formatBytes } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Badge } from "@/lib/components/ui/badge"
import { Skeleton } from "@/lib/components/ui/skeleton"
import { Checkbox } from "@/lib/components/ui/checkbox"
import { Progress } from "@/lib/components/ui/progress"
import { toast } from "@/lib/components/ui/toaster"
import {
  Download,
  FileImage,
  History,
  Image,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import type { Photo } from "@/lib/types"

interface DownloadItem {
  id: string
  filename: string
  size: number
  gallery_name: string
  event_name: string
  created_at: string
  storage_path: string
}

async function getDownloads(eventIds: string[]): Promise<DownloadItem[]> {
  if (eventIds.length === 0) return []
  const supabase = createClient()

  const { data: photos, error } = await supabase
    .from("photos")
    .select(`
      id,
      original_filename,
      file_size,
      storage_path,
      created_at,
      gallery:galleries(name, event:events(name))
    `)
    .in("event_id", eventIds)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) throw error

  return (photos || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    filename: (p.original_filename as string) || "untitled.jpg",
    size: (p.file_size as number) || 0,
    gallery_name: ((p.gallery as { name?: string })?.name) || "Unknown Gallery",
    event_name: ((p.gallery as { event?: { name?: string } })?.event?.name) || "Unknown Event",
    created_at: p.created_at as string,
    storage_path: p.storage_path as string,
  }))
}

async function getEvents(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("host_id", orgId)

  if (error) throw error
  return data || []
}

async function getDownloadHistory() {
  const supabase = createClient()
  return []
}

async function downloadPhoto(storagePath: string, filename: string) {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(storagePath, 3600)

  if (error || !data?.signedUrl) {
    throw new Error("Failed to generate download URL")
  }

  const link = document.createElement("a")
  link.href = data.signedUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function downloadMultiple(items: DownloadItem[]) {
  for (const item of items) {
    try {
      await downloadPhoto(item.storage_path, item.filename)
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (err) {
      console.error(`Failed to download ${item.filename}:`, err)
    }
  }
}

export default function DownloadsPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const orgId = profile?.id
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events-list", orgId],
    queryFn: () => getEvents(orgId!),
    enabled: !!orgId,
  })

  const eventIds = events?.map((e: any) => e.id) || []

  const { data: downloads, isLoading: downloadsLoading } = useQuery({
    queryKey: ["downloads", eventIds],
    queryFn: () => getDownloads(eventIds),
    enabled: !!events,
  })

  const totalSize = downloads?.reduce((acc, d) => acc + d.size, 0) || 0
  const selectedSize = downloads
    ?.filter((d) => selectedIds.has(d.id))
    .reduce((acc, d) => acc + d.size, 0) || 0

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === downloads?.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(downloads?.map((d) => d.id) || []))
    }
  }

  async function handleBulkDownload() {
    if (selectedIds.size === 0) return

    setIsDownloading(true)
    setDownloadProgress(0)

    const selectedItems = downloads?.filter((d) => selectedIds.has(d.id)) || []

    for (let i = 0; i < selectedItems.length; i++) {
      try {
        await downloadPhoto(selectedItems[i].storage_path, selectedItems[i].filename)
        setDownloadProgress(((i + 1) / selectedItems.length) * 100)
        await new Promise((resolve) => setTimeout(resolve, 300))
      } catch (err) {
        toast({
          title: `Failed to download ${selectedItems[i].filename}`,
          variant: "destructive",
        })
      }
    }

    setIsDownloading(false)
    setDownloadProgress(0)
    toast({ title: `Downloaded ${selectedItems.length} file(s)` })
  }

  const isLoading = authLoading || (!!orgId && (eventsLoading || downloadsLoading))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
        <p className="text-muted-foreground">Download your photos and view download history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Photos</p>
              <p className="text-2xl font-semibold">{downloads?.length || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Size</p>
              <p className="text-2xl font-semibold">{formatBytes(totalSize)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="text-2xl font-semibold">
                {selectedIds.size} ({formatBytes(selectedSize)})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  {selectedIds.size} photo(s) selected
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download Selected
                    </>
                  )}
                </Button>
              </div>
            </div>
            {isDownloading && (
              <Progress value={downloadProgress} className="mt-4" />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Downloads</CardTitle>
              <CardDescription>Photos available for download</CardDescription>
            </div>
            {downloads && downloads.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === downloads.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {downloads && downloads.length > 0 ? (
            <div className="divide-y">
              {downloads.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                    <FileImage className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.filename}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.event_name} · {item.gallery_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatBytes(item.size)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => downloadPhoto(item.storage_path, item.filename)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Image className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No downloads available</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Photos you upload to your galleries will appear here for download.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Download History</CardTitle>
          </div>
          <CardDescription>Recent download activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No download history</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Your download history will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}