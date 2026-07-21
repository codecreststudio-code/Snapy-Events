// src/app/api/ai/faces/batch-process/route.ts
//
// AI Smart Clusters (the "Initiate New Face Match" batch re-scan button on
// the host dashboard) has been removed at the host's request. It's not
// needed for correctness: face detection already runs automatically on
// every upload via detectAndStoreFaces() in src/app/api/photos/upload/route.ts,
// which is what actually populates the `faces` table that guest-facing face
// search (/api/ai/faces/search) reads from. This route file can't be
// deleted from this environment (the mounted folder blocks unlink/rename on
// some files), so it's gutted to a 410 Gone stub.

import { defineRoute, fail } from "@/lib/api/handler"

export const POST = defineRoute({
  method: "POST",
  requireAuth: true,
  handler: async () => fail("REMOVED", "AI Smart Clusters has been removed from Snapsy.", 410),
}).POST
