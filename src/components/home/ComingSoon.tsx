// Neutral empty state shown when a section has no real data yet.
export default function ComingSoon({ label }: { label: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-edge bg-surface/30 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foam/80">{label}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-mist/70">Coming soon</p>
    </div>
  );
}
