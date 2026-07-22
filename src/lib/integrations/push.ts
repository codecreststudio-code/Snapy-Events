// Server-side push-notification sender. Two responsibilities, always both
// attempted, independently of each other:
//   1. Write a row to `public.notifications` (powers the in-app Notification
//      Center — see src/lib/components/notifications/notification-center.tsx)
//      — this ALWAYS happens (subject to the user's preference toggle),
//      regardless of whether FCM delivery succeeds, so a push failure never
//      means the guest/host silently never finds out something happened.
//   2. Best-effort FCM delivery to every active device the user has
//      registered (src/app/api/notifications/devices). No-ops with a log
//      line (not an error) if FIREBASE_SERVICE_ACCOUNT_KEY isn't configured
//      yet — see .env.example for how to obtain it.
//
// Call this from `after()` blocks in API routes / server actions so it never
// blocks the actual user-facing response (see the two call sites wired so
// far: src/app/actions/guest.ts and src/app/api/photos/upload/route.ts).
import { adminDb } from "@/lib/supabase/admin"

export type NotificationType =
  | "new_guest_joined"
  | "media_uploaded"
  | "comment_received"
  | "photo_liked"
  | "video_uploaded"
  | "voice_note_received"
  | "ai_story_ready"
  | "ai_highlight_ready"
  | "event_ending_soon"
  | "storage_warning"
  | "guest_milestone"
  | "subscription_reminder"

// Maps the fine-grained notification `type` to the coarser preference
// category a user actually toggles in Settings (notification_preferences).
// Types with no entry here are always sent (e.g. nothing critical enough to
// mute exists yet) — add an entry whenever a new type should be mutable.
const TYPE_TO_PREFERENCE_CATEGORY: Partial<Record<NotificationType, string>> = {
  new_guest_joined: "new_guest",
  media_uploaded: "uploads",
  video_uploaded: "uploads",
  voice_note_received: "uploads",
  comment_received: "comments",
  photo_liked: "likes",
  ai_story_ready: "ai_stories",
  ai_highlight_ready: "highlights",
  guest_milestone: "milestones",
  event_ending_soon: "reminders",
  subscription_reminder: "reminders",
}

export interface SendPushNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body?: string
  /** Arbitrary deep-link payload — `data.url` is what the notification
   * center and the service worker's notificationclick handler navigate to. */
  data?: Record<string, unknown>
}

export interface SendPushNotificationResult {
  /** Whether a notifications-table row was written (drives the in-app center). */
  written: boolean
  /** How many devices FCM successfully delivered to (0 if unconfigured/no devices/all failed). */
  delivered: number
}

export async function sendPushNotification(
  input: SendPushNotificationInput,
): Promise<SendPushNotificationResult> {
  try {
    const db = await adminDb()

    const category = TYPE_TO_PREFERENCE_CATEGORY[input.type]
    if (category) {
      const { data: prefRow } = await db
        .from("notification_preferences")
        .select("preferences")
        .eq("user_id", input.userId)
        .maybeSingle()
      const prefs = (prefRow?.preferences as Record<string, boolean> | undefined) ?? {}
      // Default to sending when the user has no row yet / the category is
      // missing from it — matches the migration's own column default (every
      // category defaults to true except marketing).
      if (prefs[category] === false) {
        return { written: false, delivered: 0 }
      }
    }

    const { error: insertErr } = await db.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? {},
    })
    if (insertErr) {
      console.error("[push] failed to write notification row", insertErr)
    }

    const delivered = await sendFcmToUser(db, input)
    return { written: !insertErr, delivered }
  } catch (err) {
    // This function is always called from a non-blocking after()/background
    // path — never let it throw into whatever triggered it.
    console.error("[push] sendPushNotification failed", err)
    return { written: false, delivered: 0 }
  }
}

async function sendFcmToUser(
  db: Awaited<ReturnType<typeof adminDb>>,
  input: SendPushNotificationInput,
): Promise<number> {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountRaw) {
    console.log(
      "[push] FIREBASE_SERVICE_ACCOUNT_KEY not set — notification recorded in-app only, no FCM push sent. See .env.example.",
    )
    return 0
  }

  const { data: devices } = await db
    .from("notification_devices")
    .select("notification_token")
    .eq("user_id", input.userId)
    .eq("is_active", true)

  const tokens = (devices ?? []).map((d) => d.notification_token).filter(Boolean)
  if (tokens.length === 0) return 0

  try {
    const admin = await getFirebaseAdmin(serviceAccountRaw)
    const url = typeof input.data?.url === "string" ? input.data.url : "/dashboard"

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: input.title, body: input.body },
      // FCM's `data` payload values must all be strings.
      data: Object.fromEntries(
        Object.entries(input.data ?? {}).map(([k, v]) => [k, String(v)]),
      ),
      webpush: {
        fcmOptions: { link: url },
        notification: { icon: "/icons/icon-192.png" },
      },
    })

    // Prune tokens FCM tells us are dead (uninstalled app, revoked
    // permission, expired token) so the device list doesn't grow stale
    // forever and future sends don't keep paying for guaranteed failures.
    const deadTokens: string[] = []
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          deadTokens.push(tokens[i])
        }
      }
    })
    if (deadTokens.length > 0) {
      await db.from("notification_devices").update({ is_active: false }).in("notification_token", deadTokens)
    }

    return response.successCount
  } catch (err) {
    console.error("[push] FCM send failed", err)
    return 0
  }
}

// firebase-admin singleton — re-initializing on every call throws.
let firebaseAdminModule: typeof import("firebase-admin") | null = null

async function getFirebaseAdmin(serviceAccountRaw: string) {
  const admin = await import("firebase-admin")
  if (!firebaseAdminModule) {
    if (admin.apps.length === 0) {
      const serviceAccount = JSON.parse(serviceAccountRaw)
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    }
    firebaseAdminModule = admin
  }
  return firebaseAdminModule
}
