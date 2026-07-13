"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks"
import { generateCode } from "@/lib/utils"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Skeleton } from "@/lib/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/lib/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"
import { toast } from "@/lib/components/ui/toaster"
import {
  Copy,
  Download,
  Link2,
  MoreVertical,
  Plus,
  QrCode,
  Trash2,
  ExternalLink,
  Camera,
  Search,
  Filter,
} from "lucide-react"
import type { QRCode } from "@/lib/types"

interface QRCodeWithEvent extends QRCode {
  event?: {
    name: string
    slug: string
  }
}

async function getAllQRCodes(eventIds: string[]): Promise<QRCodeWithEvent[]> {
  if (eventIds.length === 0) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*, event:events(name, slug)")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

async function getEvents(orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id, name, slug")
    .eq("host_id", orgId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

async function getGalleries(eventId: string): Promise<any[]> {
  if (!eventId) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("galleries")
    .select("id, name, slug")
    .eq("event_id", eventId)

  if (error) throw error
  return data || []
}

async function createQRCode(data: {
  event_id: string
  gallery_id?: string
  name: string
  redirect_url?: string
}) {
  const supabase = createClient()
  const code = generateCode(8)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"
  const redirectUrl = data.redirect_url || `${baseUrl}/event/scan/${code}`

  const qrData = {
    event_id: data.event_id,
    gallery_id: data.gallery_id || null,
    code,
    name: data.name,
    redirect_url: redirectUrl,
    scan_count: 0,
    is_active: true,
    settings: {},
  }

  const { error } = await supabase.from("qr_codes").insert(qrData)
  if (error) throw new Error(error.message)
  return { code, redirectUrl }
}

async function deleteQRCode(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from("qr_codes").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

async function generateQRImage(data: string): Promise<string | null> {
  try {
    const response = await fetch("/api/qr/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, size: 512 }),
    })
    const result = await response.json()
    return result.data?.png || null
  } catch {
    return null
  }
}
function QRCodeCard({ qr, onDelete }: { qr: QRCodeWithEvent; onDelete: (id: string) => void }) {
  const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"}/event/scan/${qr.code}`

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({ title: "Link copied to clipboard" })
  }

  function downloadSvgQr() {
    const svgEl = document.getElementById(`global-qr-svg-${qr.id}`) as SVGElement | null
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(svgBlob)

    const canvas = document.createElement("canvas")
    canvas.width = 600
    canvas.height = 600
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, 600, 600)

    const logoImg = new Image()
    logoImg.crossOrigin = "anonymous"
    logoImg.onload = () => {
      ctx.globalAlpha = 0.25
      ctx.drawImage(logoImg, 50, 50, 500, 500)
      ctx.globalAlpha = 1.0

      const qrImg = new Image()
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 30, 30, 540, 540)
        const pngUrl = canvas.toDataURL("image/png")
        const downloadLink = document.createElement("a")
        downloadLink.href = pngUrl
        downloadLink.download = `${qr.name || qr.code}-snapsy-qr.png`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(svgUrl)
      }
      qrImg.src = svgUrl
    }
    logoImg.src = "/Favicon.png"
  }

  return (
    <Card className="overflow-hidden border border-border/40 bg-card/60 backdrop-blur-md hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group">
      <div className="aspect-square bg-white flex flex-col items-center justify-center p-4 relative select-none">
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#EAE5DF] relative overflow-hidden flex items-center justify-center">
          <img
            src="/Favicon.png"
            alt="Snapsy Logo Background"
            className="absolute inset-0 w-full h-full object-contain opacity-25 p-2 pointer-events-none filter saturate-150"
          />
          <QRCodeSVG
            id={`global-qr-svg-${qr.id}`}
            value={scanUrl}
            size={160}
            bgColor={"transparent"}
            fgColor={"#1c1a17"}
            level={"H"}
            imageSettings={{
              src: "/Favicon.png",
              x: undefined,
              y: undefined,
              height: 38,
              width: 38,
              excavate: true,
            }}
            className="relative z-10"
          />
        </div>

        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full border shadow-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => copyToClipboard(scanUrl)} className="gap-2 cursor-pointer">
                <Copy className="h-4 w-4 text-muted-foreground" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadSvgQr} className="gap-2 cursor-pointer">
                <Download className="h-4 w-4 text-muted-foreground" />
                Download PNG
              </DropdownMenuItem>
              {qr.event && (
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link href={`/event/${qr.event.slug}`} target="_blank">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    View Public Page
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(qr.id)} className="gap-2 text-destructive cursor-pointer">
                <Trash2 className="h-4 w-4 text-destructive" />
                Delete Code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardContent className="p-4 bg-slate-50/50 border-t border-slate-100">
        <h3 className="font-semibold text-sm text-slate-900 group-hover:text-primary transition-colors">{qr.name || "QR Code"}</h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-500 font-medium">
            {qr.event?.name || "General Code"}
          </p>
          <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
            {qr.scan_count || 0} scans
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateQRDialog({
  events,
  onSuccess,
}: {
  events: any[]
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [eventId, setEventId] = useState("")
  const [galleryId, setGalleryId] = useState("")
  const [loading, setLoading] = useState(false)

  const { data: galleries } = useQuery({
    queryKey: ["event-galleries-dropdown", eventId],
    queryFn: () => getGalleries(eventId),
    enabled: !!eventId,
  })

  const mutation = useMutation({
    mutationFn: createQRCode,
    onSuccess: () => {
      toast({ title: "QR code created successfully" })
      setOpen(false)
      setName("")
      setEventId("")
      setGalleryId("")
      onSuccess()
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create QR code", description: error.message, variant: "destructive" })
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!eventId) {
      toast({ title: "Event is required", variant: "destructive" })
      return
    }
    setLoading(true)
    mutation.mutate({
      event_id: eventId,
      name: name || "Welcome QR",
      gallery_id: galleryId || undefined,
    })
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all">
          <Plus className="h-4 w-4" />
          Generate QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate QR Code</DialogTitle>
          <DialogDescription>
            Create a QR code that redirects guests to upload photos or view your galleries.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="qr-event">Select Event</Label>
            <select
              id="qr-event"
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value)
                setGalleryId("")
              }}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="" disabled>Select an event...</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-name">Name (e.g., Table 1, Welcome Sign)</Label>
            <Input
              id="qr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Welcome Poster"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-gallery">Link to Gallery (optional)</Label>
            <select
              id="qr-gallery"
              value={galleryId}
              onChange={(e) => setGalleryId(e.target.value)}
              disabled={!eventId}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <option value="">Full Event Page (Upload + View)</option>
              {galleries &&
                galleries.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>
          </div>



          <DialogFooter className="pt-4 border-t gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !eventId}>
              {loading ? "Creating..." : "Generate Code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ConsolidatedQRPage() {
  const queryClient = useQueryClient()
  const { profile, isLoading: authLoading } = useAuth()
  const orgId = profile?.id
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEventId, setSelectedEventId] = useState("all")

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events-list", orgId],
    queryFn: () => getEvents(orgId!),
    enabled: !!orgId,
  })

  const eventIds = events?.map((e: any) => e.id) || []

  const { data: qrCodes, isLoading: qrLoading } = useQuery({
    queryKey: ["all-qrcodes", eventIds],
    queryFn: () => getAllQRCodes(eventIds),
    enabled: !!events,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteQRCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-qrcodes"] })
      toast({ title: "QR code deleted" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete QR code", description: error.message, variant: "destructive" })
    },
  })

  const totalScans = qrCodes?.reduce((acc, qr) => acc + (qr.scan_count || 0), 0) || 0

  const filteredQRCodes = qrCodes?.filter((qr) => {
    const matchesSearch =
      qr.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qr.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qr.event?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesEvent = selectedEventId === "all" || qr.event_id === selectedEventId

    return matchesSearch && matchesEvent
  })

  const isLoading = authLoading || (!!orgId && (eventsLoading || qrLoading))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-1/4 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            QR Codes Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Consolidated QR codes dashboard for all your event checkpoints and directories.
          </p>
        </div>
        <CreateQRDialog
          events={events || []}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["all-qrcodes"] })}
        />
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-6 border border-border/40 bg-card/50 backdrop-blur-sm relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total QR Codes</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{qrCodes?.length || 0}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <QrCode className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border/40 bg-card/50 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Scans</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{totalScans}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Camera className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border/40 bg-card/50 backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full filter blur-xl transform translate-x-4 -translate-y-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active QR Checkpoints</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {qrCodes?.filter((qr) => qr.is_active).length || 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
              <Link2 className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Actions bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b pb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search QR codes, codes, or events..."
            className="pl-9 bg-card/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="flex h-10 w-full sm:w-56 rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Events</option>
            {events?.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      {filteredQRCodes && filteredQRCodes.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQRCodes.map((qr) => (
            <QRCodeCard
              key={qr.id}
              qr={qr}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border/60 bg-card/20 py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-muted/40 rounded-full mb-4 border shadow-inner">
              <QrCode className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">No QR codes found</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              {searchQuery || selectedEventId !== "all"
                ? "We couldn't find any QR codes matching your search filters. Try resetting them."
                : "Create a QR code to let guests quickly scan at your event to upload and view photos."}
            </p>
            {!searchQuery && selectedEventId === "all" && (
              <div className="mt-6">
                <CreateQRDialog
                  events={events || []}
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ["all-qrcodes"] })}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
