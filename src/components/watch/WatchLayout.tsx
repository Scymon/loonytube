"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayQueue } from "@/hooks/usePlayQueue";
import type { PlayerMode } from "@/hooks/useWatchPlayer";
import WatchPlayer from "./WatchPlayer";
import WatchMeta from "./WatchMeta";
import WatchSidebar, {
  type SidebarProfile,
  type SidebarVideo,
  type TrendingTag,
} from "./WatchSidebar";
import Comments from "@/components/Comments";
import { useAudio } from "@/contexts/AudioContext";

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
  const videoMiniModeRef = useRef<PlayerMode>("page");
  // True only if THIS WatchLayout instance called handleModeChange("mini"/"mini-float").
  // Used in cleanup to avoid wiping another video's mini context when navigating
  // from one watch page to another without ever clicking mini on this page.
  const didSetMiniRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [queue, setQueue] = useState<string[]>([]);
  const [queuePos, setQueuePos] = useState(0);
  const [queueContext, setQueueContext] = useState("home");
  const [channelIdx, setChannelIdx] = useState(0);
  const refillInFlight = useRef(false);
  const { queue: userQueue, shiftQueue } = usePlayQueue();
  const { setVideoMiniMode, setVideoMeta, videoMiniMode, setVideoOnWatchPage } = useAudio();

  // Register that WatchLayout is mounted so PersistentMiniVideo defers to us.
  // On unmount: if still in mini mode, leave videoMiniMode/videoMeta intact so
  // PersistentMiniVideo can take over; otherwise clear.
  useEffect(() => {
    setVideoOnWatchPage(true);
    try {
      const saved = localStorage.getItem("loonytube:playerMode");
      if (saved === "mini" || saved === "mini-float") {
        localStorage.removeItem("loonytube:playerMode");
      }
    } catch { /* noop */ }
    return () => {
      setVideoOnWatchPage(false);
      // Only clear context if THIS WatchLayout set it AND it's no longer in mini mode.
      // Without this guard, navigating Watch A (mini) → Watch B → away would have
      // Watch B's cleanup wipe Watch A's mini context (Watch B never went mini).
      if (didSetMiniRef.current && videoMiniModeRef.current !== "mini") {
        setVideoMiniMode(null);
        setVideoMeta(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If something external clears videoMiniMode (e.g. MiniPlayer X button), restore page mode
  useEffect(() => {
    if (videoMiniMode === null && (mode === "mini" || mode === "mini-float")) {
      setMode("page");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoMiniMode]);

  const isTheatre = mode === "theatre";

  // On mount: restore player mode + build/restore the video queue.
  // relatedVideos is stable (SSR prop), so empty deps is intentional.
  useEffect(() => {
    try {
      // Only restore theatre mode — mini/mini-float are transient, don't restore them.
      if (localStorage.getItem("loonytube:playerMode") === "theatre") setMode("theatre");
      if (localStorage.getItem("loonytube:sidebar") === "0") setSidebarOpen(false);
      const ctx = localStorage.getItem("loonytube:queueContext");
      if (ctx) setQueueContext(ctx);
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
    videoMiniModeRef.current = m;
    if (m === "mini" || m === "mini-float") {
      didSetMiniRef.current = true;
      setVideoMiniMode(m);
      setVideoMeta({
        id:        videoId,
        title,
        ownerName: channelName ?? channelUsername,
        posterUrl: poster ?? null,
        token:     token ?? null,
      });
    } else {
      setVideoMiniMode(null);
      setVideoMeta(null);
    }
    try { localStorage.setItem("loonytube:playerMode", m); } catch { /* noop */ }
  }

  async function handleNext() {
    // 1. User queue takes priority
    const manualItem = shiftQueue();
    if (manualItem) {
      router.push(`/watch/${manualItem.id}`);
      return;
    }

    const next = queuePos + 1;

    // 2. We have a queued item — go immediately, then preemptively refill if close to the end
    if (queue[next]) {
      try { localStorage.setItem("loonytube:queuePos", String(next)); } catch { /* noop */ }
      router.push(`/watch/${queue[next]}`);
      if (!refillInFlight.current && next >= queue.length - 2) {
        refillInFlight.current = true;
        const exclude = queue.slice(-50).join(",");
        fetch(`/api/queue/refill?context=${queueContext}&exclude=${exclude}`)
          .then(r => r.json())
          .then(({ ids }: { ids: string[] }) => {
            if (ids?.length) {
              setQueue(prev => {
                const merged = [...prev, ...ids.filter(id => !prev.includes(id))];
                try { localStorage.setItem("loonytube:queue", JSON.stringify(merged)); } catch { /* noop */ }
                return merged;
              });
            }
          })
          .catch(() => { /* ignore */ })
          .finally(() => { refillInFlight.current = false; });
      }
      return;
    }

    // 3. At the end of the queue — await a refill then navigate to first new item
    if (refillInFlight.current) return; // already fetching, avoid double-fire
    refillInFlight.current = true;
    try {
      const exclude = queue.slice(-50).join(",");
      const r = await fetch(`/api/queue/refill?context=${queueContext}&exclude=${exclude}`);
      const { ids }: { ids: string[] } = await r.json();
      if (ids?.length) {
        const merged = [...queue, ...ids.filter(id => !queue.includes(id))];
        setQueue(merged);
        try { localStorage.setItem("loonytube:queue", JSON.stringify(merged)); } catch { /* noop */ }
        try { localStorage.setItem("loonytube:queuePos", String(next)); } catch { /* noop */ }
        router.push(`/watch/${merged[next]}`);
      }
    } catch { /* ignore */ }
    finally { refillInFlight.current = false; }
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

  function handleChannelUp() {
    if (!suggestedProfiles.length) return;
    const idx = Math.max(0, channelIdx - 1);
    setChannelIdx(idx);
    const p = suggestedProfiles[idx];
    if (p?.username) router.push(`/${p.username}`);
  }

  function handleChannelDown() {
    if (!suggestedProfiles.length) return;
    const idx = Math.min(suggestedProfiles.length - 1, channelIdx + 1);
    setChannelIdx(idx);
    const p = suggestedProfiles[idx];
    if (p?.username) router.push(`/${p.username}`);
  }

  // Always true — refill guarantees infinite content
  const hasNext = true;

  const player = (
    <WatchPlayer
      uid={videoId}
      token={token}
      poster={poster}
      description={description}
      mode={mode}
      onModeChange={handleModeChange}
      onNext={handleNext}
      onPrev={handlePrev}
      onChannelUp={handleChannelUp}
      onChannelDown={handleChannelDown}
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
      <div className="flex flex-col">
        {player}
        <div className="mt-4 flex min-h-0 pl-3 pr-2">
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

  // ── Page (and mini): player + meta + comments on left, sidebar on right ───────
  const isMini = mode === "mini" || mode === "mini-float";
  return (
    <div className="flex min-h-0 w-full pl-3 pr-2">
      <div className="min-w-0 flex-1 pb-4 pt-3 pr-3">
        {/* Mini mode: show placeholder where the player was */}
        {isMini && (
          <div className="relative mb-3 flex w-full items-center justify-center overflow-hidden rounded-xl border border-edge bg-panel" style={{ aspectRatio: "16/9" }}>
            <button
              onClick={() => handleModeChange("page")}
              className="text-sm text-mist hover:text-white transition-colors"
            >
              ▶ Playing in miniplayer — click to restore
            </button>
          </div>
        )}
        {/* Player always rendered so iframe never unmounts */}
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
