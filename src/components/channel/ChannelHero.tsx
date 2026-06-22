"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import FollowUserButton from "@/components/discovery/FollowUserButton";
import Link from "next/link";
import { nfmt } from "@/lib/format";

const SDK_URL = "https://embed.cloudflarestream.com/embed/sdk.latest.js";
const BANNER_FALLBACK = "linear-gradient(120deg,#0a1a2c 0%,#0d2b3e 40%,#103244 70%,#0a1622 100%)";

function iframeSrc(id: string, poster?: string) {
  const p = poster ? `&poster=${encodeURIComponent(poster)}` : "";
  return `https://iframe.cloudflarestream.com/${id}?autoplay=true&muted=true&loop=true&controls=false&preload=auto${p}`;
}
function fmtTime(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
);
const IcoPause = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="3" width="4" height="18" rx="1" /><rect x="15" y="3" width="4" height="18" rx="1" />
  </svg>
);
const IcoPlayBig = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
);
const IcoMuted = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5 6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
  </svg>
);
const IcoUnmuted = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);
const IcoTheatre = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
  </svg>
);
const IcoFullscreen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);
const IcoClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
function CtrlBtn({ onClick, title, children }: {
  onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} title={title}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition">
      {children}
    </button>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type VideoInfo = { id: string; title: string; thumbnail: string | null };
type ProfileInfo = {
  id: string; username: string; full_name: string | null;
  avatar_url: string | null; banner_url: string | null;
};
type Props = {
  video: VideoInfo | null;
  profile: ProfileInfo;
  followerCount: number;
  isOwnChannel: boolean;
  isFollowing: boolean;
  notifLevel: string;
  signedIn: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChannelHero({
  video, profile, followerCount, isOwnChannel, isFollowing, notifLevel, signedIn,
}: Props) {
  const [isTheatre, setIsTheatre]     = useState(false);
  const [muted, setMuted]             = useState(true);
  const [isPaused, setIsPaused]       = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const playerRef    = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef(0);

  const displayName = profile.full_name || profile.username || "Channel";

  useEffect(() => {
    function initPlayer() {
      if (iframeRef.current && (window as any).Stream && !playerRef.current) {
        const p = (window as any).Stream(iframeRef.current);
        playerRef.current = p;
        p.addEventListener("play",           () => setIsPaused(false));
        p.addEventListener("pause",          () => setIsPaused(true));
        p.addEventListener("timeupdate",     () => {
          const t = p.currentTime ?? 0;
          const dur = p.duration ?? 0;
          setCurrentTime(t);
          if (dur > 0) setDuration(dur);
          const sec = Math.floor(t);
          if (video && sec > 0 && sec !== lastSavedRef.current) {
            lastSavedRef.current = sec;
            localStorage.setItem(`loonytube:resume:${video.id}`, String(sec));
          }
        });
        p.addEventListener("durationchange", () => { if (p.duration > 0) setDuration(p.duration); });
        p.addEventListener("loadedmetadata", () => { if (p.duration > 0) setDuration(p.duration); });
      }
    }
    if ((window as any).Stream) { initPlayer(); return; }
    let s = document.querySelector(`script[src="${SDK_URL}"]`) as HTMLScriptElement | null;
    if (!s) { s = document.createElement("script") as HTMLScriptElement; s.src = SDK_URL; document.head.appendChild(s); }
    s.addEventListener("load", initPlayer, { once: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyMute(next: boolean) { setMuted(next); if (playerRef.current) playerRef.current.muted = next; }
  function toggleMute(e: React.MouseEvent) { e.stopPropagation(); applyMute(!muted); }
  function togglePlayPause(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (isPaused) { playerRef.current?.play();  setIsPaused(false); }
    else          { playerRef.current?.pause(); setIsPaused(true);  }
  }
  function seekTo(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!duration || !playerRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(((e.clientX - r.left) / r.width) * duration, duration));
    playerRef.current.currentTime = t;
    setCurrentTime(t);
  }
  function enterTheatre(e?: React.MouseEvent) { e?.stopPropagation(); setIsTheatre(true);  applyMute(false); }
  function exitTheatre(e: React.MouseEvent)   { e.stopPropagation();  setIsTheatre(false); applyMute(true);  }
  function doFullscreen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }

  /* ── No video: static banner ── */
  if (!video) {
    return (
      <div className="relative w-full overflow-hidden rounded-b-2xl" style={{ minHeight: 144 }}
        style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: BANNER_FALLBACK }}>

      </div>
    );
  }

  const pct    = duration > 0 ? (currentTime / duration) * 100 : 0;
  const poster = video.thumbnail ?? undefined;

  return (
    <div ref={containerRef}
      className={`group relative w-full overflow-hidden rounded-b-2xl transition-all duration-300 ${isTheatre ? "bg-black cursor-default" : "cursor-pointer"}`}
      style={isTheatre ? { aspectRatio: "16/9", maxHeight: "80vh" } : { aspectRatio: "16/5", minHeight: 200 }}
      onClick={isTheatre ? () => togglePlayPause() : () => enterTheatre()}>

      {/* Single iframe */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe ref={iframeRef} src={iframeSrc(video.id, poster)}
          allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)", width: "100%",
            height: isTheatre ? "100%" : "56.25vw",
            minWidth: isTheatre ? undefined : "177.78vh",
            minHeight: isTheatre ? undefined : "100%",
            border: "none", pointerEvents: "none",
          }} />
      </div>

      {/* ── Ambient overlay: channel identity ── */}
      {!isTheatre && (<>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 pointer-events-none" />

        {/* Channel info — bottom-left */}
        <div className="absolute bottom-3 left-4 flex items-center gap-3 pointer-events-none">
          <Avatar name={displayName} src={profile.avatar_url} size={52} ring={true} />
          <div>
            <p className="text-lg font-bold text-white drop-shadow leading-tight">{displayName}</p>
            <p className="text-xs text-foam/80">{nfmt(followerCount)} subscribers</p>
          </div>
        </div>

        {/* Follow / Edit — bottom-right, clear of top-right controls */}
        <div className="absolute bottom-3 right-4 pointer-events-auto" onClick={e => e.stopPropagation()}>
          {isOwnChannel ? (
            <a href="/studio/profile"
              className="inline-flex rounded-full border border-white/30 bg-black/50 px-4 py-1.5 text-sm font-semibold text-white hover:bg-black/70 transition">
              Edit channel
            </a>
          ) : (
            <FollowUserButton
              targetId={profile.id}
              signedIn={signedIn}
              initialFollowing={isFollowing}
              initialNotifLevel={notifLevel}
              variant="solid"
            />
          )}
        </div>

        {/* Thin progress bar — bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 pointer-events-none z-10">
          <div className="h-full bg-teal/90 transition-none" style={{ width: `${pct}%` }} />
        </div>
      </>)}

      {/* ── Theatre hover overlay ── */}
      {isTheatre && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none
          bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-24
          opacity-0 group-hover:opacity-100 transition-opacity duration-200">

          {/* Video title + channel */}
          <Link href={`/watch/${video.id}`} onClick={e => e.stopPropagation()}
            className="block text-lg font-bold text-white drop-shadow line-clamp-1 hover:underline w-fit pointer-events-auto">
            {video.title}
          </Link>
          <div className="mt-1 flex items-center gap-2 pointer-events-auto">
            <Avatar name={displayName} src={profile.avatar_url} size={24} ring={true} />
            <span className="text-sm font-semibold text-foam/90">{displayName}</span>
          </div>

          {/* Seekbar + time */}
          <div className="mt-3 flex items-center gap-3 pointer-events-auto">
            <div className="relative h-1.5 flex-1 cursor-pointer" onClick={seekTo}>
              <div className="absolute inset-0 rounded-full bg-white/30" />
              <div className="absolute left-0 top-0 h-full rounded-full bg-white transition-none"
                style={{ width: `${pct}%` }} />
              <div className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-md"
                style={{ left: `calc(${pct}% - 7px)` }} />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-white/70">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>
          </div>

          {/* Buttons */}
          <div className="mt-2 flex items-center gap-2 pointer-events-auto">
            <CtrlBtn onClick={togglePlayPause} title={isPaused ? "Play" : "Pause"}>
              {isPaused ? <IcoPlay /> : <IcoPause />}
            </CtrlBtn>
            <CtrlBtn onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
              {muted ? <IcoMuted /> : <IcoUnmuted />}
            </CtrlBtn>
            <div className="flex-1" />
            <CtrlBtn onClick={doFullscreen} title="Fullscreen"><IcoFullscreen /></CtrlBtn>
          </div>
        </div>
      )}

      {/* Big play icon when paused */}
      {isTheatre && isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-black/50 text-white">
            <IcoPlayBig />
          </div>
        </div>
      )}

      {/* Top-right controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {!isTheatre && (<>
          <CtrlBtn onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
            {muted ? <IcoMuted /> : <IcoUnmuted />}
          </CtrlBtn>
          <CtrlBtn onClick={e => enterTheatre(e)} title="Theatre mode"><IcoTheatre /></CtrlBtn>
        </>)}
        {isTheatre && <CtrlBtn onClick={exitTheatre} title="Exit theatre"><IcoClose /></CtrlBtn>}
      </div>

    </div>
  );
}
