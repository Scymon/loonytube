"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import Link from "next/link";
import { dur, nfmt } from "@/lib/format";
import { usePlayQueue } from "@/hooks/usePlayQueue";

export type PlaylistItem = {
  id: string;
  video_id: string;
  position: number;
  title?: string;
  thumbnail?: string | null;
  duration?: number | null;
  views?: number;
  channel?: string;
  avatar?: string | null;
};

type Props = {
  playlist: { id: string; title: string; visibility: string; created_at: string };
  items: PlaylistItem[];
  isOwner: boolean;
};

export default function PlaylistClient({ playlist, items, isOwner }: Props) {
  const router = useRouter();
  const { addToQueue, clearQueue } = usePlayQueue();

  function playAll() {
    clearQueue();
    for (const item of items) {
      addToQueue({
        id: item.video_id,
        title: item.title ?? "Untitled",
        thumbnail: item.thumbnail ?? null,
        channel: item.channel ?? "someone",
        duration: item.duration ?? null,
      });
    }
    if (items[0]) router.push(`/watch/${items[0].video_id}`);
  }

  const totalDuration = items.reduce((s, i) => s + (i.duration ?? 0), 0);
  const hrs = Math.floor(totalDuration / 3600);
  const mins = Math.floor((totalDuration % 3600) / 60);
  const durationLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end">
        {/* Mosaic thumbnail */}
        <div className="relative h-44 w-72 shrink-0 overflow-hidden rounded-2xl border border-edge bg-black">
          {items[0]?.thumbnail ? (
            <img src={items[0].thumbnail} alt={playlist.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#0d2b3e] to-[#0a1622]" />
          )}
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-3">
            <span className="text-xs font-semibold text-foam">{items.length} video{items.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="mb-1 text-xs uppercase tracking-widest text-mist">Playlist</p>
          <h1 className="text-2xl font-bold text-foam">{playlist.title}</h1>
          <p className="mt-1 text-sm text-mist">
            {items.length} videos · {durationLabel}
            {playlist.visibility === "private" && (
              <span className="ml-2 rounded-full border border-edge px-2 py-0.5 text-xs text-mist">Private</span>
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={playAll}
              disabled={items.length === 0}
              className="flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-teal/90 disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
              Play all
            </button>
            {isOwner && (
              <Link href={`/dashboard`} className="flex items-center gap-2 rounded-xl border border-edge px-5 py-2.5 text-sm font-semibold text-foam transition hover:border-teal/50 hover:text-teal">
                Edit playlists
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <p className="py-12 text-center text-mist">This playlist is empty.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <Link
              key={item.id}
              href={`/watch/${item.video_id}`}
              className="group flex items-center gap-4 rounded-xl px-3 py-2 transition hover:bg-edge/40"
            >
              <span className="w-6 shrink-0 text-center text-sm text-mist">{idx + 1}</span>
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-edge bg-black">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#0d2b3e] to-[#0a1622]" />
                )}
                {item.duration && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-semibold text-foam">
                    {dur(item.duration)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foam group-hover:text-sky">{item.title ?? "Untitled"}</p>
                <p className="text-sm text-mist">{item.channel ?? "someone"} · {nfmt(item.views ?? 0)} views</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
