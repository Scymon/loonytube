"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePlayQueue } from "@/hooks/usePlayQueue";
import QueuePanel from "@/components/watch/QueuePanel";

export default function WatchClient({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [queueOpen, setQueueOpen] = useState(false);
  const { queue, shiftQueue } = usePlayQueue();

  function handleVideoEnd() {
    const next = shiftQueue();
    if (next) router.push(`/watch/${next.id}`);
  }

  const nextVideo = queue[0] ?? null;

  return (
    <>
      {/* Prev / Next navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 rounded-full border border-edge px-3 py-1.5 text-xs text-mist hover:border-teal hover:text-teal transition"
          title="Previous video"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 20 9 12l10-8v16zM5 19V5"/>
          </svg>
          Prev
        </button>
        <button
          onClick={() => { if (nextVideo) { shiftQueue(); router.push(`/watch/${nextVideo.id}`); } }}
          disabled={!nextVideo}
          className="flex items-center gap-1 rounded-full border border-edge px-3 py-1.5 text-xs text-mist hover:border-teal hover:text-teal transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-edge disabled:hover:text-mist"
          title={nextVideo ? `Next: ${nextVideo.title}` : "Queue is empty"}
        >
          Next
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4l10 8-10 8V4zM19 5v14"/>
          </svg>
        </button>
      </div>

      {/* Queue toggle button */}
      <button
        onClick={() => setQueueOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-xs text-mist hover:border-teal hover:text-teal transition"
        title="Play queue"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M3 12h12M3 18h8" />
        </svg>
        Queue{queue.length > 0 && <span className="font-bold text-teal ml-0.5">{queue.length}</span>}
      </button>

      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
    </>
  );
}
