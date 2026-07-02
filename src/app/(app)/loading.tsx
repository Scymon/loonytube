// Route-level loading skeleton for all (app) pages without their own.
export default function Loading() {
  return (
    <div className="px-4 py-6 sm:px-6" aria-busy="true" aria-label="Loading page">
      <div className="mb-6 h-6 w-44 animate-pulse rounded bg-edge/60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-video w-full animate-pulse rounded-xl bg-edge/40" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-edge/40" />
            <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-edge/30" />
          </div>
        ))}
      </div>
    </div>
  );
}
