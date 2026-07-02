// Studio loading skeleton: table-ish rows.
export default function Loading() {
  return (
    <div className="px-4 py-6 sm:px-6" aria-busy="true" aria-label="Loading studio">
      <div className="mb-6 h-6 w-40 animate-pulse rounded bg-edge/60" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-edge bg-surface p-3">
            <div className="h-12 w-20 shrink-0 animate-pulse rounded-lg bg-edge/40" />
            <div className="flex-1">
              <div className="h-4 w-1/3 animate-pulse rounded bg-edge/40" />
              <div className="mt-1.5 h-3 w-1/5 animate-pulse rounded bg-edge/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
