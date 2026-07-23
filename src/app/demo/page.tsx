import { Metadata } from "next"
import { DemoEventView } from "@/lib/components/demo/demo-event-view"

export const metadata: Metadata = {
  title: "Interactive Sample Event | Snapsy Events",
  description:
    "Explore how Snapsy Events works before creating your own event. Live photo wall, AI memory stories, voice notes, and QR code check-ins.",
}

export default function PublicDemoPage() {
  return <DemoEventView />
}
