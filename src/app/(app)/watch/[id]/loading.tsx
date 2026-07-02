// Watch page skeleton: player + meta on the left, sidebar rail on lg+.
export default function Loading() {
  return (
    <div className="flex min-h-0 w-full flex-col pl-3 pr-2 lg:flex-row" aria-busy="true" aria-label="Loading video">
      <div className="min-w-0 flex-1 pb-4 pt-3 pr-3">
        <div className="w-full animate-pulse rounded-xl bg-edge/40" style={{ aspectRatio: "16/9" }} />
        <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-edge/50" />
        <div className="mt-3 flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-edge/50" />
          <div className="h-4 w-32 animate-pulse rounded bg-edge/40" />
        </div>
        <div className="mt-4 h-24 w-full animate-pulse rounded-xl bg-edge/30" />
      </div>
      <aside className="hidden w-[300px] shrink-0 flex-col gap-3 border-l border-edge px-3 py-4 lg:flex">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <div className="h-[54px] w-24 shrink-0 animate-pulse rounded-lg bg-edge/40" />
            <div className="flex-1 py-0.5">
              <div className="h-3.5 w-full animate-pulse rounded bg-edge/40" />
              <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-edge/30" />
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
