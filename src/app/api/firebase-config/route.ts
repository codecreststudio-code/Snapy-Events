import { NextResponse } from "next/server"
import { firebaseConfig } from "@/lib/firebase/config"

// Returns the public Firebase web config so service worker can initialize
// FCM background notifications without hardcoding project keys into public/sw.js.
export async function GET() {
  return NextResponse.json(firebaseConfig, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}
