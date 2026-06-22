"use client";

import { useRef, useState } from "react";
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

type Props = {
  featuredVideo: FeaturedVideo | null;
  bannerUrl?: string | null;
};

type ViewState = "ambient" | "theatre";

function cfSrc(id: string, state: ViewState, poster?: string) {
  const base = `https://iframe.cloudflarestream.com/${id}`;
  const p = poster ? `&poster=${encodeURIComponent(poster)}` : "";
  if (state === "ambient") {
    return `${base}?autoplay=true&muted=true&loop=true&controls=false&preload=auto${p}`;
  }
  // theatre: unmuted, controls on, no loop (user is watching intentionally)
  return `${base}?autoplay=true&muted=false&controls=true&preload=auto${p}`;
}

export default function DashHero({ featuredVideo, bannerUrl }: Props) {
  const [view, setView] = useState<ViewState>("ambient");
  const containerRef = useRef<HTMLDivElement>(null);

  function enterTheatre() { setView("theatre"); }
  function exitTheatre()  { setView("ambient"); }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  /* ── Empty state ── */
  if (!featuredVideo) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-b-2xl"
        style={{ aspectRatio: "16/5", minHeight: 200 }}
      >
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a2c] via-[#0d2b3e] to-[#0a1622]" />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="text-lg font-semibold text-foam/80">Nothing queued up yet</p>
          <p className="text-sm text-mist">Follow channels or like videos to fill this space</p>
        </div>
      </div>
    );
  }

  const isTheatre = view === "theatre";
  const poster    = featuredVideo.thumbnail ?? undefined;

  return (
    <div
      ref={containerRef}
      className={[
        "relative w-full overflow-hidden rounded-b-2xl transition-all duration-300",
        isTheatre ? "bg-black" : "",
      ].join(" ")}
      style={
        isTheatre
          ? { aspectRatio: "16/9", maxHeight: "80vh" }
          : { aspectRatio: "16/5", minHeight: 200, cursor: "pointer" }
      }
      onClick={!isTheatre ? enterTheatre : undefined}
    >
      {/* ── iframe ── */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          key={view}               /* remount on state change to swap muted/controls */
          src={cfSrc(featuredVideo.id, view, poster)}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: isTheatre ? "100%" : "100%",
            height: isTheatre ? "100%" : "56.25vw",
            minWidth:  isTheatre ? undefined : "177.78vh",
            minHeight: isTheatre ? undefined : "100%",
            border: "none",
            pointerEvents: isTheatre ? "auto" : "none",
          }}
        />
      </div>

      {/* ── Ambient overlay (hidden in theatre) ── */}
      {!isTheatre && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none" />

          {/* NOW PLAYING pill */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <span className="rounded-full bg-teal/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
              Now Playing
            </span>
            {featuredVideo.isLive && (
              <span className="ml-2 rounded px-2 py-1 text-[11px] font-bold bg-loonred text-white">LIVE</span>
            )}
          </div>

          {/* Title + channel */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
            <p className="text-xl font-bold text-white drop-shadow line-clamp-1">{featuredVideo.title}</p>
            <div className="mt-1 flex items-center gap-2">
              <Avatar name={featuredVideo.channelName} src={featuredVideo.channelAvatar} size={20} />
              <span className="text-sm font-semibold text-foam/90">{featuredVideo.channelName}</span>
            </div>
          </div>
        </>
      )}

      {/* ── Theatre controls ── */}
      {isTheatre && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {/* Fullscreen */}
          <button onClick={toggleFullscreen} title="Fullscreen"
            className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </button>
          {/* Close theatre */}
          <button onClick={exitTheatre} title="Exit theatre"
            className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Theatre: link to full watch page */}
      {isTheatre && (
        <div className="absolute bottom-3 left-4 pointer-events-none">
          <Link href={`/watch/${featuredVideo.id}`} onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto text-xs text-white/60 hover:text-white transition underline underline-offset-2">
            Open full page &rsaquo;
          </Link>
        </div>
      )}
    </div>
  );
}
