"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
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
  Images,
  Image,
  MoreVertical,
  Plus,
  Trash2,
  Lock,
  Globe,
} from "lucide-react"
import type { Gallery as GalleryType } from "@/lib/types"

async function getGalleries(): Promise<GalleryType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("galleries")
    .select("*, event:events(name, slug)")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

async function deleteGallery(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from("galleries").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

function GalleryCard({
  gallery,
  onDelete,
}: {
  gallery: GalleryType
  onDelete: (id: string) => void
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/events/${(gallery as GalleryType & { event?: { slug: string } })?.event?.slug}/gallery`}>
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/event/${(gallery as GalleryType & { event?: { slug: string } })?.event?.slug}/gallery`} target="_blank">
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
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
              {(gallery as GalleryType & { event?: { name: string } })?.event && (
                <p className="text-xs text-muted-foreground">
                  {(gallery as GalleryType & { event?: { name: string } })?.event?.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {gallery.is_public ? (
                <Globe className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {gallery.photo_count || 0} photos
            </span>
            {gallery.reveal_enabled && gallery.reveal_at ? (
              <span className="text-xs text-muted-foreground">
                Reveals {formatDate(gallery.reveal_at)}
              </span>
            ) : null}
          </div>

          {gallery.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {gallery.description}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Gallery</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{gallery.name}"? This will also delete all photos
              in this gallery. This action cannot be undone.
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
    </>
  )
}

export default function GalleriesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: galleries, isLoading } = useQuery({
    queryKey: ["galleries"],
    queryFn: getGalleries,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGallery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleries"] })
      toast({ title: "Gallery deleted successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete gallery", description: error.message, variant: "destructive" })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Galleries</h1>
          <p className="text-muted-foreground">Manage all your event galleries</p>
        </div>
        <Link href="/dashboard/events">
          <Button>
            <Plus className="h-4 w-4" />
            Create from Event
          </Button>
        </Link>
      </div>

      {galleries && galleries.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {galleries.map((gallery) => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Images className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No galleries yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Galleries are created within events. Create an event first to start building your
              galleries.
            </p>
            <Link href="/dashboard/events/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create Your First Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}