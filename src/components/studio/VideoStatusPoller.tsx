"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls /api/sync-video-status for any video that isn't "ready" yet.
 * When a video becomes ready (or fails), refreshes the page data.
 * Stops polling once all videos are in a terminal state.
 */
export default function VideoStatusPoller({ processingIds }: { processingIds: string[] }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!processingIds.length) return;

    const remaining = new Set(processingIds);

    async function poll() {
      const settled: string[] = [];
      await Promise.all(
        [...remaining].map(async (id) => {
          try {
            const res = await fetch("/api/sync-video-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoId: id }),
            });
            if (!res.ok) return;
            const { status } = await res.json() as { status: string };
            if (status === "ready" || status === "failed") {
              settled.push(id);
            }
          } catch {
            // network error — keep trying
          }
        }),
      );
      if (settled.length) {
        for (const id of settled) remaining.delete(id);
        router.refresh(); // re-run server component to pick up new status
      }
      if (!remaining.size && timer.current) {
        clearInterval(timer.current);
      }
    }

    // First poll immediately, then every 5 seconds
    poll();
    timer.current = setInterval(poll, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [processingIds, router]);

  return null; // purely behavioural
}
