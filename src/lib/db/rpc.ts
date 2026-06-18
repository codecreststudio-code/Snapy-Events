import { createClient } from "@/lib/supabase/server"

export async function increment_qr_scan({ qr_id, ip, ua, country, city, device, referrer }: { qr_id: string; ip: string | null; ua: string | null; country: string | null; city: string | null; device: string | null; referrer: string | null }) {
  const supabase = await createClient()
  await supabase.rpc("increment_qr_scan", { qr_uuid: qr_id, scan_ip: ip, scan_ua: ua, scan_country: country, scan_city: city, scan_device: device, scan_referrer: referrer })
}
