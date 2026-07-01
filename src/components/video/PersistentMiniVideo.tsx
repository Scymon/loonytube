"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAudio } from "@/contexts/AudioContext";

const SDK_URL = "https://embed.cloudflarestream.com/embed/sdk.latest.js";
const W = 256;
const H = 144;

export default function PersistentMiniVideo() {
  const {
    videoMiniMode, videoMeta,
    videoPosition, videoIsPlaying, setVideoProgress, setVideoIsPlaying,
    registerVideoSeek, registerVideoToggle,
    setVideoMiniMode, setVideoMeta,
  } = useAudio();
  const router     = useRouter();
  const pathname   = usePathname();
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const playerRef  = useRef<unknown>(null);
  const startRef      = useRef(0);
  const wasPlayingRef = useRef(true); // was video playing at handoff?
  const prevVisRef    = useRef(false);
  const [isPaused, setIsPaused] = useState(true);

  // Synchronous pathname check — no useEffect timing gap.
  // Only block on the SAME video's watch page; allow showing on other watch pages.
  const videoId = videoMeta?.id ?? '';
  const isOnSameVideoPage = !!(videoId && pathname?.startsWith(`/watch/${videoId}`));
  const visible = videoMiniMode === "mini" && !isOnSameVideoPage && !!videoMeta;

  // Snapshot position synchronously the first render where visible becomes true,
  // so the iframe src is built with the correct startTime on first paint.
  if (visible && !prevVisRef.current) {
    startRef.current = videoPosition;
    wasPlayingRef.current = videoIsPlaying;
  }
  prevVisRef.current = visible;

  // Init / teardown Cloudflare Stream player
  useEffect(() => {
    if (!visible) return;
    playerRef.current = null;

    function initPlayer() {
      if (!iframeRef.current || !(window as any).Stream || playerRef.current) return;
      const p = (window as any).Stream(iframeRef.current);
      playerRef.current = p;
      const vid = videoMeta!.id;

      p.addEventListener("play",  () => { setIsPaused(false); setVideoIsPlaying(true);  });
      p.addEventListener("pause", () => { setIsPaused(true);  setVideoIsPlaying(false); });
      p.addEventListener("timeupdate", () => {
        const t = p.currentTime ?? 0;
        const d = p.duration    ?? 0;
        setVideoProgress(t, d);
        // Mirror to localStorage so WatchPlayer resumes here when the user expands back
        if (t > 2) {
          try { localStorage.setItem(`loonytube:resume:${vid}`, String(Math.floor(t))); } catch { /* noop */ }
        }
      });

      registerVideoToggle(() => {
        if (p.paused) p.play().catch(() => {}); else p.pause();
      });
      registerVideoSeek((frac: number) => {
        if (p.duration) p.currentTime = frac * p.duration;
      });

      if (wasPlayingRef.current) p.play().catch(() => {});
    }

    if ((window as any).Stream) { initPlayer(); }
    else {
      let s = document.querySelector(`script[src="${SDK_URL}"]`) as HTMLScriptElement | null;
      if (!s) {
        s = document.createElement("script") as HTMLScriptElement;
        s.src = SDK_URL;
        document.head.appendChild(s);
      }
      s.addEventListener("load", initPlayer, { once: true });
    }

    return () => {
      registerVideoToggle(null);
      registerVideoSeek(null);
      playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, videoMeta?.id]);

  if (!visible || !videoMeta) return null;

  const st  = startRef.current;
  const shouldAutoplay = wasPlayingRef.current;
  const src = `https://iframe.cloudflarestream.com/${
    videoMeta.token || videoMeta.id
  }?controls=false${shouldAutoplay ? "&autoplay=true" : ""}&preload=auto${st > 2 ? `&startTime=${Math.floor(st)}` : ""}`;

  return (
    <div
      className="fixed bottom-0 z-[9999] bg-black"
      style={{
        left:         "var(--sidebar-w, 0px)",
        width:        W,
        height:       H,
        borderRadius: "12px 12px 0 0",
        overflow:     "hidden",
        boxShadow:    "0 -4px 24px rgba(0,0,0,.6)",
      }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        allow="autoplay; fullscreen"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />

      {/* Controls layer — always present (mirrors WatchPlayer miniDockedControls style) */}
      <div className="absolute inset-0 z-10">
        {/* Full-area click → play / pause */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={() => {
            const p = playerRef.current as any;
            if (!p) return;
            if (p.paused) p.play().catch(() => {}); else p.pause();
          }}
        />

        {/* Top-right action buttons */}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          <button
            onClick={e => { e.stopPropagation(); router.push(`/watch/${videoMeta.id}`); }}
            title="Open watch page"
            className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white/80 hover:bg-black/90 hover:text-white transition-colors"
          >
            {/* expand arrows */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); setVideoMiniMode(null); setVideoMeta(null); }}
            title="Close"
            className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white/80 hover:bg-black/90 hover:text-white transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Centred play icon when paused — mirrors WatchPlayer mini mode */}
        {isPaused && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-black/50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
