"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { slugify, toDatetimeLocalValue } from "@/lib/utils"
import { useAuth } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { Label } from "@/lib/components/ui/label"
import { Textarea } from "@/lib/components/ui/textarea"
import { Switch } from "@/lib/components/ui/switch"
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
  Camera,
  Edit,
  Eye,
  Globe,
  Image,
  Lock,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react"
import type { Gallery, GallerySettings, Event } from "@/lib/types"

interface GalleryFormData {
  name: string
  description: string
  is_public: boolean
  reveal_enabled: boolean
  reveal_at: string
  allow_uploads: boolean
  allow_downloads: boolean
}

async function getEvent(slug: string, orgId: string): Promise<Event> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("host_id", orgId)
    .single()
  if (error) throw error
  return data
}

async function getGalleries(eventId: string): Promise<Gallery[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

async function createGallery(eventId: string, data: GalleryFormData) {
  const supabase = createClient()
  const slug = `${slugify(data.name)}-${Date.now().toString(36)}`

  const galleryData = {
    event_id: eventId,
    name: data.name,
    slug,
    description: data.description || null,
    is_public: data.is_public,
    reveal_enabled: data.reveal_enabled,
    reveal_at: data.reveal_enabled && data.reveal_at ? new Date(data.reveal_at).toISOString() : null,
    settings: {
      allow_uploads: data.allow_uploads,
      allow_downloads: data.allow_downloads,
      show_exif: false,
      enable_lightbox: true,
    } as GallerySettings,
    photo_count: 0,
  }

  const { error } = await supabase.from("galleries").insert(galleryData)
  if (error) throw new Error(error.message)
}

async function updateGallery(id: string, data: Partial<GalleryFormData>) {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description || null
  if (data.is_public !== undefined) updateData.is_public = data.is_public
  if (data.reveal_enabled !== undefined) updateData.reveal_enabled = data.reveal_enabled
  if (data.reveal_at !== undefined) {
    updateData.reveal_at = data.reveal_enabled && data.reveal_at
      ? new Date(data.reveal_at).toISOString()
      : null
  }

  if (data.allow_uploads !== undefined || data.allow_downloads !== undefined) {
    const { data: existing } = await supabase.from("galleries").select("settings").eq("id", id).single()
    updateData.settings = {
      ...(existing?.settings as GallerySettings),
      allow_uploads: data.allow_uploads ?? (existing?.settings as GallerySettings)?.allow_uploads,
      allow_downloads: data.allow_downloads ?? (existing?.settings as GallerySettings)?.allow_downloads,
    }
  }

  const { error } = await supabase.from("galleries").update(updateData).eq("id", id)
  if (error) throw new Error(error.message)
}

async function deleteGallery(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from("galleries").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

function EditGalleryDialog({
  gallery,
  onSuccess,
  open,
  onOpenChange,
}: {
  gallery: Gallery
  onSuccess: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const settings = gallery.settings as GallerySettings
  const [formData, setFormData] = useState<GalleryFormData>({
    name: gallery.name,
    description: gallery.description || "",
    is_public: gallery.is_public,
    reveal_enabled: gallery.reveal_enabled,
    reveal_at: gallery.reveal_at ? toDatetimeLocalValue(gallery.reveal_at) : "",
    allow_uploads: settings?.allow_uploads !== false,
    allow_downloads: settings?.allow_downloads !== false,
  })
  const [loading, setLoading] = useState(false)

  const mutation = useMutation({
    mutationFn: () => updateGallery(gallery.id, formData),
    onSuccess: () => {
      toast({ title: "Gallery updated successfully" })
      onOpenChange(false)
      onSuccess()
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update gallery", description: error.message, variant: "destructive" })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    mutation.mutate()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Gallery</DialogTitle>
          <DialogDescription>Modify gallery settings</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-gallery-name">Gallery Name *</Label>
            <Input
              id="edit-gallery-name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ceremony, Reception, Candid Shots..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-gallery-description">Description</Label>
            <Textarea
              id="edit-gallery-description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="What's in this gallery?"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Gallery</Label>
              <p className="text-sm text-muted-foreground">
                Make this gallery visible to everyone
              </p>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, is_public: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Guest Uploads</Label>
              <p className="text-sm text-muted-foreground">
                Let guests upload photos to this gallery
              </p>
            </div>
            <Switch
              checked={formData.allow_uploads}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, allow_uploads: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Downloads</Label>
              <p className="text-sm text-muted-foreground">
                Allow guests to download photos
              </p>
            </div>
            <Switch
              checked={formData.allow_downloads}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, allow_downloads: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Scheduled Reveal</Label>
              <p className="text-sm text-muted-foreground">
                Set a date/time when photos will be revealed
              </p>
            </div>
            <Switch
              checked={formData.reveal_enabled}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, reveal_enabled: checked }))
              }
            />
          </div>

          {formData.reveal_enabled && (
            <div className="space-y-2">
              <Label htmlFor="edit-reveal_at">Reveal Date & Time</Label>
              <Input
                id="edit-reveal_at"
                type="datetime-local"
                value={formData.reveal_at}
                onChange={(e) => setFormData((p) => ({ ...p, reveal_at: e.target.value }))}
                required={formData.reveal_enabled}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GalleryCard({
  gallery,
  eventSlug,
  onDelete,
  onUpdate,
}: {
  gallery: Gallery
  eventSlug: string
  onDelete: (id: string) => void
  onUpdate: () => void
}) {
  const settings = gallery.settings as GallerySettings
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  return (
    <>
      <Card className="overflow-hidden">
        <div className="aspect-video bg-muted relative">
          {gallery.cover_image_url ? (
            <img
              src={gallery.cover_image_url}
              alt={gallery.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Image className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditDialogOpen(true)} className="cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/event/${eventSlug}/g/${gallery.slug}`} target="_blank">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">{gallery.name}</h3>
              <p className="text-xs text-muted-foreground">
                {gallery.photo_count || 0} photos
              </p>
            </div>
            <div className="flex items-center gap-1">
              {gallery.is_public ? (
                <Globe className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Uploads {settings?.allow_uploads ? "enabled" : "disabled"}</span>
              <span>Downloads {settings?.allow_downloads ? "enabled" : "disabled"}</span>
            </div>
            {gallery.reveal_enabled && gallery.reveal_at && (
              <p className="text-xs text-muted-foreground">
                Reveals at {new Date(gallery.reveal_at).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Gallery</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{gallery.name}"? All photos in this gallery will
              also be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => onDelete(gallery.id)}>
              Delete
            </Button>
          </DialogFooter>
          </DialogContent>
        </Dialog>

        <EditGalleryDialog
          gallery={gallery}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={onUpdate}
        />
      </>
    )
  }

function CreateGalleryDialog({
  eventId,
  onSuccess,
}: {
  eventId: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<GalleryFormData>({
    name: "",
    description: "",
    is_public: false,
    reveal_enabled: false,
    reveal_at: "",
    allow_uploads: true,
    allow_downloads: true,
  })
  const [loading, setLoading] = useState(false)

  const mutation = useMutation({
    mutationFn: () => createGallery(eventId, formData),
    onSuccess: () => {
      toast({ title: "Gallery created successfully" })
      setOpen(false)
      setFormData({
        name: "",
        description: "",
        is_public: false,
        reveal_enabled: false,
        reveal_at: "",
        allow_uploads: true,
        allow_downloads: true,
      })
      onSuccess()
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create gallery", description: error.message, variant: "destructive" })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    mutation.mutate()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Gallery
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Gallery</DialogTitle>
          <DialogDescription>Create a new gallery for your event</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gallery-name">Gallery Name *</Label>
            <Input
              id="gallery-name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ceremony, Reception, Candid Shots..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gallery-description">Description</Label>
            <Textarea
              id="gallery-description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="What's in this gallery?"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Gallery</Label>
              <p className="text-sm text-muted-foreground">
                Make this gallery visible to everyone
              </p>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, is_public: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Guest Uploads</Label>
              <p className="text-sm text-muted-foreground">
                Let guests upload photos to this gallery
              </p>
            </div>
            <Switch
              checked={formData.allow_uploads}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, allow_uploads: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Downloads</Label>
              <p className="text-sm text-muted-foreground">
                Allow guests to download photos
              </p>
            </div>
            <Switch
              checked={formData.allow_downloads}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, allow_downloads: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Scheduled Reveal</Label>
              <p className="text-sm text-muted-foreground">
                Set a date/time when photos will be revealed
              </p>
            </div>
            <Switch
              checked={formData.reveal_enabled}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, reveal_enabled: checked }))
              }
            />
          </div>

          {formData.reveal_enabled && (
            <div className="space-y-2">
              <Label htmlFor="reveal_at">Reveal Date & Time</Label>
              <Input
                id="reveal_at"
                type="datetime-local"
                value={formData.reveal_at}
                onChange={(e) => setFormData((p) => ({ ...p, reveal_at: e.target.value }))}
                required={formData.reveal_enabled}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Gallery"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function EventGalleriesPage({ params }: { params: Promise<{ slug: string }> }) {
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

  const { data: galleries, isLoading: galleriesLoading } = useQuery({
    queryKey: ["event-galleries", event?.id],
    queryFn: () => getGalleries(event!.id),
    enabled: !!event?.id,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGallery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-galleries", event?.id] })
      queryClient.invalidateQueries({ queryKey: ["galleries"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({ title: "Gallery deleted successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete gallery", description: error.message, variant: "destructive" })
    },
  })

  const isLoading = authLoading || (!!orgId && (eventLoading || galleriesLoading))

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
        <Camera className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-medium">Event not found</h2>
        <Button asChild className="mt-4">
          <Link href="/dashboard/events">Back to Events</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href={`/dashboard/events/${slug}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Galleries</h1>
          <p className="text-muted-foreground">{event.name}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {galleries?.length || 0} gallery(s)
          </p>
        </div>
        <CreateGalleryDialog
          eventId={event.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["event-galleries", event.id] })
            queryClient.invalidateQueries({ queryKey: ["galleries"] })
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
          }}
        />
      </div>

      {galleries && galleries.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {galleries.map((gallery) => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              eventSlug={event.slug}
              onDelete={(id) => deleteMutation.mutate(id)}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["event-galleries", event.id] })
                queryClient.invalidateQueries({ queryKey: ["galleries"] })
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Image className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No galleries yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Create galleries to organize photos from your event. Guests can upload and view
              photos based on your settings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}