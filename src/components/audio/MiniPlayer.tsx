"use client";

import Link from "next/link";
import { useAudio } from "@/contexts/AudioContext";

function fmt(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

// Shared constants — keep in sync with WatchPlayer's portal fallback
const VIDEO_MINI_W = 256;  // px, width of the docked video slot
const BAR_H        = 61;   // px, scrubber(4) + py-2.5 top(10) + h-9 content(36) + py-2.5 bot(10) + border(1)

export default function MiniPlayer() {
  const {
    track, playing, position, duration, speed, videoMiniMode, videoMeta,
    videoPosition, videoDuration, videoIsPlaying, seekVideoFraction, toggleVideoPlay,
    setVideoMiniMode, setVideoMeta,
    pause, resume, seekFraction, skipForward, skipBack, playNext, playPrev, dismiss,
  } = useAudio();

  // Show bar if audio is loaded OR a video is docked
  if (!track && !videoMiniMode) return null;

  const videoDocked = videoMiniMode === "mini";
  const videoActive = videoMiniMode !== null; // "mini" OR "mini-float"
  // When any video mode is active, display its info; otherwise show the audio track info
  const displayTitle    = videoActive && videoMeta ? videoMeta.title     : track?.title     ?? "";
  const displayOwner    = videoActive && videoMeta ? videoMeta.ownerName : track?.ownerName ?? null;
  const displayCoverUrl = videoActive && videoMeta ? videoMeta.posterUrl : track?.coverUrl  ?? null;
  const displayHref     = videoActive && videoMeta ? `/watch/${videoMeta.id}` : `/listen/${track?.id ?? ""}`;

  // When video is docked, display video progress in the bar
  const barPosition = videoDocked && videoDuration > 0 ? videoPosition : position;
  const barDuration = videoDocked && videoDuration > 0 ? videoDuration : duration;
  const pct = barDuration > 0 ? (barPosition / barDuration) * 100 : 0;

  return (
    <div
      className={`fixed bottom-0 right-0 z-50 border-t border-edge bg-panel/95 pb-[env(safe-area-inset-bottom)] ${videoDocked ? "" : "backdrop-blur-md"}`}
      style={videoDocked ? { left: `calc(var(--sidebar-w, 0px) + ${VIDEO_MINI_W}px)` } : { left: 0 }}
    >

      {/* Scrubber bar — inset past sidebar (+ video slot when docked) */}
      <div className="group relative h-1 cursor-pointer bg-edge/50 hover:h-1.5 transition-all duration-100"
        style={{
          marginLeft: videoDocked ? "0px" : "var(--sidebar-w, 0px)",
        }}
        onClick={e => {
          const r = e.currentTarget.getBoundingClientRect();
          const frac = r.width > 0 ? (e.clientX - r.left) / r.width : 0;
          if (videoDocked) seekVideoFraction(frac); else seekFraction(frac);
        }}
        onMouseMove={e => {
          if (e.buttons !== 1) return;
          const r = e.currentTarget.getBoundingClientRect();
          const frac = r.width > 0 ? Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) : 0;
          if (videoDocked) seekVideoFraction(frac); else seekFraction(frac);
        }}>
        <div className="h-full bg-teal transition-[width] duration-100" style={{ width: `${pct}%` }} />
        {/* Thumb */}
        <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-teal shadow-md
          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${pct}%`, transform: "translate(-50%, -50%)" }} />
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 transition-[padding-left] duration-200"
        style={{
          paddingLeft: videoDocked ? "1rem" : "calc(1rem + var(--sidebar-w, 0px))",
        }}>

        {/* Cover / poster — hidden when video is docked above (video slot shows instead) */}
        {!videoDocked && (
          <Link href={displayHref} className="shrink-0">
            <div className="h-10 w-10 overflow-hidden rounded-lg border border-edge bg-surface">
              {displayCoverUrl
                ? <img src={displayCoverUrl} alt={displayTitle} className="h-full w-full object-cover" />
                : <div className="grid h-full w-full place-items-center text-mist/40">
                    <Icon d="M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6z|M18 19a3 3 0 100-6 3 3 0 000 6z" size={16} />
                  </div>
              }
            </div>
          </Link>
        )}

        {/* Title + owner */}
        <div className="min-w-0 flex-1">
          <Link href={displayHref}
            className="block truncate text-sm font-semibold text-foam hover:text-teal transition-colors">
            {displayTitle}
          </Link>
          <p className="truncate text-xs text-mist/60">{displayOwner ?? "Unknown"}</p>
        </div>

        {/* Time */}
        <span className="hidden sm:block shrink-0 text-xs text-mist/50 tabular-nums">
          {fmt(barPosition)} / {fmt(barDuration)}
        </span>

        {/* Speed badge */}
        {speed !== 1 && (
          <span className="hidden sm:block shrink-0 rounded-md border border-edge px-1.5 py-0.5 text-[10px] font-bold text-teal">
            {speed}×
          </span>
        )}

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={() => playPrev()} title="Previous"
            className="hidden sm:grid h-8 w-8 place-items-center rounded-full text-mist/70 hover:text-foam transition-colors">
            <Icon d="M19 20L9 12l10-8v16|M5 19V5" size={15} />
          </button>
          <button
            onClick={() => videoDocked ? seekVideoFraction(Math.max(0, (videoPosition - 15) / (videoDuration || 1))) : skipBack(15)}
            title="Back 15s"
            className="relative grid h-8 w-8 place-items-center rounded-full text-mist/70 hover:text-foam transition-colors">
            <Icon d="M2.5 8.5A9 9 0 1 0 12 3" size={15} />
            <span className="absolute text-[7px] font-bold">15</span>
          </button>
          <button
            onClick={videoDocked ? toggleVideoPlay : () => playing ? pause() : resume()}
            title={(videoDocked ? videoIsPlaying : playing) ? "Pause" : "Play"}
            className="grid h-9 w-9 place-items-center rounded-full bg-teal text-black hover:bg-teal/90 transition-colors">
            {(videoDocked ? videoIsPlaying : playing)
              ? <Icon d="M6 4h4v16H6z|M14 4h4v16h-4z" size={15} />
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
            }
          </button>
          <button
            onClick={() => videoDocked ? seekVideoFraction(Math.min(1, (videoPosition + 15) / (videoDuration || 1))) : skipForward(15)}
            title="Forward 15s"
            className="relative grid h-8 w-8 place-items-center rounded-full text-mist/70 hover:text-foam transition-colors">
            <Icon d="M21.5 8.5A9 9 0 1 1 12 3" size={15} />
            <span className="absolute text-[7px] font-bold">15</span>
          </button>
          <button onClick={() => playNext()} title="Next"
            className="hidden sm:grid h-8 w-8 place-items-center rounded-full text-mist/70 hover:text-foam transition-colors">
            <Icon d="M5 4l10 8-10 8V4|M19 5v14" size={15} />
          </button>
        </div>

        {/* Dismiss */}
        <button onClick={() => {
          if (videoDocked) {
            if (videoIsPlaying) toggleVideoPlay();
            setVideoMiniMode(null);
            setVideoMeta(null);
          } else {
            dismiss();
          }
        }} title="Close player"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-mist/40 hover:text-mist transition-colors">
          <Icon d="M18 6 6 18M6 6l12 12" size={13} />
        </button>
      </div>
    </div>
  );
}
