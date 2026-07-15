import { getPlatformSettings } from "@/app/actions/admin-settings"
import { FeatureFlagsClient } from "./feature-flags-client"

export const metadata = {
  title: "Feature Flags | Snapsy Admin",
}

export default async function AdminFeatureFlagsPage() {
  const { data, success } = await getPlatformSettings()
  const initialFlags = success && data?.feature_flags ? data.feature_flags : {}

  return <FeatureFlagsClient initialFlags={initialFlags} />
}
