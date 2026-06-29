"use client";

import { useEffect, useRef, useState } from "react";
import PlayerContextMenu from "@/components/PlayerContextMenu";
import Avatar from "@/components/Avatar";
import Link from "next/link";
import { IcoFill, IcoAutoplay } from "@/components/watch/WatchIcons";

export type FeaturedVideo = {
  id: string; title: string; thumbnail: string | null;
  channelName: string; channelHandle: string; channelAvatar: string | null;
  isLive?: boolean;
};
type Props = { featuredVideo: FeaturedVideo | null; bannerUrl?: string | null; videos?: FeaturedVideo[] };

const SDK_URL = "https://embed.cloudflarestream.com/embed/sdk.latest.js";

function iframeSrc(id: string, poster?: string, muted = true, startTime = 0) {
  const p = poster ? `&poster=${encodeURIComponent(poster)}` : "";
  const m = muted ? "&muted=true" : "";
  const st = startTime > 2 ? `&startTime=${Math.floor(startTime)}` : "";
  return `https://iframe.cloudflarestream.com/${id}?autoplay=true${m}&controls=false&preload=auto${p}${st}`;
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
const IcoLightbulb = ({ on }: { on: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 5 11.9V17H7v-3.1A7 7 0 0 1 12 2z" />
    {on && <path d="M12 6v2M6.3 6.3l1.4 1.4M17.7 6.3l-1.4 1.4" stroke="currentColor" strokeWidth="2" />}
  </svg>
);

function CtrlBtn({ onClick, title, children, disabled, className = "" }: {
  onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode;
  disabled?: boolean; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition-all duration-200 hover:text-teal hover:[filter:drop-shadow(0_0_6px_rgba(45,212,180,0.85))] hover:scale-105 disabled:opacity-30 ${className}`}>
      {children}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashHero({ featuredVideo, bannerUrl, videos }: Props) {
  const [isTheatre, setIsTheatre]     = useState(false);
  const [muted, setMuted]             = useState(true);
  const [volume, setVolumeState]       = useState(1);
  const volumeRef = useRef(1);
  const mutedRef = useRef(true); // tracks muted across player re-init
  const autoplayRef = useRef(true); // tracks autoplay across player re-init
    const [isPaused, setIsPaused]       = useState(false);
  const [lightsOut, setLightsOut]      = useState(false);
  const [vidIdx, setVidIdx]            = useState(0);
  const [urlMuted, setUrlMuted]        = useState(true); // muted=true in iframe URL (needed for autoplay)
  const [fill, setFill]               = useState(true);  // fill/crop by default (ambient feel)
  const [autoplay, setAutoplay]       = useState(true);
  const [loop, setLoopState]           = useState(false);
  const [playbackRate, setRateState]   = useState(1);
  const [ctxPos, setCtxPos]            = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem("loonytube:fill") === "0") setFill(false);
      if (localStorage.getItem("loonytube:autoplay") === "0") { setAutoplay(false); autoplayRef.current = false; }
      const savedVol = localStorage.getItem("loonytube:volume");
      if (savedVol !== null) {
        const v = Math.max(0, Math.min(1, parseFloat(savedVol)));
        if (isFinite(v)) { setVolumeState(v); volumeRef.current = v; }
      }
      const savedLoop = localStorage.getItem("loonytube:loop");
      if (savedLoop === "1") setLoopState(true);
      const savedRate = localStorage.getItem("loonytube:rate");
      if (savedRate !== null) {
        const r = parseFloat(savedRate);
        if (isFinite(r) && r > 0) setRateState(r);
      }
    } catch { /* noop */ }
  }, []);
  // Sync lights-out to <html> so Nav can dim without z-index hacks
  useEffect(() => {
    if (lightsOut && isTheatre) document.documentElement.classList.add('lt-lights-out');
    else document.documentElement.classList.remove('lt-lights-out');
    return () => document.documentElement.classList.remove('lt-lights-out');
  }, [lightsOut, isTheatre]);

  function toggleFill(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !fill;
    setFill(next);
    try { localStorage.setItem("loonytube:fill", next ? "1" : "0"); } catch { /* noop */ }
  }
  function toggleAutoplay(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !autoplay;
    setAutoplay(next);
    autoplayRef.current = next;
    try { localStorage.setItem("loonytube:autoplay", next ? "1" : "0"); } catch { /* noop */ }
  }
  const playlist = videos && videos.length > 1 ? videos : featuredVideo ? [featuredVideo] : [];
  const currentVideo = playlist[vidIdx] ?? featuredVideo;
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const playerRef    = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedRef  = useRef(0);
  const resumeTimeRef  = useRef(0); // currentTime saved before iframe reload
  const [videoRatio, setVideoRatio]   = useState<number | null>(null);
  const [containerRatio, setContainerRatio] = useState(16 / 9);

  // Detect video aspect ratio from thumbnail
  useEffect(() => {
    const src = currentVideo?.thumbnail ?? null;
    if (!src) return;
    setVideoRatio(null);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight)
        setVideoRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = src;
  }, [currentVideo?.thumbnail]);

  // Track container dimensions for accurate fill scale
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      if (r.height > 0) setContainerRatio(r.width / r.height);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);
  const resumePointRef = useRef(0); // resume target loaded from localStorage

  useEffect(() => {
    playerRef.current = null; // reset when video changes
    lastSavedRef.current = 0;
    resumePointRef.current = 0;
    const vid = playlist[vidIdx]?.id ?? featuredVideo?.id ?? null;
    function initPlayer() {
  if (iframeRef.current && (window as any).Stream && !playerRef.current) {
    const p = (window as any).Stream(iframeRef.current);
    playerRef.current = p;

    // Restore mute state + loop + playback rate
    p.muted = mutedRef.current;
    try { const r = localStorage.getItem("loonytube:rate"); if (r) { const v = parseFloat(r); if (isFinite(v) && v > 0) p.playbackRate = v; } } catch { /* noop */ }
    try { if (localStorage.getItem("loonytube:loop") === "1") p.loop = true; } catch { /* noop */ }

    // ── Core event listeners ─────────────────────────────────────
    p.addEventListener("play", () => {
      setIsPaused(false);
      p.muted = mutedRef.current;
    });

    p.addEventListener("pause", () => setIsPaused(true));

    p.addEventListener("ended", () => {
      if (!autoplayRef.current) return;
      setVidIdx(i => (i + 1) % playlist.length);
    });

    p.addEventListener("timeupdate", () => {
      const t = p.currentTime ?? 0;
      const dur = p.duration ?? 0;
      setCurrentTime(t);
      if (dur > 0) setDuration(dur);

      const sec = Math.floor(t);
      const done = dur > 0 && sec / dur >= 0.92;
      if (vid && sec > 0 && sec >= lastSavedRef.current + 5) {
        lastSavedRef.current = sec;
        localStorage.setItem(`loonytube:resume:${vid}`, String(done ? 0 : sec));
      }
    });

    p.addEventListener("durationchange", () => {
      if (p.duration > 0) setDuration(p.duration);
    });

    p.addEventListener("seeked", () => {
      if (p.paused) setIsPaused(true);
    });

    // ── Resume logic (safer version) ─────────────────────────────
    p.addEventListener("loadedmetadata", () => {
      if (p.duration > 0) setDuration(p.duration);
      p.muted = mutedRef.current;

      if (vid) {
        const saved = localStorage.getItem(`loonytube:resume:${vid}`);
        if (saved) {
          const t = parseFloat(saved);
          resumePointRef.current = t > 2 ? t : 0;
          if (t > 2) {
            p.currentTime = t;
            setTimeout(() => {
              if (playerRef.current && Math.abs(playerRef.current.currentTime - t) > 1.5) {
                playerRef.current.currentTime = t;
              }
            }, 450);
          }
        }
      }
    });
  }
}
    if ((window as any).Stream) { initPlayer(); return; }
    let s = document.querySelector(`script[src="${SDK_URL}"]`) as HTMLScriptElement | null;
    if (!s) { s = document.createElement("script") as HTMLScriptElement; s.src = SDK_URL; document.head.appendChild(s); }
    s.addEventListener("load", initPlayer, { once: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vidIdx, urlMuted]);

  function applyMute(next: boolean) {
    setMuted(next);
    mutedRef.current = next;
    const p = playerRef.current;
    if (next) {
      // Muting via SDK always works.
      if (p) p.muted = true;
      return;
    }
    if (urlMuted) {
      // First-ever unmute: the iframe was started with muted=true in the URL,
      // so p.muted=false is silently ignored by the browser's autoplay policy.
      // Reload the iframe WITHOUT muted=true (passing startTime to resume position).
      // After this one reload, SDK mute/unmute works normally.
      const liveTime = playerRef.current?.currentTime ?? 0;
      resumeTimeRef.current = liveTime > 2 ? liveTime : resumePointRef.current;
      resumePointRef.current = resumeTimeRef.current; // keep in sync after remount
      playerRef.current = null; // let useEffect re-init the player
      setUrlMuted(false);        // triggers useEffect re-run + iframe remount
    } else {
      // iframe URL already lacks muted=true — SDK set works fine now.
      if (p) {
        p.muted = false;
        // Restore volume (in case it was 0 or needs applying after iframe reload)
        const v = volumeRef.current > 0 ? volumeRef.current : 0.7;
        p.volume = v;
        setVolumeState(v);
        volumeRef.current = v;
      }
    }
  }

  function setVolume(v: number) {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    const p = playerRef.current;
    if (p) p.volume = clamped;
    if (clamped === 0 && !muted) applyMute(true);
    else if (clamped > 0 && muted) applyMute(false);
    try { localStorage.setItem("loonytube:volume", String(clamped)); } catch { /* noop */ }
  }

  function toggleLoop(e?: React.MouseEvent) {
    e?.stopPropagation();
    const p = playerRef.current;
    const next = !loop;
    setLoopState(next);
    if (p) p.loop = next;
    try { localStorage.setItem("loonytube:loop", next ? "1" : "0"); } catch { /* noop */ }
  }

  function setPlaybackRate(r: number) {
    const p = playerRef.current;
    setRateState(r);
    if (p) p.playbackRate = r;
    try { localStorage.setItem("loonytube:rate", String(r)); } catch { /* noop */ }
  }

  function toggleMute(e: React.MouseEvent) { e.stopPropagation(); applyMute(!muted); }
  function togglePlayPause(e?: React.MouseEvent) {
    e?.stopPropagation();
    const p = playerRef.current;
    if (!p) return;

    if (isPaused) {
      p.play().catch(() => {});
      setIsPaused(false);
    } else {
      p.pause();
      setIsPaused(true);
    }
  }
  function goPrev(e: React.MouseEvent) {
    e.stopPropagation();
    if (currentTime > 3 && playerRef.current) {
      playerRef.current.currentTime = 0;
      setCurrentTime(0);
    } else {
      setVidIdx(i => Math.max(0, i - 1));
    }
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

  /* ── Empty state ── */
  if (!currentVideo) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "16/5", minHeight: 200 }}>
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

  const isPortrait = videoRatio !== null && videoRatio < 1;

  // Fill: which axis has bars? And how much to scale to remove them (theatre only)
  const fillDir: 'h' | 'v' | null = (() => {
    if (!videoRatio) return null;
    if (videoRatio < containerRatio - 0.05) return 'v';
    if (videoRatio > containerRatio + 0.05) return 'h';
    return null;
  })();
  const fillScale = (!fill || !isTheatre || isPortrait || !fillDir) ? 1
    : fillDir === 'v' ? containerRatio / videoRatio!
    : videoRatio! / containerRatio;

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const poster = currentVideo?.thumbnail ?? undefined;

  return (
    <>
      {/* Lights-out overlay — fixed, dims everything behind the theatre player */}
      {lightsOut && isTheatre && (
        <div
          className="fixed inset-0 z-[51] bg-black/85 transition-opacity duration-300"
          onClick={() => setLightsOut(false)}
        />
      )}
    <div ref={containerRef}
      className={[
        "group relative overflow-hidden rounded-2xl transition-all duration-300",
        isTheatre
          ? `bg-black cursor-default z-[52]${isPortrait ? " mx-auto" : " w-full"}`
          : "cursor-pointer w-full",
      ].join(" ")}
      style={
        isTheatre
          ? isPortrait
            ? { height: "85svh", aspectRatio: String(videoRatio ?? 0.5625) }
            : { height: "min(56.25vw, 82vh)", width: "100%" }
          : { aspectRatio: "16/5", minHeight: 200 }
      }
      onClick={isTheatre ? () => togglePlayPause() : () => enterTheatre()}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxPos({ x: e.clientX, y: e.clientY }); }}>

      {/* Blurred letterbox background - portrait videos in miniplayer banner */}
      {!isTheatre && isPortrait && poster && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="" aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover"
            style={{ filter: "blur(24px) brightness(0.32) saturate(1.4)" }} />
        </div>
      )}

      {/* iframe remounts when video changes via key */}
      <div key={`${currentVideo?.id}-${urlMuted}`} className="absolute inset-0 overflow-hidden">
        <iframe ref={iframeRef} src={iframeSrc(currentVideo?.id ?? "", poster, urlMuted, resumeTimeRef.current)}
          allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: isTheatre && fillScale !== 1
              ? `translate(-50%,-50%) scale(${fillScale})`
              : "translate(-50%,-50%)",
            width: isTheatre ? "100%" : "177.78vw",
            height: isTheatre ? "100%" : "56.25vw",
            minWidth: isTheatre ? undefined : "100%",
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
          {currentVideo?.isLive && (
            <span className="rounded px-2 py-1 text-[11px] font-bold bg-loonred text-white">LIVE</span>
          )}
        </div>
        <div className="absolute bottom-2 left-0 right-0 px-4">
          <Link href={`/watch/${currentVideo?.id ?? ""}`} onClick={e => e.stopPropagation()}
            className="block text-xl font-bold text-white drop-shadow line-clamp-1 hover:underline w-fit">
            {currentVideo?.title}
          </Link>
          <Link href={`/${currentVideo?.channelHandle ?? ""}`} onClick={e => e.stopPropagation()}
            className="mt-1 flex items-center gap-2 w-fit">
            <Avatar name={currentVideo?.channelName ?? ""} src={currentVideo?.channelAvatar ?? null} size={20} />
            <span className="text-sm font-semibold text-foam/90 hover:underline">{currentVideo?.channelName}</span>
          </Link>
        </div>
        {/* Thin progress bar — very bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 pointer-events-none z-10">
          <div className="h-full bg-teal/90 transition-none" style={{ width: `${pct}%` }} />
        </div>
      </>)}

      {/* ── Theatre hover overlay: title + playhead + controls ── */}
      {isTheatre && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none
          bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-24
          opacity-0 group-hover:opacity-100 transition-opacity duration-200">

          {/* Title + channel */}
          <Link href={`/watch/${currentVideo?.id ?? ""}`} onClick={e => e.stopPropagation()}
            className="block text-lg font-bold text-white drop-shadow line-clamp-1 hover:underline w-fit pointer-events-auto">
            {currentVideo?.title}
          </Link>
          <Link href={`/${currentVideo?.channelHandle ?? ""}`} onClick={e => e.stopPropagation()}
            className="mt-1 flex items-center gap-2 w-fit pointer-events-auto">
            <Avatar name={currentVideo?.channelName ?? ""} src={currentVideo?.channelAvatar ?? null} size={20} />
            <span className="text-sm font-semibold text-foam/90 hover:underline">{currentVideo?.channelName}</span>
          </Link>

          {/* Playhead row: seekbar + time */}
          <div className="mt-3 flex items-center gap-3 pointer-events-auto">
            {/* Seekable track */}
            <div className="relative h-1.5 flex-1 cursor-pointer" onClick={seekTo}>
              <div className="absolute inset-0 rounded-full bg-white/30" />
              <div className="absolute left-0 top-0 h-full rounded-full bg-white transition-none"
                style={{ width: `${pct}%` }} />
              {/* Scrub thumb */}
              <div className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-md"
                style={{ left: `calc(${pct}% - 7px)` }} />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-white/70">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>
          </div>

          {/* Buttons row */}
          <div className="mt-2 flex items-center gap-2 pointer-events-auto">
            {playlist.length > 1 && (
              <CtrlBtn onClick={goPrev}
                title={currentTime > 3 ? "Restart" : "Previous"} disabled={vidIdx === 0 && currentTime <= 3}
                className={vidIdx === 0 && currentTime <= 3 ? "opacity-30 cursor-not-allowed" : ""}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 20 9 12l10-8v16zM5 19V5"/></svg>
              </CtrlBtn>
            )}
            <CtrlBtn onClick={togglePlayPause} title={isPaused ? "Play" : "Pause"}>
              {isPaused ? <IcoPlay /> : <IcoPause />}
            </CtrlBtn>
            {playlist.length > 1 && (
              <CtrlBtn onClick={e => { e.stopPropagation(); setVidIdx(i => Math.min(playlist.length - 1, i + 1)); }}
                title="Next" disabled={vidIdx === playlist.length - 1}
                className={vidIdx === playlist.length - 1 ? "opacity-30 cursor-not-allowed" : ""}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4l10 8-10 8V4zM19 5v14"/></svg>
              </CtrlBtn>
            )}
            <div className="group/vol flex items-center">
              <CtrlBtn onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
                {(muted || volume === 0) ? <IcoMuted /> : <IcoUnmuted />}
              </CtrlBtn>
              <div className="w-0 overflow-hidden transition-all duration-200 group-hover/vol:w-20">
                <input
                  type="range" min={0} max={1} step={0.02}
                  value={muted ? 0 : volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                  onClick={e => e.stopPropagation()}
                  className="w-20 cursor-pointer accent-teal"
                  aria-label="Volume"
                />
              </div>
            </div>
            <div className="flex-1" />
            <CtrlBtn onClick={toggleAutoplay} title={autoplay ? "Autoplay on" : "Autoplay off"}>
              <IcoAutoplay on={autoplay} />
            </CtrlBtn>
            {!isPortrait && (
              <CtrlBtn onClick={toggleFill} title={fill ? "Letterbox" : "Fill"}>
                <IcoFill on={fill} dir={fillDir} />
              </CtrlBtn>
            )}
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
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {!isTheatre && (<>
          <div className="group/vol2 flex items-center gap-0">
            <CtrlBtn onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
              {(muted || volume === 0) ? <IcoMuted /> : <IcoUnmuted />}
            </CtrlBtn>
            <div className="w-0 overflow-hidden transition-all duration-200 group-hover/vol2:w-20">
              <input
                type="range" min={0} max={1} step={0.02}
                value={muted ? 0 : volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                onClick={e => e.stopPropagation()}
                className="w-20 cursor-pointer accent-teal"
                aria-label="Volume"
              />
            </div>
          </div>
          <CtrlBtn onClick={e => enterTheatre(e)} title="Theatre mode"><IcoTheatre /></CtrlBtn>
        </>)}
        {isTheatre && (
          <div className={`flex items-center gap-2 transition-opacity duration-200 ${lightsOut ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            <CtrlBtn
              onClick={e => { e.stopPropagation(); setLightsOut(v => !v); }}
              title={lightsOut ? "Lights on" : "Lights off"}
            >
              <IcoLightbulb on={lightsOut} />
            </CtrlBtn>
            <CtrlBtn onClick={exitTheatre} title="Exit theatre"><IcoClose /></CtrlBtn>
          </div>
        )}
      </div>

    </div>

    {ctxPos && (
      <PlayerContextMenu
        x={ctxPos.x}
        y={ctxPos.y}
        onClose={() => setCtxPos(null)}
        loop={loop}
        onToggleLoop={toggleLoop}
        playbackRate={playbackRate}
        onSetRate={setPlaybackRate}
        currentTime={currentTime}
        videoId={currentVideo?.id ?? ""}
      />
    )}
    </>
  );
}
