"use client";
import { useEffect, useRef, useState } from "react";

const SDK_URL = "https://embed.cloudflarestream.com/embed/sdk.latest.js";

export type PlayerMode = "page" | "theatre" | "mini";

export function useWatchPlayer(uid: string, token?: string | null, onEnded?: () => void) {
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const [isPaused, setIsPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lightsOut, setLightsOut] = useState(false);
  useEffect(() => {
    if (lightsOut) document.documentElement.classList.add('lt-lights-out');
    else document.documentElement.classList.remove('lt-lights-out');
    return () => document.documentElement.classList.remove('lt-lights-out');
  }, [lightsOut]);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [volume, setVolumeState] = useState(1);
  const [loop, setLoopState]           = useState(false);
  const [playbackRate, setRateState]   = useState(1);
  const [qualities, setQualitiesState]   = useState<string[]>([]);
  const [quality,   setQualityState]     = useState("auto");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedRef = useRef(true);

  // auto-hide controls after 3s of no mouse movement
  function showControls() {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isPausedRef.current) setControlsVisible(false);
    }, 3000);
  }

  function hideControls() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isPausedRef.current) setControlsVisible(false);
    }, 600);
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isPaused) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      // Just started playing — auto-hide controls after 3s
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [isPaused]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function init() {
      if (!iframeRef.current || !(window as any).Stream || playerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (window as any).Stream(iframeRef.current);
      playerRef.current = p;

      p.addEventListener("play", () => setIsPaused(false));
      p.addEventListener("pause", () => setIsPaused(true));
      p.addEventListener("ended", () => { setIsPaused(true); onEndedRef.current?.(); });

      p.addEventListener("timeupdate", () => {
        const t = p.currentTime ?? 0;
        const dur = p.duration ?? 0;
        setCurrentTime(t);
        if (dur > 0) setDuration(dur);
        const sec = Math.floor(t);
        if (sec > 0 && sec >= lastSavedRef.current + 5) {
          lastSavedRef.current = sec;
          try { localStorage.setItem(`loonytube:resume:${uid}`, String(sec)); } catch { /* noop */ }
        }
      });

      p.addEventListener("durationchange", () => {
        if (p.duration > 0) setDuration(p.duration);
      });

      p.addEventListener("loadedmetadata", () => {
        if (p.duration > 0) setDuration(p.duration);
        try {
          const saved = localStorage.getItem(`loonytube:resume:${uid}`);
          if (saved) {
            const t = parseFloat(saved);
            if (t > 2) {
              p.currentTime = t;
              setTimeout(() => {
                if (playerRef.current && Math.abs((playerRef.current as any).currentTime - t) > 1.5) {
                  (playerRef.current as any).currentTime = t;
                }
              }, 450);
            }
          }
        } catch { /* noop */ }
        // Restore volume, muted, loop, playback rate from localStorage
        try {
          const savedVol = localStorage.getItem("loonytube:volume");
          if (savedVol !== null) {
            const v = Math.max(0, Math.min(1, parseFloat(savedVol)));
            if (isFinite(v)) { p.volume = v; setVolumeState(v); }
          }
          const savedMuted = localStorage.getItem("loonytube:muted");
          if (savedMuted === "1") { p.muted = true; setMuted(true); }
          const savedLoop = localStorage.getItem("loonytube:loop");
          if (savedLoop === "1") { p.loop = true; setLoopState(true); }
          const savedRate = localStorage.getItem("loonytube:rate");
          if (savedRate !== null) {
            const r = parseFloat(savedRate);
            if (isFinite(r) && r > 0) { p.playbackRate = r; setRateState(r); }
          }
        } catch { /* noop */ }
        // Detect available quality levels
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const qs: string[] = ((p as any).qualities ?? []).map((q: unknown) =>
            typeof q === "string" ? q
            : (typeof q === "object" && q && "height" in q) ? `${(q as { height: number }).height}p`
            : String(q)
          );
          if (qs.length) {
            setQualitiesState(["Auto", ...qs]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cur = (p as any).quality;
            setQualityState(typeof cur === "string" ? cur : "Auto");
          }
        } catch { /* noop */ }
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Stream) { init(); return; }
    let s = document.querySelector(`script[src="${SDK_URL}"]`) as HTMLScriptElement | null;
    if (!s) {
      s = document.createElement("script") as HTMLScriptElement;
      s.src = SDK_URL;
      document.head.appendChild(s);
    }
    s.addEventListener("load", init, { once: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, token]);

  function togglePlay() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = playerRef.current as any;
    if (!p) return;
    if (isPaused) p.play().catch(() => {});
    else p.pause();
  }

  function toggleLoop() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = playerRef.current as any;
    const next = !loop;
    setLoopState(next);
    if (p) p.loop = next;
    try { localStorage.setItem("loonytube:loop", next ? "1" : "0"); } catch { /* noop */ }
  }

  function setPlaybackRate(r: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = playerRef.current as any;
    setRateState(r);
    if (p) p.playbackRate = r;
    try { localStorage.setItem("loonytube:rate", String(r)); } catch { /* noop */ }
  }

    function toggleMute() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = playerRef.current as any;
    const next = !muted;
    setMuted(next);
    if (p) {
      p.muted = next;
      // If unmuting with volume at 0, restore to a sensible level
      if (!next) {
        setVolumeState(prev => {
          const restored = prev > 0 ? prev : 0.7;
          if (p) p.volume = restored;
          try { localStorage.setItem("loonytube:volume", String(restored)); } catch { /* noop */ }
          return restored;
        });
      }
    }
    try { localStorage.setItem("loonytube:muted", next ? "1" : "0"); } catch { /* noop */ }
  }

  function setVolume(v: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = playerRef.current as any;
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (p) p.volume = clamped;
    if (clamped === 0 && !muted) { setMuted(true); if (p) p.muted = true; }
    else if (clamped > 0 && muted) { setMuted(false); if (p) p.muted = false; }
    try { localStorage.setItem("loonytube:volume", String(clamped)); } catch { /* noop */ }
    try { localStorage.setItem("loonytube:muted", clamped === 0 ? "1" : "0"); } catch { /* noop */ }
  }

  function seekTo(e: React.MouseEvent<HTMLDivElement>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = playerRef.current as any;
    if (!duration || !p) return;
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(((e.clientX - r.left) / r.width) * duration, duration));
    p.currentTime = t;
    setCurrentTime(t);
  }

  function seekToTime(seconds: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = playerRef.current as any;
    if (!p) return;
    p.currentTime = seconds;
    setCurrentTime(seconds);
  }

  function doFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function setQuality(q: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = playerRef.current as any;
    setQualityState(q);
    try { if (p) p.quality = q === "Auto" ? undefined : q; } catch { /* noop */ }
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const iframeSrc = `https://iframe.cloudflarestream.com/${
    token || uid
  }?controls=false&preload=auto`;

  return {
    isPaused, muted, volume, currentTime, duration, pct,
    loop, playbackRate,
    qualities, quality, setQuality,
    lightsOut, setLightsOut,
    controlsVisible, showControls, hideControls,
    iframeRef, containerRef,
    iframeSrc,
    togglePlay, toggleMute, setVolume,
    toggleLoop, setPlaybackRate,
    seekTo, seekToTime, doFullscreen,
  };
}
