"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import PlayerContextMenu from "@/components/PlayerContextMenu";
import PlayerOSD,        { type OSDMessage }    from "./PlayerOSD";
import PlayerSpeedMenu                           from "./PlayerSpeedMenu";
import PlayerQualityMenu                         from "./PlayerQualityMenu";
import { useWatchPlayer, type PlayerMode }        from "@/hooks/useWatchPlayer";
import { useKeyboardShortcuts }                  from "@/hooks/useKeyboardShortcuts";
import { parseChapters, chapterAt }              from "@/utils/parseChapters";
import {
  IcoPlay, IcoPause, IcoMuted, IcoUnmuted,
  IcoTheatre, IcoExitTheatre, IcoFullscreen, IcoLightsOut,
  IcoPrev, IcoNext, IcoAutoplay, IcoFill,
  IcoMini, IcoExpand,
} from "./WatchIcons";

function fmt(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function Btn({
  onClick, title, disabled, children, btnRef,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
  btnRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={btnRef as React.RefObject<HTMLButtonElement>}
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
  uid, token, poster, description, mode, onModeChange, onNext, onPrev, onChannelUp, onChannelDown,
}: {
  uid: string;
  token?: string | null;
  poster?: string;
  description?: string | null;
  mode: PlayerMode;
  onModeChange: (m: PlayerMode) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onChannelUp?: () => void;
  onChannelDown?: () => void;
}) {
  const [autoplay, setAutoplay]   = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [videoRatio, setVideoRatio] = useState<number | null>(null);
  const [fill, setFill]           = useState(false);
  const [containerRatioActual, setContainerRatioActual] = useState(16 / 9);

  // Menus
  const [ctxPos,         setCtxPos]         = useState<{ x: number; y: number } | null>(null);
  const [speedAnchor,    setSpeedAnchor]    = useState<DOMRect | null>(null);
  const [qualityAnchor,  setQualityAnchor]  = useState<DOMRect | null>(null);
  const speedBtnRef   = useRef<HTMLButtonElement | null>(null);
  const qualityBtnRef = useRef<HTMLButtonElement | null>(null);

  // OSD
  const osdIdRef = useRef(0);
  const [osdMsg, setOsdMsg] = useState<OSDMessage | null>(null);
  function triggerOSD(text: string) {
    setOsdMsg({ text, id: ++osdIdRef.current });
  }

  const autoplayRef   = useRef(true);
  autoplayRef.current = autoplay;
  const onNextRef     = useRef(onNext);
  onNextRef.current   = onNext;
  const lastPrevRef   = useRef(0);

  const p = useWatchPlayer(uid, token, () => {
    if (autoplayRef.current && onNextRef.current) setCountdown(5);
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled:      mode !== "mini",
    isPaused:     p.isPaused,
    currentTime:  p.currentTime,
    duration:     p.duration,
    muted:        p.muted,
    playbackRate: p.playbackRate,
    mode,
    onTogglePlay: p.togglePlay,
    onSeekTo:     p.seekToTime,
    onToggleMute: p.toggleMute,
    onSetRate:    p.setPlaybackRate,
    onFullscreen: p.doFullscreen,
    onModeChange,
    onOSD:        triggerOSD,
    onPrev,
    onNext,
    onChannelUp,
    onChannelDown,
  });

  const isTheatre = mode === "theatre";
  const isMini    = mode === "mini";
  const isPortrait = videoRatio !== null && videoRatio < 1;

  // Chapters
  const chapters     = useMemo(() => parseChapters(description ?? null), [description]);
  const activeChapter = chapterAt(chapters, p.currentTime);

  // Detect aspect ratio from poster
  useEffect(() => {
    if (!poster) return;
    const img = new Image();
    img.onload = () => {
      const r = img.naturalWidth / img.naturalHeight;
      if (r > 0 && isFinite(r)) setVideoRatio(r);
    };
    img.src = poster;
  }, [poster]);

  // Restore prefs
  useEffect(() => {
    try {
      if (localStorage.getItem("loonytube:autoplay") === "0") setAutoplay(false);
      if (localStorage.getItem("loonytube:fill")     === "1") setFill(true);
    } catch { /* noop */ }
  }, []);

  // Track container aspect ratio for fill
  useEffect(() => {
    if (!p.containerRef.current) return;
    const obs = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      if (r.height > 0) setContainerRatioActual(r.width / r.height);
    });
    obs.observe(p.containerRef.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown → autoplay next
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { onNextRef.current?.(); setCountdown(null); return; }
    const t = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function toggleFill() {
    const next = !fill;
    setFill(next);
    try { localStorage.setItem("loonytube:fill", next ? "1" : "0"); } catch { /* noop */ }
  }

  function toggleAutoplay() {
    const next = !autoplay;
    setAutoplay(next);
    if (!next) setCountdown(null);
    try { localStorage.setItem("loonytube:autoplay", next ? "1" : "0"); } catch { /* noop */ }
  }

  function handlePrev() {
    const now = Date.now();
    if (p.currentTime < 2 || now - lastPrevRef.current < 2000) {
      lastPrevRef.current = 0;
      onPrev?.();
    } else {
      lastPrevRef.current = now;
      p.seekToTime(0);
    }
  }

  // ── Sizing ──────────────────────────────────────────────────────────────────
  const lightsOutZ = p.lightsOut ? { zIndex: 52 as const } : {};

  let containerStyle: React.CSSProperties;
  if (isMini) {
    containerStyle = {
      position:     "fixed",
      bottom:       16,
      right:        16,
      width:        288,
      height:       162,
      zIndex:       190,
      borderRadius: 12,
      boxShadow:    "0 20px 60px rgba(0,0,0,0.85)",
    };
  } else if (isTheatre) {
    containerStyle = isPortrait
      ? { aspectRatio: String(videoRatio), height: "85svh", ...lightsOutZ }
      : { height: "min(56.25vw, calc(100svh - 57px))", ...lightsOutZ };
  } else {
    containerStyle = isPortrait
      ? { aspectRatio: String(videoRatio), height: "calc(100svh - 80px)", borderRadius: "0.75rem" }
      : { aspectRatio: "16/9", maxHeight: "calc(100svh - 120px)", borderRadius: "0.75rem" };
  }

  const containerClass = [
    "group relative overflow-hidden bg-black",
    isMini   ? "ring-1 ring-white/15" : "",
    isPortrait && !isMini ? "mx-auto w-auto" : !isMini ? "w-full" : "",
  ].filter(Boolean).join(" ");

  // Fill scale (unused in mini / portrait)
  const fillDir: "h" | "v" | null = (() => {
    if (!videoRatio || isMini || isPortrait) return null;
    if (videoRatio < containerRatioActual - 0.05) return "v";
    if (videoRatio > containerRatioActual + 0.05) return "h";
    return null;
  })();
  const fillScale = (!fill || isPortrait || !fillDir) ? 1
    : fillDir === "v" ? containerRatioActual / (videoRatio ?? containerRatioActual)
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

  // ── Mini controls ────────────────────────────────────────────────────────────
  const miniControls = (
    <div
      className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-200 ${p.controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      onMouseMove={p.showControls}
      onMouseLeave={p.hideControls}
    >
      {/* thin seekbar at very bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 cursor-pointer" onClick={p.seekTo}>
        <div className="h-full bg-teal" style={{ width: `${p.pct}%` }} />
      </div>
      {/* button row */}
      <div className="flex items-center gap-1 px-1.5 pb-2">
        <Btn onClick={p.togglePlay} title={p.isPaused ? "Play" : "Pause"}>
          {p.isPaused ? <IcoPlay /> : <IcoPause />}
        </Btn>
        <span className="text-[10px] tabular-nums text-white/50">{fmt(p.currentTime)}</span>
        <div className="flex-1" />
        <Btn onClick={() => onModeChange("page")} title="Expand player">
          <IcoExpand />
        </Btn>
      </div>
    </div>
  );

  // ── Full controls ────────────────────────────────────────────────────────────
  const fullControls = (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-3 pt-14 transition-opacity duration-200 ${p.controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      {/* Chapter name + time */}
      <div className="mb-1 flex items-center gap-2">
        {activeChapter && (
          <span className="truncate text-[11px] text-white/55 max-w-[55%]">{activeChapter.title}</span>
        )}
      </div>

      {/* Seekbar */}
      <div className="group/seek relative mb-2 h-1.5 w-full cursor-pointer" onClick={p.seekTo}>
        <div className="absolute inset-0 rounded-full bg-white/25" />
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-teal"
          style={{ width: `${p.pct}%` }}
        />
        {/* Chapter tick marks */}
        {chapters.length > 1 && p.duration > 0 && chapters.slice(1).map(c => (
          <div
            key={c.time}
            className="absolute top-0 h-full w-px bg-black/60 z-10"
            style={{ left: `${(c.time / p.duration) * 100}%` }}
          />
        ))}
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-md opacity-0 transition-opacity group-hover/seek:opacity-100"
          style={{ left: `calc(${p.pct}% - 7px)` }}
        />
      </div>

      {/* Button row */}
      <div className="flex items-center gap-1">
        {/* Left cluster */}
        <Btn onClick={handlePrev} title="Previous"><IcoPrev /></Btn>
        <Btn onClick={p.togglePlay} title={p.isPaused ? "Play" : "Pause"}>
          {p.isPaused ? <IcoPlay /> : <IcoPause />}
        </Btn>
        <Btn onClick={onNext ?? (() => {})} title="Next video" disabled={!onNext}><IcoNext /></Btn>

        {/* Volume */}
        <div className="group/vol flex items-center">
          <Btn onClick={p.toggleMute} title={p.muted ? "Unmute" : "Mute"}>
            {(p.muted || p.volume === 0) ? <IcoMuted /> : <IcoUnmuted />}
          </Btn>
          <div className="w-0 overflow-hidden transition-all duration-200 group-hover/vol:w-20">
            <input
              type="range" min={0} max={1} step={0.02}
              value={p.muted ? 0 : p.volume}
              onChange={e => p.setVolume(parseFloat(e.target.value))}
              className="w-20 cursor-pointer accent-teal"
              aria-label="Volume"
            />
          </div>
        </div>

        <span className="ml-1 shrink-0 text-xs tabular-nums text-white/60">
          {fmt(p.currentTime)} / {fmt(p.duration)}
        </span>

        <div className="flex-1" />

        {/* Speed button */}
        <button
          ref={speedBtnRef}
          type="button"
          title="Playback speed"
          aria-label="Playback speed"
          onClick={() => setSpeedAnchor(speedAnchor ? null : speedBtnRef.current?.getBoundingClientRect() ?? null)}
          className="grid h-8 min-w-[2rem] px-1 place-items-center rounded-full text-white/70 transition-all duration-200 hover:text-teal hover:[filter:drop-shadow(0_0_6px_rgba(45,212,180,0.85))] hover:scale-105 text-[11px] font-semibold tabular-nums"
        >
          {p.playbackRate === 1 ? "1\xd7" : `${p.playbackRate}\xd7`}
        </button>

        {/* Quality button — only if stream exposes quality levels */}
        {p.qualities.length > 0 && (
          <button
            ref={qualityBtnRef}
            type="button"
            title="Video quality"
            aria-label="Video quality"
            onClick={() => setQualityAnchor(qualityAnchor ? null : qualityBtnRef.current?.getBoundingClientRect() ?? null)}
            className="grid h-8 min-w-[2rem] px-1 place-items-center rounded-full text-white/70 transition-all duration-200 hover:text-teal hover:[filter:drop-shadow(0_0_6px_rgba(45,212,180,0.85))] hover:scale-105 text-[11px] font-semibold"
          >
            {p.quality === "Auto" || p.quality === "auto" ? "Auto" : p.quality}
          </button>
        )}

        <Btn onClick={toggleAutoplay} title={autoplay ? "Autoplay on" : "Autoplay off"}>
          <IcoAutoplay on={autoplay} />
        </Btn>

        {!isPortrait && (
          <Btn onClick={toggleFill} title={fill ? "Letterbox" : "Fill"}>
            <IcoFill on={fill} dir={fillDir} />
          </Btn>
        )}

        {/* Miniplayer toggle */}
        <Btn onClick={() => onModeChange("mini")} title="Miniplayer">
          <IcoMini />
        </Btn>

        {/* Theatre / lights-out */}
        {isTheatre ? (
          <>
            <Btn onClick={() => p.setLightsOut(v => !v)} title={p.lightsOut ? "Lights on" : "Lights out"}>
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
  );

  return (
    <>
      {/* Lights-out backdrop */}
      {p.lightsOut && isTheatre && (
        <div
          className="fixed inset-0 z-[51] bg-black/85"
          onClick={() => p.setLightsOut(false)}
        />
      )}

      <div
        ref={p.containerRef}
        className={containerClass}
        style={containerStyle}
        onMouseMove={isMini ? undefined : p.showControls}
        onMouseLeave={isMini ? undefined : p.hideControls}
      >
        {/* Cloudflare Stream iframe */}
        <iframe
          ref={p.iframeRef}
          src={src}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={iframeStyle}
        />

        {/* Click-to-pause / expand (mini) */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={isMini ? () => onModeChange("page") : p.togglePlay}
          onContextMenu={isMini ? undefined : e => { e.preventDefault(); setCtxPos({ x: e.clientX, y: e.clientY }); }}
        />

        {/* OSD flash */}
        <PlayerOSD message={osdMsg} />

        {/* Big centered play button when paused (not mini) */}
        {p.isPaused && countdown === null && !isMini && (
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

        {/* Autoplay countdown */}
        {countdown !== null && onNext && !isMini && (
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

        {/* Controls */}
        {isMini ? miniControls : fullControls}
      </div>

      {/* Floating menus (outside overflow:hidden container) */}
      {speedAnchor && (
        <PlayerSpeedMenu
          anchor={speedAnchor}
          rate={p.playbackRate}
          onSetRate={r => { p.setPlaybackRate(r); triggerOSD(`Speed: ${r === 1 ? "Normal" : r + "\xd7"}`); }}
          onClose={() => setSpeedAnchor(null)}
        />
      )}
      {qualityAnchor && p.qualities.length > 0 && (
        <PlayerQualityMenu
          anchor={qualityAnchor}
          qualities={p.qualities}
          quality={p.quality}
          onSetQuality={q => { p.setQuality(q); triggerOSD(`Quality: ${q}`); }}
          onClose={() => setQualityAnchor(null)}
        />
      )}
      {ctxPos && (
        <PlayerContextMenu
          x={ctxPos.x}
          y={ctxPos.y}
          onClose={() => setCtxPos(null)}
          loop={p.loop}
          onToggleLoop={p.toggleLoop}
          playbackRate={p.playbackRate}
          onSetRate={p.setPlaybackRate}
          currentTime={p.currentTime}
          videoId={uid}
        />
      )}
    </>
  );
}
