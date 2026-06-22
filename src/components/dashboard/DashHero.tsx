"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Link from "next/link";

export type FeaturedVideo = {
  id: string;
  title: string;
  thumbnail: string | null;
  channelName: string;
  channelHandle: string;
  channelAvatar: string | null;
  isLive?: boolean;
};

type Props = { featuredVideo: FeaturedVideo | null; bannerUrl?: string | null };
type ViewState = "ambient" | "theatre";

/** Minimal shape of the Cloudflare Stream SDK player */
type CFPlayer = {
  muted: boolean;
  addEventListener: (event: string, cb: () => void) => void;
};
declare global { interface Window { Stream?: (el: HTMLIFrameElement) => CFPlayer } }

function cfSrc(id: string, poster?: string) {
  const p = poster ? `&poster=${encodeURIComponent(poster)}` : "";
  // Always muted=true + controls=false in URL; we control both via SDK + our own UI
  return `https://iframe.cloudflarestream.com/${id}?autoplay=true&muted=true&loop=true&controls=false&preload=auto${p}`;
}

// ── Icon helpers ──────────────────────────────────────────────────────────────
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
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
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
  onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title}
      className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition">
      {children}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashHero({ featuredVideo, bannerUrl }: Props) {
  const [view, setView]   = useState<ViewState>("ambient");
  const [muted, setMuted] = useState(true);
  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const playerRef   = useRef<CFPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Cloudflare Stream SDK once per video; initialise playerRef on ready
  useEffect(() => {
    if (!featuredVideo) return;
    function initPlayer() {
      if (!iframeRef.current || !window.Stream) return;
      const p = window.Stream(iframeRef.current);
      p.addEventListener("ready", () => { playerRef.current = p; });
    }
    if (window.Stream) { initPlayer(); return; }
    if (document.getElementById("cf-stream-sdk")) {
      document.getElementById("cf-stream-sdk")!.addEventListener("load", initPlayer);
      return;
    }
    const s = Object.assign(document.createElement("script"), {
      id: "cf-stream-sdk",
      src: "https://embed.cloudflarestream.com/embed/sdk.latest.js",
    });
    s.onload = initPlayer;
    document.head.appendChild(s);
  }, [featuredVideo?.id]);

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !muted;
    if (playerRef.current) playerRef.current.muted = next;
    setMuted(next);
  }
  function toggleTheatre(e: React.MouseEvent) {
    e.stopPropagation();
    setView(v => v === "ambient" ? "theatre" : "ambient");
  }
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
          ? <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> // eslint-disable-line
          : <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a2c] via-[#0d2b3e] to-[#0a1622]" />}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="text-lg font-semibold text-foam/80">Nothing queued up yet</p>
          <p className="text-sm text-mist">Follow channels or like videos to fill this space</p>
        </div>
      </div>
    );
  }

  const isTheatre = view === "theatre";
  const poster = featuredVideo.thumbnail ?? undefined;

  return (
    <div ref={containerRef}
      className={`relative w-full overflow-hidden rounded-b-2xl transition-all duration-300 ${isTheatre ? "bg-black" : ""}`}
      style={isTheatre ? { aspectRatio: "16/9", maxHeight: "80vh" } : { aspectRatio: "16/5", minHeight: 200 }}>

      {/* Single iframe — never remounts, video plays through mode changes */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe ref={iframeRef} src={cfSrc(featuredVideo.id, poster)}
          allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: "100%",
            height:    isTheatre ? "100%" : "56.25vw",
            minWidth:  isTheatre ? undefined : "177.78vh",
            minHeight: isTheatre ? undefined : "100%",
            border: "none",
            pointerEvents: isTheatre ? "auto" : "none",
          }} />
      </div>

      {/* Ambient overlay + info */}
      {!isTheatre && (<>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none" />
        <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2">
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

      {/* Theatre: open-full link */}
      {isTheatre && (
        <div className="absolute bottom-3 left-4 z-10 pointer-events-none">
          <Link href={`/watch/${featuredVideo.id}`}
            className="pointer-events-auto text-xs text-white/60 hover:text-white transition underline underline-offset-2"
            onClick={e => e.stopPropagation()}>
            Open full page &rsaquo;
          </Link>
        </div>
      )}

      {/* ── Always-visible controls: top-right ── */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <CtrlBtn onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
          {muted ? <IcoMuted /> : <IcoUnmuted />}
        </CtrlBtn>
        {isTheatre ? (<>
          <CtrlBtn onClick={doFullscreen} title="Fullscreen"><IcoFullscreen /></CtrlBtn>
          <CtrlBtn onClick={toggleTheatre} title="Exit theatre"><IcoClose /></CtrlBtn>
        </>) : (
          <CtrlBtn onClick={toggleTheatre} title="Theatre mode"><IcoTheatre /></CtrlBtn>
        )}
      </div>

    </div>
  );
}
