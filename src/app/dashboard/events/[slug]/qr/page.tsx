"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { generateCode } from "@/lib/utils"
import { useAuth } from "@/lib/hooks"
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
  ArrowLeft,
  Copy,
  Download,
  Link2,
  MoreVertical,
  Plus,
  QrCode,
  Trash2,
  ExternalLink,
  Camera,
  AlertTriangle,
} from "lucide-react"
import type { QRCode, Gallery } from "@/lib/types"

async function getEvent(eventSlug: string, orgId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id, name, slug, end_date")
    .eq("slug", eventSlug)
    .eq("host_id", orgId)
    .single()

  if (error) throw error
  return data
}

async function getQRCodes(eventId: string): Promise<QRCode[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

async function getGalleries(eventId: string): Promise<any[]> {
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

function QRCodeCard({ qr, eventSlug, onDelete }: { qr: QRCode; eventSlug: string; onDelete: (id: string) => void }) {
  const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"}/event/scan/${qr.code}`

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied to clipboard" })
  }

  function downloadSvgQr() {
    const svgEl = document.getElementById(`qr-card-svg-${qr.id}`) as SVGElement | null
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = 500
      canvas.height = 500
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, 500, 500)
        ctx.drawImage(img, 25, 25, 450, 450)
        const pngUrl = canvas.toDataURL("image/png")
        const downloadLink = document.createElement("a")
        downloadLink.href = pngUrl
        downloadLink.download = `${qr.name || qr.code}-snapsy-qr.png`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
      }
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-[#3D332A] bg-[#1C1814] hover:border-mauve/40 hover:shadow-xl hover:shadow-mauve/5 transition-all duration-300">
      <div className="aspect-square bg-white flex flex-col items-center justify-center p-4 relative border-b border-stone-100">
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#EAE5DF] relative overflow-hidden flex items-center justify-center">
          <img
            src="/Logo.png"
            alt="Snapsy Logo Background"
            className="absolute inset-0 w-full h-full object-contain opacity-25 p-2 pointer-events-none filter saturate-150"
          />
          <QRCodeSVG
            id={`qr-card-svg-${qr.id}`}
            value={scanUrl}
            size={160}
            bgColor={"transparent"}
            fgColor={"#1c1a17"}
            level={"H"}
            imageSettings={{
              src: "/Favicon.png",
              x: undefined,
              y: undefined,
              height: 36,
              width: 36,
              excavate: true,
            }}
            className="relative z-10"
          />
        </div>

        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => copyToClipboard(scanUrl)}>
                <Copy className="h-4 w-4" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadSvgQr}>
                <Download className="h-4 w-4" />
                Download PNG
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/event/${eventSlug}`} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  View Event
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(qr.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-white">{qr.name || "QR Code"}</h3>
        <p className="text-sm text-white/50 mt-1">
          {qr.scan_count || 0} scans
        </p>
        <p className="text-xs text-white/40 mt-2 break-all">{scanUrl}</p>
      </CardContent>
    </Card>
  )
}

function CreateQRDialog({
  eventId,
  eventSlug,
  galleries,
  onSuccess,
}: {
  eventId: string
  eventSlug: string
  galleries: any[]
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [galleryId, setGalleryId] = useState("")
  const [loading, setLoading] = useState(false)

  const mutation = useMutation({
    mutationFn: createQRCode,
    onSuccess: () => {
      toast({ title: "QR code created successfully" })
      setOpen(false)
      setName("")
      setGalleryId("")
      onSuccess()
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create QR code", description: error.message, variant: "destructive" })
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    mutation.mutate({
      event_id: eventId,
      name,
      gallery_id: galleryId || undefined,
    })
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold shadow-lg shadow-mauve/10 hover:scale-[1.01] active:scale-[0.99] transition-all">
          <Plus className="h-4 w-4" />
          Generate QR Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate QR Code</DialogTitle>
          <DialogDescription>
            Create a QR code for guests to scan and access your event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qr-name">Name (optional)</Label>
            <Input
              id="qr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Sign, Table 5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-gallery">Link to Gallery (optional)</Label>
            <select
              id="qr-gallery"
              value={galleryId}
              onChange={(e) => setGalleryId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mauve/50 focus-visible:ring-offset-2"
            >
              <option value="">No specific gallery</option>
              {galleries.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>



          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold">
              {loading ? "Creating..." : "Generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function QRManagementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { profile, isLoading: authLoading } = useAuth()
  const orgId = profile?.id

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", slug, orgId],
    queryFn: () => getEvent(slug, orgId!),
    enabled: !!orgId,
  })

  const { data: qrCodes, isLoading: qrLoading } = useQuery({
    queryKey: ["event-qrcodes", event?.id],
    queryFn: () => getQRCodes(event!.id),
    enabled: !!event?.id,
  })

  const { data: galleries } = useQuery({
    queryKey: ["event-galleries", event?.id],
    queryFn: () => getGalleries(event!.id),
    enabled: !!event?.id,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteQRCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-qrcodes", event?.id] })
      queryClient.invalidateQueries({ queryKey: ["all-qrcodes"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({ title: "QR code deleted" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete QR code", description: error.message, variant: "destructive" })
    },
  })

  const isLoading = authLoading || (!!orgId && (eventLoading || qrLoading))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <QrCode className="h-12 w-12 text-white/30 mb-4" />
        <h2 className="text-lg font-medium text-white">Event not found</h2>
        <Button asChild className="mt-4 rounded-full bg-mauve hover:bg-mauve-strong text-[#141110] font-semibold">
          <Link href="/dashboard/events">Back to Events</Link>
        </Button>
      </div>
    )
  }

  const totalScans = qrCodes?.reduce((acc, qr) => acc + (qr.scan_count || 0), 0) || 0
  const isExpired = event.end_date && new Date(event.end_date) < new Date()

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="text-white/70 hover:bg-white/5 hover:text-white">
          <Link href={`/dashboard/events/${slug}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-playfair text-3xl font-light text-white">QR Codes</h1>
          <p className="text-white/50 text-sm">{event.name}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814] p-5 hover:border-mauve/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Total QR Codes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{qrCodes?.length || 0}</p>
            </div>
            <QrCode className="h-8 w-8 text-mauve" />
          </div>
        </Card>
        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814] p-5 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Total Scans</p>
              <p className="mt-2 text-2xl font-semibold text-white">{totalScans}</p>
            </div>
            <Camera className="h-8 w-8 text-emerald-400" />
          </div>
        </Card>
        <Card className="rounded-2xl border border-[#3D332A] bg-[#1C1814] p-5 hover:border-mauve/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">Active Codes</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {qrCodes?.filter((qr) => qr.is_active).length || 0}
              </p>
            </div>
            <Link2 className="h-8 w-8 text-mauve" />
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-white">Generated QR Codes</h2>
          <p className="text-sm text-white/50">Click on a QR code to generate the image</p>
        </div>
        {isExpired ? (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl max-w-md">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-300">Event Expired</p>
              <p className="text-xs text-red-400/80 mt-0.5">
                QR generation is disabled. Guests can no longer upload media.
              </p>
            </div>
          </div>
        ) : (
          <CreateQRDialog
            eventId={event.id}
            eventSlug={event.slug}
            galleries={galleries || []}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["event-qrcodes", event.id] })
              queryClient.invalidateQueries({ queryKey: ["all-qrcodes"] })
              queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
            }}
          />
        )}
      </div>

      {qrCodes && qrCodes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {qrCodes.map((qr) => (
            <QRCodeCard
              key={qr.id}
              qr={qr}
              eventSlug={event.slug}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-2xl border border-dashed border-[#3D332A] bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <QrCode className="h-12 w-12 text-white/30 mb-4" />
            <h3 className="font-medium mb-2 text-white">No QR codes yet</h3>
            <p className="text-sm text-white/50 mb-4 text-center max-w-md">
              Generate QR codes to make it easy for guests to access your event and upload photos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}