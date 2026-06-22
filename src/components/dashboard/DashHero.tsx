"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";

export type FeaturedVideo = {
  id: string; title: string; thumbnail: string | null;
  channelName: string; channelHandle: string; channelAvatar: string | null;
  isLive?: boolean;
};
type Props = { featuredVideo: FeaturedVideo | null; bannerUrl?: string | null };

const SDK_URL = "https://embed.cloudflarestream.com/embed/sdk.latest.js";

function iframeSrc(id: string, poster?: string) {
  const p = poster ? `&poster=${encodeURIComponent(poster)}` : "";
  return `https://iframe.cloudflarestream.com/${id}?autoplay=true&muted=true&loop=true&controls=false&preload=auto${p}`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);
const IcoPause = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="3" width="4" height="18" rx="1" /><rect x="15" y="3" width="4" height="18" rx="1" />
  </svg>
);
const IcoPlayBig = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
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
      className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition">
      {children}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashHero({ featuredVideo, bannerUrl }: Props) {
  const [isTheatre, setIsTheatre] = useState(false);
  const [muted, setMuted]         = useState(true);
  const [isPaused, setIsPaused]   = useState(false);
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const playerRef    = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function initPlayer() {
      if (iframeRef.current && (window as any).Stream && !playerRef.current) {
        const p = (window as any).Stream(iframeRef.current);
        playerRef.current = p;
        p.addEventListener("play",  () => setIsPaused(false));
        p.addEventListener("pause", () => setIsPaused(true));
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
  function enterTheatre(e?: React.MouseEvent) { e?.stopPropagation(); setIsTheatre(true);  applyMute(false); }
  function exitTheatre(e: React.MouseEvent)   { e.stopPropagation();  setIsTheatre(false); applyMute(true);  }
  function doFullscreen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }

  /* ── Empty state ── */
  if (!featuredVideo) {
    return (
      <div className="relative w-full overflow-hidden rounded-b-2xl"
        style={{ aspectRatio: "16/5", minHeight: 200 }}>
        {bannerUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          : <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a2c] via-[#0d2b3e] to-[#0a1622]" />}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="text-lg font-semibold text-foam/80">Nothing queued up yet</p>
          <p className="text-sm text-mist">Follow channels or like videos to fill this space</p>
        </div>
      </div>
    );
  }

  const poster = featuredVideo.thumbnail ?? undefined;

  return (
    <div ref={containerRef}
      className={`group relative w-full overflow-hidden rounded-b-2xl transition-all duration-300 ${isTheatre ? "bg-black cursor-default" : "cursor-pointer"}`}
      style={isTheatre ? { aspectRatio: "16/9", maxHeight: "80vh" } : { aspectRatio: "16/5", minHeight: 200 }}
      onClick={isTheatre ? () => togglePlayPause() : () => enterTheatre()}>

      {/* Single iframe — src never changes, video never restarts */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe ref={iframeRef}
          src={iframeSrc(featuredVideo.id, poster)}
          allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: "100%",
            height:   isTheatre ? "100%" : "56.25vw",
            minWidth: isTheatre ? undefined : "177.78vh",
            minHeight: isTheatre ? undefined : "100%",
            border: "none", pointerEvents: "none",
          }} />
      </div>

      {/* ── Ambient overlay ── */}
      {!isTheatre && (<>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none" />
        <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
          <span className="rounded-full bg-teal/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
            Now Playing
          </span>
          {featuredVideo.isLive && (
            <span className="rounded px-2 py-1 text-[11px] font-bold bg-loonred text-white">LIVE</span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
          <p className="text-xl font-bold text-white drop-shadow line-clamp-1">{featuredVideo.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <Avatar name={featuredVideo.channelName} src={featuredVideo.channelAvatar} size={20} />
            <span className="text-sm font-semibold text-foam/90">{featuredVideo.channelName}</span>
          </div>
        </div>
      </>)}

      {/* ── Theatre bottom overlay: hover-reveal title + controls ── */}
      {isTheatre && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none
          bg-gradient-to-t from-black/80 via-black/30 to-transparent
          px-4 pb-4 pt-20
          opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-lg font-bold text-white drop-shadow line-clamp-1">{featuredVideo.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <Avatar name={featuredVideo.channelName} src={featuredVideo.channelAvatar} size={20} />
            <span className="text-sm font-semibold text-foam/90">{featuredVideo.channelName}</span>
          </div>
          {/* Control bar */}
          <div className="mt-3 flex items-center gap-2 pointer-events-auto">
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

      {/* ── Theatre: big play icon when paused ── */}
      {isTheatre && isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-black/50 text-white">
            <IcoPlayBig />
          </div>
        </div>
      )}

      {/* ── Controls: top-right ── */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {!isTheatre && (<>
          <CtrlBtn onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
            {muted ? <IcoMuted /> : <IcoUnmuted />}
          </CtrlBtn>
          <CtrlBtn onClick={e => enterTheatre(e)} title="Theatre mode"><IcoTheatre /></CtrlBtn>
        </>)}
        {isTheatre && (
          <CtrlBtn onClick={exitTheatre} title="Exit theatre"><IcoClose /></CtrlBtn>
        )}
      </div>

    </div>
  );
}
