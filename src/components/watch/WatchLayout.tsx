"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlayerMode } from "@/hooks/useWatchPlayer";
import WatchPlayer from "./WatchPlayer";
import WatchMeta from "./WatchMeta";
import WatchSidebar, {
  type SidebarProfile,
  type SidebarVideo,
  type TrendingTag,
} from "./WatchSidebar";
import Comments from "@/components/Comments";

export type WatchLayoutProps = {
  videoId: string;
  token: string | null;
  poster?: string;
  // meta
  title: string;
  description: string | null;
  views: number;
  createdAt: string;
  owner: string;
  channelUsername: string | null;
  channelName: string | null;
  channelAvatar: string | null;
  signedInUserId: string | null;
  isFollowing: boolean;
  // sidebar
  channelHandle: string;
  relatedVideos: SidebarVideo[];
  suggestedProfiles: SidebarProfile[];
  trendingTags: TrendingTag[];
  signedIn: boolean;
};

export default function WatchLayout({
  videoId, token, poster,
  title, description, views, createdAt, owner,
  channelUsername, channelName, channelAvatar,
  signedInUserId, isFollowing,
  channelHandle, relatedVideos, suggestedProfiles, trendingTags, signedIn,
}: WatchLayoutProps) {
  const router = useRouter();
  const [mode, setMode] = useState<PlayerMode>("page");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [queue, setQueue] = useState<string[]>([]);
  const [queuePos, setQueuePos] = useState(0);
  const isTheatre = mode === "theatre";

  // On mount: restore player mode + build/restore the video queue.
  // relatedVideos is stable (SSR prop), so empty deps is intentional.
  useEffect(() => {
    try {
      if (localStorage.getItem("loonytube:playerMode") === "theatre") setMode("theatre");
      if (localStorage.getItem("loonytube:sidebar") === "0") setSidebarOpen(false);
    } catch { /* noop */ }

    try {
      const saved: string[] = JSON.parse(localStorage.getItem("loonytube:queue") || "[]");
      const pos = parseInt(localStorage.getItem("loonytube:queuePos") || "-1", 10);
      if (pos >= 0 && pos < saved.length && saved[pos] === videoId) {
        // Navigating within an existing queue — restore position
        setQueue(saved);
        setQueuePos(pos);
      } else {
        // Fresh start: current video followed by related videos in order
        const fresh = [videoId, ...relatedVideos.map((v) => v.id)];
        setQueue(fresh);
        setQueuePos(0);
        localStorage.setItem("loonytube:queue", JSON.stringify(fresh));
        localStorage.setItem("loonytube:queuePos", "0");
      }
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleModeChange(m: PlayerMode) {
    setMode(m);
    try { localStorage.setItem("loonytube:playerMode", m); } catch { /* noop */ }
  }

  function handleNext() {
    const next = queuePos + 1;
    try { localStorage.setItem("loonytube:queuePos", String(next)); } catch { /* noop */ }
    router.push(`/watch/${queue[next]}`);
  }

  function handlePrev() {
    if (queuePos > 0) {
      const prev = queuePos - 1;
      try { localStorage.setItem("loonytube:queuePos", String(prev)); } catch { /* noop */ }
      router.push(`/watch/${queue[prev]}`);
    } else {
      router.back();
    }
  }

  const hasNext = queuePos < queue.length - 1;

  const player = (
    <WatchPlayer
      uid={videoId}
      token={token}
      poster={poster}
      mode={mode}
      onModeChange={handleModeChange}
      onNext={hasNext ? handleNext : undefined}
      onPrev={handlePrev}
    />
  );

  const meta = (
    <WatchMeta
      videoId={videoId}
      title={title}
      description={description}
      views={views}
      createdAt={createdAt}
      owner={owner}
      channelUsername={channelUsername}
      channelName={channelName}
      channelAvatar={channelAvatar}
      signedInUserId={signedInUserId}
      isFollowing={isFollowing}
    />
  );

  const sidebar = (
    <WatchSidebar
      channelHandle={channelHandle}
      relatedVideos={relatedVideos}
      suggestedProfiles={suggestedProfiles}
      trendingTags={trendingTags}
      signedIn={signedIn}
      open={sidebarOpen}
      onOpenChange={(v) => { setSidebarOpen(v); try { localStorage.setItem("loonytube:sidebar", v ? "1" : "0"); } catch { /* noop */ } }}
    />
  );

  // ── Theatre: player full width, content + sidebar side-by-side below ────────
  if (isTheatre) {
    return (
      <div className="flex flex-col pl-3 pr-2">
        {player}
        <div className="mt-4 flex min-h-0">
          <div className="min-w-0 flex-1 pb-4 pr-3">
            {meta}
            <div className="mt-8">
              <Comments videoId={videoId} />
            </div>
          </div>
          {sidebar}
        </div>
      </div>
    );
  }

  // ── Page: player + meta + comments on left, sidebar on right ────────────────
  return (
    <div className="flex min-h-0 w-full pl-3 pr-2">
      <div className="min-w-0 flex-1 pb-4 pt-3 pr-3">
        {player}
        {meta}
        <div className="mt-8">
          <Comments videoId={videoId} />
        </div>
      </div>
      {sidebar}
    </div>
  );
}
