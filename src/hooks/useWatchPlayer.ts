"use client";
import { useEffect, useRef, useState } from "react";

const SDK_URL = "https://embed.cloudflarestream.com/embed/sdk.latest.js";

export type PlayerMode = "page" | "theatre";

export function useWatchPlayer(uid: string, token?: string | null, onEnded?: () => void) {
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const [isPaused, setIsPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lightsOut, setLightsOut] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // auto-hide controls after 3s of no mouse movement
  function showControls() {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isPaused) setControlsVisible(false);
    }, 3000);
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPaused) {
      setControlsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
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

  function toggleMute() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = playerRef.current as any;
    const next = !muted;
    setMuted(next);
    if (p) p.muted = next;
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

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const iframeSrc = `https://iframe.cloudflarestream.com/${
    token || uid
  }?controls=false&preload=auto`;

  return {
    isPaused, muted, currentTime, duration, pct,
    lightsOut, setLightsOut,
    controlsVisible, showControls,
    iframeRef, containerRef,
    iframeSrc,
    togglePlay, toggleMute, seekTo, seekToTime, doFullscreen,
  };
}
