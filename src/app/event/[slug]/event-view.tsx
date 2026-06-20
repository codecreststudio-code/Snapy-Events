import Link from "next/link"
import { Button } from "@/lib/components/ui/button"
import { Camera, QrCode, Lock } from "lucide-react"

type Event = {
  id: string
  name: string
  slug: string
  description: string | null
  event_date: string | null
  end_date: string | null
  venue: string | null
  cover_image_url: string | null
  organization: {
    name: string
    branding: {
      brand_color?: string | null
      logo_url?: string | null
    }
  } | null
  requires_access_code: boolean
}
type Gallery = { id: string; name: string; slug: string; description: string | null; cover_image_url: string | null; requires_access_code: boolean }

export function EventView({ event, galleries }: { event: Event; galleries: Gallery[] }) {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b">
        {event.cover_image_url && (
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${event.cover_image_url})` }}
          />
        )}
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          {event.organization?.branding?.logo_url && <img src={event.organization.branding.logo_url} alt={event.organization.name} className="mx-auto mb-4 h-10" />}
          <p className="text-sm uppercase tracking-widest text-muted-foreground">{event.organization?.name ?? "Event"}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">{event.name}</h1>
          {event.description && <p className="mx-auto mt-3 max-w-2xl text-pretty text-muted-foreground">{event.description}</p>}
          <p className="mt-3 text-sm text-muted-foreground">
            {event.event_date && new Date(event.event_date).toLocaleString()}{event.venue && ` · ${event.venue}`}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg"><Link href={`/event/${event.id}/upload`}><Camera className="mr-1 h-4 w-4" />Upload photos</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href={`/event/${event.id}/qr`}><QrCode className="mr-1 h-4 w-4" />Get QR code</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Galleries</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {galleries.map((g) => (
            <Link key={g.id} href={`/event/${event.id}/g/${g.slug}`} className="group block overflow-hidden rounded-2xl border bg-card transition hover:shadow-md">
              <div className="aspect-[4/3] bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20" style={g.cover_image_url ? { backgroundImage: `url(${g.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium group-hover:underline">{g.name}</p>
                  {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                </div>
                {g.requires_access_code && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
