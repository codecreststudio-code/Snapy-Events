export default function EventsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded bg-white/10 animate-pulse" />
        <div className="h-9 w-28 rounded bg-white/10 animate-pulse" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl border border-[#3D332A] bg-[#1C1814] p-5 animate-pulse flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-white/10" />
            <div className="h-3 w-32 rounded bg-white/10" />
          </div>
          <div className="h-6 w-16 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  )
}
