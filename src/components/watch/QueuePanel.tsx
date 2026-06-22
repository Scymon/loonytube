"use client";
import Link from "next/link";
import { usePlayQueue } from "@/hooks/usePlayQueue";

function fmtDur(s: number | null) {
  if (!s) return "";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function QueuePanel({ open, onClose }: Props) {
  const { queue, removeFromQueue, clearQueue, moveUp, moveDown } = usePlayQueue();

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex w-80 flex-col rounded-2xl border border-edge bg-panel shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-teal">
            <path d="M3 6h18M3 12h12M3 18h8" />
          </svg>
          <span className="text-sm font-semibold text-foam">Play Queue</span>
          {queue.length > 0 && (
            <span className="rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-bold text-teal">{queue.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {queue.length > 0 && (
            <button onClick={clearQueue} className="rounded px-2 py-1 text-[10px] text-mist hover:text-foam transition">Clear</button>
          )}
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full hover:bg-edge/60 text-mist hover:text-foam transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Queue items */}
      <div className="max-h-[60vh] overflow-y-auto">
        {queue.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-mist">Queue is empty</p>
        ) : (
          <ul className="divide-y divide-edge">
            {queue.map((item, i) => (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-edge/40 group">
                {/* Thumbnail */}
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {item.thumbnail
                    ? <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                    : <div className="h-full w-full bg-edge/40" />}
                  {item.duration && (
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] text-white">{fmtDur(item.duration)}</span>
                  )}
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <Link href={`/watch/${item.id}`} className="block truncate text-xs font-semibold text-foam hover:text-teal">
                    {item.title}
                  </Link>
                  <p className="truncate text-[10px] text-mist">{item.channel}</p>
                </div>
                {/* Controls */}
                <div className="flex shrink-0 flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => moveUp(item.id)} disabled={i === 0}
                    className="grid h-5 w-5 place-items-center rounded text-mist hover:text-foam disabled:opacity-20">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button onClick={() => moveDown(item.id)} disabled={i === queue.length - 1}
                    className="grid h-5 w-5 place-items-center rounded text-mist hover:text-foam disabled:opacity-20">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>
                <button onClick={() => removeFromQueue(item.id)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-mist opacity-0 group-hover:opacity-100 hover:text-red-400 transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
