export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#e5dfd0] bg-[#ffffff] p-6 animate-pulse">
            <div className="h-4 w-24 rounded bg-white/10 mb-3" />
            <div className="h-8 w-16 rounded bg-white/10" />
          </div>
        ))}
      </div>
      {/* Recent events skeleton */}
      <div className="rounded-2xl border border-[#e5dfd0] bg-[#ffffff] p-6 animate-pulse space-y-4">
        <div className="h-5 w-32 rounded bg-white/10" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-white/10" />
              <div className="h-3 w-32 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
