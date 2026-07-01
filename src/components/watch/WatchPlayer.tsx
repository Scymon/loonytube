"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import PlayerContextMenu from "@/components/PlayerContextMenu";
import PlayerOSD,        { type OSDMessage }    from "./PlayerOSD";
import PlayerSpeedMenu                           from "./PlayerSpeedMenu";
import PlayerQualityMenu                         from "./PlayerQualityMenu";
import { useWatchPlayer, type PlayerMode }        from "@/hooks/useWatchPlayer";
import { useAudio }                                  from "@/contexts/AudioContext";
import { useKeyboardShortcuts }                  from "@/hooks/useKeyboardShortcuts";
import { parseChapters, chapterAt }              from "@/utils/parseChapters";
import {
  IcoPlay, IcoPause, IcoMuted, IcoUnmuted,
  IcoTheatre, IcoExitTheatre, IcoFullscreen, IcoLightsOut,
  IcoPrev, IcoNext, IcoAutoplay, IcoFill,
  IcoMini, IcoExpand,
} from "./WatchIcons";

// Mini-player action icons (module-level so identity is stable across renders)
function IcoPopOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h6v6M10 14L21 3M9 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4" />
    </svg>
  );
}
function IcoDock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12v9h9M12 21L3 12M21 9V3h-9M9 3l12 12" />
    </svg>
  );
}

