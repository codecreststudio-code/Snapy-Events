import { Metadata } from "next"
import { DemoEventView } from "@/lib/components/demo/demo-event-view"

export const metadata: Metadata = {
  title: "Sample Event Experience | Snapsy Events",
  description:
    "Explore a fully interactive sample event to discover how Snapsy Events handles live photo sharing, AI features, voice notes, and guest check-ins.",
}

export default function DashboardDemoPage() {
  return <DemoEventView />
}
