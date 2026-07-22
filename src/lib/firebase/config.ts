// Public Firebase Web config — these values (apiKey, projectId, sender ID,
// app ID) identify the Firebase project but are NOT secrets; Google's own
// docs ship them in plain client-side code and in the public
// firebase-messaging-sw.js file (see public/sw.js, which hardcodes the same
// values for background-notification handling since a static file served
// from /public can't read process.env at request time). The one genuinely
// secret Firebase credential is the service-account JSON used server-side
// in src/lib/integrations/push.ts (FIREBASE_SERVICE_ACCOUNT_KEY) — never
// exposed here or to the client.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      FIREBASE_VAPID_KEY
  )
}
