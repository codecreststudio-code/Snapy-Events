import type { MetadataRoute } from "next"

// Next.js App Router native manifest route — auto-discovered and linked
// into every page's <head> (no manual <link rel="manifest"> needed), and
// served at /manifest.webmanifest. Follows Google's PWA manifest guidance:
// https://web.dev/articles/add-manifest
//
// Icon/screenshot files referenced here were generated from the existing
// Favicon.png brand mark (see public/icons/) — see the icon-generation task
// notes for how the square crop + maskable safe-zone padding was produced.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Snapsy - Event Photography Platform",
    short_name: "Snapsy",
    description:
      "Create events, share a live photo capsule with your guests, and let AI turn every upload into highlights, stories, and slideshows.",
    // "/" (not "/dashboard") so the installed app works for both personas:
    // hosts get redirected into their dashboard from here anyway via normal
    // nav, and guests who install for repeat access to a shared event don't
    // hit an auth redirect the moment they open the app icon.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#080808",
    theme_color: "#080808",
    lang: "en-US",
    categories: ["photo", "events", "social", "lifestyle"],
    icons: [
      { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Real product screenshots (captured from the live app) should replace
    // this once available — richer install UI on Android/desktop requires
    // at least one "wide" (desktop) and one narrow (mobile) screenshot per
    // Google's guidance. Deliberately omitted for now rather than shipping
    // fabricated mockup screenshots; see Phase A report for how to add them.
    screenshots: [],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "View your events and albums",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Create Event",
        short_name: "New Event",
        description: "Start a new event capsule",
        url: "/dashboard/events/new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Join an Event",
        short_name: "Join",
        description: "Enter an event join code",
        url: "/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  }
}
