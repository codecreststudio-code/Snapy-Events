import { createClient } from "@/lib/supabase/server"

export async function incrementEventView(eventId: string): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.rpc("increment_event_view", { event_uuid: eventId })
  } catch { /* non-critical */ }
}
