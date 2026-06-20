"use client";

import Link from "next/link";
import { useEffect } from "react";

export function ProcessingToast({
  videoId,
  onDismiss,
}: {
  videoId: string;
  onDismiss: () => void;
}) {
  // Auto-dismiss after 8 s
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [videoId, onDismiss]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-edge bg-surface px-4 py-3 shadow-xl">
      {/* Pulsing processing dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky" />
      </span>
      <span className="text-sm text-foam">Processing…</span>
      <Link
        href="/studio/content"
        onClick={onDismiss}
        className="text-sm font-semibold text-teal hover:underline"
      >
        View
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-1 text-mist hover:text-foam"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 2l10 10M12 2L2 12" />
        </svg>
      </button>
    </div>
  );
}
