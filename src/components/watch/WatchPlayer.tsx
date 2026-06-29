"use client";
import { useEffect, useRef, useState } from "react";
import { useWatchPlayer, type PlayerMode } from "@/hooks/useWatchPlayer";
import {
  IcoPlay, IcoPause, IcoMuted, IcoUnmuted,
  IcoTheatre, IcoExitTheatre, IcoFullscreen, IcoLightsOut,
  IcoPrev, IcoNext, IcoAutoplay, IcoFill,
} from "./WatchIcons";

function fmt(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function Btn({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-all duration-200 hover:text-teal hover:[filter:drop-shadow(0_0_6px_rgba(45,212,180,0.85))] hover:scale-105 disabled:opacity-30 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

export default function WatchPlayer({
  uid,
  token,
  poster,
  mode,
  onModeChange,
  onNext,
  onPrev,
}: {
  uid: string;
  token?: string | null;
  poster?: string;
  mode: PlayerMode;
  onModeChange: (m: PlayerMode) => void;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  const [autoplay, setAutoplay] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  // Detected from the poster thumbnail; null = unknown (treat as landscape)
  const [videoRatio, setVideoRatio] = useState<number | null>(null);

  const autoplayRef = useRef(true);
  autoplayRef.current = autoplay;
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const lastPrevPressRef = useRef(0);

  const p = useWatchPlayer(uid, token, () => {
    if (autoplayRef.current && onNextRef.current) setCountdown(5);
  });

  const isTheatre = mode === "theatre";
  const isPortrait = videoRatio !== null && videoRatio < 1;

  // Detect aspect ratio from the poster thumbnail
  useEffect(() => {
    if (!poster) return;
    const img = new Image();
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight;
      if (r > 0 && isFinite(r)) setVideoRatio(r);
    };
    img.src = poster;
  }, [poster]);

  // Load autoplay pref after mount
  useEffect(() => {
    try {
      if (localStorage.getItem("loonytube:autoplay") === "0") setAutoplay(false);
    } catch { /* noop */ }
  }, []);

  const [fill, setFill] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("loonytube:fill") === "1") setFill(true);
    } catch { /* noop */ }
  }, []);

  function toggleFill() {
    const next = !fill;
    setFill(next);
    try { localStorage.setItem("loonytube:fill", next ? "1" : "0"); } catch { /* noop */ }
  }

  const [containerRatioActual, setContainerRatioActual] = useState(16 / 9);
  useEffect(() => {
    if (!p.containerRef.current) return;
    const obs = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      if (r.height > 0) setContainerRatioActual(r.width / r.height);
    });
    obs.observe(p.containerRef.current);
    return () => obs.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick countdown → fire onNext when it hits 0
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { onNextRef.current?.(); setCountdown(null); return; }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // At start (<2s) or double-tap within 2s → go to previous; otherwise restart
  function handlePrev() {
    const now = Date.now();
    if (p.currentTime < 2 || now - lastPrevPressRef.current < 2000) {
      lastPrevPressRef.current = 0;
      onPrev?.();
    } else {
      lastPrevPressRef.current = now;
      p.seekToTime(0);
    }
  }

  function toggleAutoplay() {
    const next = !autoplay;
    setAutoplay(next);
    if (!next) setCountdown(null);
    try { localStorage.setItem("loonytube:autoplay", next ? "1" : "0"); } catch { /* noop */ }
  }

  // ── Container sizing ────────────────────────────────────────────────────────
  // Portrait videos: auto-width + height-capped so they never overflow the viewport.
  // Landscape videos: full-width with a fixed aspect ratio (current behaviour).
  const lightsOutZ = p.lightsOut ? { zIndex: 52 as const } : {};

  let containerStyle: React.CSSProperties;
  if (isTheatre) {
    containerStyle = isPortrait
      ? { aspectRatio: String(videoRatio), height: "85svh", ...lightsOutZ }
      : { height: "min(56.25vw, 75vh)", ...lightsOutZ };
  } else {
    containerStyle = isPortrait
      ? { aspectRatio: String(videoRatio), height: "calc(100svh - 80px)", borderRadius: "0.75rem" }
      : { aspectRatio: "16/9", maxHeight: "calc(100svh - 120px)", borderRadius: "0.75rem" };
  }

  // Portrait: shrink to content width and center; landscape: stretch full width
  const containerClass = [
    "group relative overflow-hidden bg-black",
    isPortrait ? "mx-auto w-auto" : "w-full",
  ].join(" ");

  // Which axis has bars? Drives icon appearance and fill scale.
  const fillDir: 'h' | 'v' | null = (() => {
    if (!videoRatio) return null;
    if (videoRatio < containerRatioActual - 0.05) return 'v';
    if (videoRatio > containerRatioActual + 0.05) return 'h';
    return null;
  })();

  // CSS scale to zoom iframe so Cloudflare's bars are pushed out of the container.
  const fillScale = (!fill || isPortrait || !fillDir) ? 1
    : fillDir === 'v' ? containerRatioActual / (videoRatio ?? containerRatioActual)
    : (videoRatio ?? containerRatioActual) / containerRatioActual;

  const iframeStyle: React.CSSProperties = {
    position: "absolute", top: "50%", left: "50%",
    transform: fillScale !== 1
      ? `translate(-50%,-50%) scale(${fillScale})`
      : "translate(-50%,-50%)",
    width: "100%", height: "100%",
    border: "none", pointerEvents: "none",
  };

  const src = p.iframeSrc + (poster ? `&poster=${encodeURIComponent(poster)}` : "");

  return (
    <>
      {/* Lights-out backdrop — z-51, player lifts to z-52 above it */}
      {p.lightsOut && isTheatre && (
        <div
          className="fixed inset-0 z-[51] bg-black/85"
          onClick={() => p.setLightsOut(false)}
        />
      )}

      {/* Single container — never unmounts iframe on mode switch */}
      <div
        ref={p.containerRef}
        className={containerClass}
        style={containerStyle}
        onMouseMove={p.showControls}
      >
        {/* Cloudflare Stream iframe */}
        <iframe
          ref={p.iframeRef}
          src={src}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={iframeStyle}
        />

        {/* Click-to-pause: transparent layer above iframe, below controls */}
        <div className="absolute inset-0 cursor-pointer" onClick={p.togglePlay} />

        {/* Big centered play button when paused */}
        {p.isPaused && countdown === null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              type="button"
              onClick={p.togglePlay}
              className="pointer-events-auto grid h-20 w-20 place-items-center rounded-full bg-black/50 text-white transition hover:bg-black/70 hover:scale-105"
            >
              <IcoPlay size={36} />
            </button>
          </div>
        )}

        {/* Autoplay countdown overlay */}
        {countdown !== null && onNext && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl bg-black/80 px-8 py-6 text-center shadow-xl">
              <p className="text-sm text-white/70">Up next</p>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-teal text-3xl font-bold text-white">
                {countdown}
              </div>
              <button
                type="button"
                onClick={() => setCountdown(null)}
                className="mt-1 rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/70 transition hover:border-white/50 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-3 pt-14 transition-opacity duration-200 ${
            p.controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Seekbar */}
          <div
            className="group/seek relative mb-2 h-1.5 w-full cursor-pointer"
            onClick={p.seekTo}
          >
            <div className="absolute inset-0 rounded-full bg-white/25" />
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-teal"
              style={{ width: `${p.pct}%` }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-md opacity-0 transition-opacity group-hover/seek:opacity-100"
              style={{ left: `calc(${p.pct}% - 7px)` }}
            />
          </div>

          {/* Button row */}
          <div className="flex items-center gap-1">
            <Btn onClick={handlePrev} title="Previous">
              <IcoPrev />
            </Btn>
            <Btn onClick={p.togglePlay} title={p.isPaused ? "Play" : "Pause"}>
              {p.isPaused ? <IcoPlay /> : <IcoPause />}
            </Btn>
            <Btn onClick={onNext ?? (() => {})} title="Next video" disabled={!onNext}>
              <IcoNext />
            </Btn>
            <Btn onClick={p.toggleMute} title={p.muted ? "Unmute" : "Mute"}>
              {p.muted ? <IcoMuted /> : <IcoUnmuted />}
            </Btn>
            <span className="ml-1 shrink-0 text-xs tabular-nums text-white/60">
              {fmt(p.currentTime)} / {fmt(p.duration)}
            </span>

            <div className="flex-1" />

            <Btn onClick={toggleAutoplay} title={autoplay ? "Autoplay on" : "Autoplay off"}>
              <IcoAutoplay on={autoplay} />
            </Btn>
            {!isPortrait && (
              <Btn onClick={toggleFill} title={fill ? "Letterbox" : "Fill"}>
                <IcoFill on={fill} dir={fillDir} />
              </Btn>
            )}
            {isTheatre ? (
              <>
                <Btn
                  onClick={() => p.setLightsOut((v) => !v)}
                  title={p.lightsOut ? "Lights on" : "Lights out"}
                >
                  <IcoLightsOut on={p.lightsOut} />
                </Btn>
                <Btn onClick={() => onModeChange("page")} title="Exit theatre">
                  <IcoExitTheatre />
                </Btn>
              </>
            ) : (
              <Btn onClick={() => onModeChange("theatre")} title="Theatre mode">
                <IcoTheatre />
              </Btn>
            )}
            <Btn onClick={p.doFullscreen} title="Fullscreen">
              <IcoFullscreen />
            </Btn>
          </div>
        </div>
      </div>
    </>
  );
}
