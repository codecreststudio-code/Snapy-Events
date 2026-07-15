"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks"
import { formatDate } from "@/lib/utils"
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
} from "@/lib/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/lib/components/ui/dropdown-menu"
import { toast } from "@/lib/components/ui/toaster"
import {
  Edit,
  Eye,
  Images,
  Image as ImageIcon,
  MoreVertical,
  Plus,
  Trash2,
  Lock,
  Globe,
  Search,
  Filter,
  Settings
} from "lucide-react"
import type { Gallery as GalleryType } from "@/lib/types"

async function getGalleries(eventIds: string[]): Promise<GalleryType[]> {
  if (eventIds.length === 0) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("galleries")
    .select("*, event:events(name, slug, cover_image_url, settings)")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
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

  // Galleries themselves rarely have their own cover_image_url set — the
  // cover is chosen on the parent event (either an uploaded/stock photo, in
  // event.cover_image_url, or one of the gradient swatches, saved as CSS in
  // event.settings.cover_gradient since it isn't an image). This card used
  // to only check the gallery's own cover_image_url, so nearly every card
  // fell through to the generic placeholder icon even when the event had a
  // perfectly good cover. Mirrors the fallback used on the Events page.
  const eventCoverImage = (gallery as any)?.event?.cover_image_url as string | undefined
  const coverImage = gallery.cover_image_url || eventCoverImage
  const coverGradient = !coverImage
    ? ((gallery as any)?.event?.settings as any)?.cover_gradient as string | undefined
    : undefined

  return (
    <>
      <Card className="overflow-hidden border border-border/40 bg-card/60 backdrop-blur-md hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between">
        <div>
          {/* Gallery Cover Image */}
          <div
            className="aspect-video bg-muted relative overflow-hidden"
            style={!coverImage && coverGradient ? { backgroundImage: coverGradient } : undefined}
          >
            {coverImage ? (
              <img
                src={coverImage}
                alt={gallery.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : coverGradient ? null : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-pink-500/5 flex items-center justify-center">
                <Images className="h-10 w-10 text-muted-foreground/40 group-hover:text-primary/45 transition-colors" />
              </div>
            )}

            {/* Actions Menu */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full border shadow-sm cursor-pointer">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                    <Link href={`/dashboard/events/${(gallery as any)?.event?.slug}/gallery`}>
                      <Edit className="h-4 w-4 text-muted-foreground" />
                      Edit Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                    <Link href={`/event/${(gallery as any)?.event?.slug}/g/${gallery.slug}`} target="_blank">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      View Public Gallery
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive gap-2 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Gallery
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Details Content */}
          <div className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors truncate">
                  {gallery.name}
                </h3>
                {(gallery as any)?.event && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <span className="font-medium text-slate-400">Event:</span>
                    {(gallery as any)?.event?.name}
                  </p>
                )}
              </div>
            </div>

            {gallery.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/10 p-2.5 rounded border border-border/30">
                {gallery.description}
              </p>
            )}
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="px-5 py-4 border-t border-border/30 bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImageIcon className="h-4 w-4 text-slate-400" />
            <span>{gallery.photo_count || 0} photos</span>
          </div>

          <div className="flex items-center gap-2">
            {gallery.is_public ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border bg-indigo-500/10 border-indigo-500/20 text-indigo-600 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Public
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border bg-slate-500/10 border-slate-500/20 text-slate-600 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Private
              </span>
            )}
            {gallery.reveal_enabled && gallery.reveal_at && (
              <span className="text-[10px] text-muted-foreground font-medium">
                Delayed Reveal
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Gallery</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{gallery.name}"? This will also delete all photos
              stored in this gallery. This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
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
  const queryClient = useQueryClient()
  const { profile, isLoading: authLoading } = useAuth()
  const orgId = profile?.id
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["events-list", orgId],
    queryFn: () => getEvents(orgId!),
    enabled: !!orgId,
  })

  const eventIds = events?.map((e: any) => e.id) || []

  const { data: galleries, isLoading: galleriesLoading } = useQuery({
    queryKey: ["galleries", eventIds],
    queryFn: () => getGalleries(eventIds),
    enabled: !!events,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGallery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["galleries"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({ title: "Gallery deleted successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete gallery", description: error.message, variant: "destructive" })
    },
  })

  const filteredGalleries = galleries?.filter((gallery) => {
    const matchesSearch =
      gallery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gallery.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (gallery as any)?.event?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterType === "all" ||
      (filterType === "public" && gallery.is_public) ||
      (filterType === "private" && !gallery.is_public)

    return matchesSearch && matchesFilter
  })

  const isLoading = authLoading || (!!orgId && (eventsLoading || galleriesLoading))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Galleries</h1>
            <p className="text-muted-foreground text-sm">Manage your photo directories</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> Create Gallery
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 w-full rounded-xl border bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Your Galleries
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage public client galleries, download bounds, and visibility rules.
          </p>
        </div>
        <Link href="/dashboard/events">
          <Button className="shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
            <Plus className="mr-2 h-4 w-4" />
            Create from Event
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b pb-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search galleries or events..."
            className="pl-9 bg-card/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex h-10 w-full sm:w-44 rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Galleries</option>
            <option value="public">Public Only</option>
            <option value="private">Private Only</option>
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      {filteredGalleries && filteredGalleries.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGalleries.map((gallery) => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border/60 bg-card/20 py-20">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-muted/40 rounded-full mb-4 border shadow-inner">
              <Images className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">No galleries found</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              {searchQuery || filterType !== "all"
                ? "We couldn't find any galleries matching your search criteria. Try resetting them."
                : "Galleries organize where guests store photos. Go to an event dashboard to establish a new gallery."}
            </p>
            {!searchQuery && filterType === "all" && (
              <div className="mt-6">
                <Link href="/dashboard/events">
                  <Button className="shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                    Go to Events
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}