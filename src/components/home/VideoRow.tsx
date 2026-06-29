"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { nfmt, dur, ago } from "@/lib/format";
import { usePlayQueue } from "@/hooks/usePlayQueue";
import PlaylistModal from "@/components/PlaylistModal";

export type FeedVideo = {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  views: number;
  created_at: string;
  channel: string;
  avatar: string | null;
};

export default function VideoRow({
  video,
  context = "home",
  signedIn = false,
}: {
  video: FeedVideo;
  context?: string;
  signedIn?: boolean;
}) {
  const d = dur(video.duration);
  const { addToQueue } = usePlayQueue();
  const [showPlModal, setShowPlModal] = useState(false);
  const [queued, setQueued] = useState(false);

  function handleAddToQueue(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addToQueue({ id: video.id, title: video.title, thumbnail: video.thumbnail, channel: video.channel, duration: video.duration });
    setQueued(true);
    setTimeout(() => setQueued(false), 1500);
  }

  function handleOpenPlaylist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowPlModal(true);
  }

  function setCtx() {
    try { localStorage.setItem("loonytube:queueContext", context); } catch {}
  }

  return (
    <article>
      <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-edge bg-black">
        <Link href={`/watch/${video.id}`} onClick={setCtx} className="block h-full w-full">
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
          ) : (
            <div className="grid h-full w-full place-items-center text-mist" style={{ backgroundImage: "linear-gradient(180deg,#141a24,#0b0f15)" }}>
              <span className="text-sm">processing…</span>
            </div>
          )}
          {d && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-foam">{d}</span>
          )}
        </Link>

        {/* Hover action buttons */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleAddToQueue}
            title={queued ? "Added!" : "Add to queue"}
            className={`grid h-8 w-8 place-items-center rounded-lg backdrop-blur transition ${
              queued ? "bg-teal text-ink" : "bg-black/70 text-foam hover:bg-teal hover:text-ink"
            }`}
          >
            {queued ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 6h18M3 12h12M3 18h8"/><path d="M19 15v6M16 18h6"/>
              </svg>
            )}
          </button>
          {signedIn && (
            <button
              onClick={handleOpenPlaylist}
              title="Save to playlist"
              className="grid h-8 w-8 place-items-center rounded-lg bg-black/70 text-foam backdrop-blur transition hover:bg-edge hover:text-teal"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-3">
        <Avatar name={video.channel} src={video.avatar} size={36} />
        <div className="min-w-0">
          <Link href={`/watch/${video.id}`} onClick={setCtx}>
            <h3 className="line-clamp-2 font-semibold leading-snug text-foam hover:text-sky">{video.title}</h3>
          </Link>
          <p className="mt-1 text-sm text-mist">{video.channel}</p>
          <p className="text-sm text-mist">{nfmt(video.views)} views · {ago(video.created_at)}</p>
        </div>
      </div>

      {showPlModal && (
        <PlaylistModal videoId={video.id} videoTitle={video.title} onClose={() => setShowPlModal(false)} />
      )}
    </article>
  );
}
