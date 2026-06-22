"use client";
export default function ChannelGuidePlaceholder() {
  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-edge bg-surface">
      <div className="flex items-center justify-between border-b border-edge px-5 py-3">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-mist">
            <rect x="2" y="7" width="20" height="15" rx="2" />
            <path d="M16 3l-4 4-4-4" />
          </svg>
          <h2 className="text-sm font-bold text-foam">Channel Guide</h2>
          <span className="rounded-full bg-edge px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mist">
            Coming Soon
          </span>
        </div>
      </div>
      <div className="px-5 py-8 text-center">
        <p className="text-sm text-mist">
          The Channel Guide shows scheduled streams from channels you follow.
        </p>
        <p className="mt-1 text-xs text-mist/50">Available when live streaming infrastructure launches.</p>
      </div>
    </section>
  );
}
