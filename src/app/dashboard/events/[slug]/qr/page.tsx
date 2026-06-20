"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { generateCode } from "@/lib/utils"
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
} from "lucide-react"
import type { QRCode, Gallery } from "@/lib/types"

async function getEvent(eventSlug: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("id, name, slug")
    .eq("slug", eventSlug)
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
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://snapsy-events.vercel.app"}/event/scan/${qr.code}`

  async function loadQRImage() {
    if (qrImage) return
    setLoading(true)
    const image = await generateQRImage(scanUrl)
    setQrImage(image)
    setLoading(false)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied to clipboard" })
  }

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-white flex items-center justify-center p-4 relative">
        {loading ? (
          <Skeleton className="h-48 w-48" />
        ) : qrImage ? (
          <img src={qrImage} alt="QR Code" className="h-48 w-48" />
        ) : (
          <button
            onClick={loadQRImage}
            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <QrCode className="h-16 w-16" />
            <span className="text-sm">Click to generate</span>
          </button>
        )}
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
              {qrImage && (
                <DropdownMenuItem asChild>
                  <a href={qrImage} download={`${qr.name || qr.code}-qr.png`}>
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </DropdownMenuItem>
              )}
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
        <h3 className="font-semibold">{qr.name || "QR Code"}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {qr.scan_count || 0} scans
        </p>
        <p className="text-xs text-muted-foreground mt-2 break-all">{scanUrl}</p>
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
  const [customUrl, setCustomUrl] = useState("")
  const [isUsingCustomUrl, setIsUsingCustomUrl] = useState(false)
  const [loading, setLoading] = useState(false)

  const mutation = useMutation({
    mutationFn: createQRCode,
    onSuccess: () => {
      toast({ title: "QR code created successfully" })
      setOpen(false)
      setName("")
      setGalleryId("")
      setCustomUrl("")
      setIsUsingCustomUrl(false)
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
      redirect_url: isUsingCustomUrl ? customUrl : undefined,
    })
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">No specific gallery</option>
              {galleries.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom-url"
              checked={isUsingCustomUrl}
              onChange={(e) => setIsUsingCustomUrl(e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="custom-url">Use custom redirect URL</Label>
          </div>

          {isUsingCustomUrl && (
            <div className="space-y-2">
              <Label htmlFor="redirect-url">Redirect URL</Label>
              <Input
                id="redirect-url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/custom-page"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
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

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
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
      toast({ title: "QR code deleted" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete QR code", description: error.message, variant: "destructive" })
    },
  })

  if (eventLoading || qrLoading) {
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
        <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">Event not found</h2>
        <Button asChild className="mt-4">
          <Link href="/dashboard/events">Back to Events</Link>
        </Button>
      </div>
    )
  }

  const totalScans = qrCodes?.reduce((acc, qr) => acc + (qr.scan_count || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href={`/dashboard/events/${slug}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">QR Codes</h1>
          <p className="text-muted-foreground">{event.name}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total QR Codes</p>
              <p className="mt-2 text-2xl font-semibold">{qrCodes?.length || 0}</p>
            </div>
            <QrCode className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
              <p className="mt-2 text-2xl font-semibold">{totalScans}</p>
            </div>
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Codes</p>
              <p className="mt-2 text-2xl font-semibold">
                {qrCodes?.filter((qr) => qr.is_active).length || 0}
              </p>
            </div>
            <Link2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Generated QR Codes</h2>
          <p className="text-sm text-muted-foreground">Click on a QR code to generate the image</p>
        </div>
        <CreateQRDialog
          eventId={event.id}
          eventSlug={event.slug}
          galleries={galleries || []}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["event-qrcodes", event.id] })}
        />
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No QR codes yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Generate QR codes to make it easy for guests to access your event and upload photos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}