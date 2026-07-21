// src/lib/integrations/recap-video.ts
//
// Recap Video ("Highlight Movie") has been removed from the product — it
// never rendered reliably in production, and the host asked for it and AI
// Smart Clusters to be dropped entirely. This file can't be deleted from
// this environment (the mounted folder blocks unlink/rename on some files),
// so its ffmpeg pipeline has been gutted. Nothing in the app imports from
// this file anymore — see src/app/api/events/[id]/recap/generate/route.ts
// (gutted to a 410 stub) for the only route that used to call into it.
export {}
