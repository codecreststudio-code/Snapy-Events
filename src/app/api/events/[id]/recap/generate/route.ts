// src/app/api/events/[id]/recap/generate/route.ts
//
// Recap Video ("Highlight Movie") has been removed from the product — it
// never rendered reliably in production, and the host asked for it and AI
// Smart Clusters to be dropped entirely. This route file can't be deleted
// from this environment (the mounted folder blocks unlink/rename on some
// files), so it's gutted to a 410 Gone stub instead of a working generator.
// See src/lib/integrations/recap-video.ts (also gutted) for the same note.

import { defineRoute, fail } from "@/lib/api/handler"

export const POST = defineRoute({
  method: "POST",
  requireAuth: true,
  handler: async () => fail("REMOVED", "Recap Video has been removed from Snapsy.", 410),
}).POST