// Keep in sync with MiniAudioPlayer's VIDEO_MINI_W / BAR_H constants
const VIDEO_MINI_W = 256;
const BAR_H        = 61;

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
  const [dragPos, setDragPos]     = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef  = useRef(false);
  const dragOffsetRef  = useRef({ x: 0, y: 0 });

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

  // Bridge video playback position into AudioContext so MiniAudioPlayer
  // scrubber reflects video progress when in mini mode.
  const { setVideoProgress, registerVideoSeek, registerVideoToggle, setVideoIsPlaying } = useAudio();
  const durationRef = useRef(0);
  durationRef.current = p.duration;

  useEffect(() => {
    if (mode === "mini" || mode === "mini-float") {
      setVideoProgress(p.currentTime, p.duration);
      setVideoIsPlaying(!p.isPaused);
    }
  }, [p.currentTime, p.duration, p.isPaused, mode, setVideoProgress, setVideoIsPlaying]);

  // When entering mini / mini-float, the Cloudflare Stream SDK can auto-pause
  // because the iframe container changes position — the SDK's internal visibility
  // detection may momentarily think the player is hidden. Resume play after a
  // short settle period if the video was playing before the mode switch.
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    wasPlayingRef.current = !p.isPaused;
  }, [p.isPaused]);

  useEffect(() => {
    if (mode !== "mini" && mode !== "mini-float") return;
    const wasPlaying = wasPlayingRef.current;
    if (!wasPlaying) return;
    // Give the layout 250 ms to settle, then resume if the SDK auto-paused.
    const t = setTimeout(() => { p.forcePlay(); }, 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode === "mini" || mode === "mini-float") {
      registerVideoSeek((frac: number) => {
        if (durationRef.current > 0) p.seekToTime(frac * durationRef.current);
      });
      registerVideoToggle(p.togglePlay);
    } else {
      registerVideoSeek(null);
      registerVideoToggle(null);
      setVideoProgress(0, 0);
      setVideoIsPlaying(false);
    }
    return () => { registerVideoSeek(null); registerVideoToggle(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, registerVideoSeek, registerVideoToggle, setVideoProgress, setVideoIsPlaying]);

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

  const isTheatre   = mode === "theatre";
  const isMini      = mode === "mini";        // docked above audio bar
  const isMiniFloat = mode === "mini-float";  // free-floating widget
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

  // ── Drag-to-reposition for mini-float ──────────────────────────────────────
  useEffect(() => {
    if (!isMiniFloat) { setDragPos(null); return; }
    function onMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;
      const x = Math.max(0, Math.min(window.innerWidth  - 288, e.clientX - dragOffsetRef.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - 162, e.clientY - dragOffsetRef.current.y));
      setDragPos({ x, y });
    }
    function onUp() {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        // restore grab cursor after release
        if (p.containerRef.current) p.containerRef.current.style.cursor = "grab";
      }
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMiniFloat]);

  function handleFloatDragStart(e: React.MouseEvent) {
    if (!isMiniFloat) return;
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = p.containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    isDraggingRef.current = true;
    if (p.containerRef.current) p.containerRef.current.style.cursor = "grabbing";
    e.preventDefault();
  }

  // ── Sizing ──────────────────────────────────────────────────────────────────
  const lightsOutZ = p.lightsOut ? { zIndex: 52 as const } : {};

  let containerStyle: React.CSSProperties;
  if (isMini) {
    // bottom:0 so the widget overlaps the bar. The bar's backdrop-filter is moved
    // to a child element so it doesn't create a GPU compositing layer that fights
    // this container's z:9999.
    containerStyle = {
      position:     "fixed",
      bottom:       0,
      left:         "var(--sidebar-w, 0px)",
      width:        VIDEO_MINI_W,
      height:       144,
      zIndex:       9999,
      borderRadius: "12px 12px 0 0",
      overflow:     "hidden",
      transform:    "translateZ(0)",
      boxShadow:    "0 -4px 24px rgba(0,0,0,.6)",
    };
  } else if (isMiniFloat) {
    // Floating: free-floating widget; uses dragPos when dragged, else default bottom-right
    containerStyle = dragPos
      ? {
          position:     "fixed",
          left:         dragPos.x,
          top:          dragPos.y,
          width:        288,
          height:       162,
          zIndex:       190,
          borderRadius: 12,
          boxShadow:    "0 20px 60px rgba(0,0,0,0.85)",
          cursor:       "grab",
        }
      : {
          position:     "fixed",
          bottom:       76,
          right:        16,
          width:        288,
          height:       162,
          zIndex:       190,
          borderRadius: 12,
          boxShadow:    "0 20px 60px rgba(0,0,0,0.85)",
          cursor:       "grab",
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
    isMini ? "group relative overflow-hidden bg-black" : "group relative overflow-hidden bg-black",
    isMiniFloat ? "ring-1 ring-white/15" : "",
    !isMini && !isMiniFloat && isPortrait  ? "mx-auto w-auto" : "",
    !isMini && !isMiniFloat && !isPortrait ? "w-full" : "",
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
    // translateZ(0) forces a GPU compositing layer — required in Chrome to render
    // cross-origin iframe video frames when the container is position:fixed.
    transform: (isMini || isMiniFloat)
      ? "translate(-50%,-50%) translateZ(0)"
      : fillScale !== 1
        ? `translate(-50%,-50%) scale(${fillScale})`
        : "translate(-50%,-50%)",
    width: "100%", height: "100%",
    border: "none", pointerEvents: "none",
  };

  const src = p.iframeSrc + (poster ? `&poster=${encodeURIComponent(poster)}` : "");

  // ── Mini controls (only used for mini-float mode) ───────────────────────────
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
        {/* Dock back to bar (mini-float only — docked mini exits early via portal) */}
        <Btn onClick={() => onModeChange("mini")} title="Dock to bar"><IcoDock /></Btn>
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

  // Docked-mini overlay: click video → play/pause; buttons top-right for pop-out & restore.
  const miniDockedControls = (
    <div className="absolute inset-0 z-10">
      {/* Click video area → play/pause */}
      <div className="absolute inset-0 cursor-pointer" onClick={p.togglePlay} />
      {/* Buttons top-right */}
      <div className="absolute top-1.5 right-1.5 flex gap-1">
        <button
          type="button"
          title="Pop out"
          onClick={e => { e.stopPropagation(); onModeChange("mini-float"); }}
          className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white/80 hover:bg-black/90 hover:text-white transition-colors"
        >
          <IcoPopOut />
        </button>
        <button
          type="button"
          title="Expand player"
          onClick={e => { e.stopPropagation(); onModeChange("page"); }}
          className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white/80 hover:bg-black/90 hover:text-white transition-colors"
        >
          <IcoExpand />
        </button>
      </div>
      {/* Play icon when paused */}
      {p.isPaused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-black/50">
            <IcoPlay size={18} />
          </div>
        </div>
      )}
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
        onMouseMove={p.showControls}
        onMouseLeave={p.hideControls}
        onMouseDown={isMiniFloat ? handleFloatDragStart : undefined}
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
          onClick={isMini ? () => p.controlsVisible ? p.hideControls() : p.showControls() : isMiniFloat ? () => onModeChange("page") : p.togglePlay}
          onContextMenu={isMiniFloat ? undefined : e => { e.preventDefault(); setCtxPos({ x: e.clientX, y: e.clientY }); }}
        />

        {/* OSD flash */}
        <PlayerOSD message={osdMsg} />

        {/* Big centered play button when paused (not mini) */}
        {p.isPaused && countdown === null && !isMini && !isMiniFloat && (
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
        {countdown !== null && onNext && !isMini && !isMiniFloat && (
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
        {isMini ? miniDockedControls : isMiniFloat ? miniControls : fullControls}
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
