"use client";

import { useState } from "react";
import { useAudio, type SleepTimer } from "@/contexts/AudioContext";
import { parseChapters, chapterAt } from "@/utils/parseChapters";

/* ── Helpers ──────────────────────────────────────────────────────────── */
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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_OPTIONS: { label: string; value: SleepTimer }[] = [
  { label: "Off",     value: null },
  { label: "15 min",  value: 15   },
  { label: "30 min",  value: 30   },
  { label: "45 min",  value: 45   },
  { label: "60 min",  value: 60   },
];

/* ── Speed menu ─────────────────────────────────────────────────────────── */
function SpeedMenu({ speed, onSet, onClose }: { speed: number; onSet: (s: number) => void; onClose: () => void }) {
  return (
    <div className="absolute bottom-full mb-2 right-0 z-50 w-36 rounded-2xl border border-edge bg-panel shadow-2xl overflow-hidden">
      <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-mist/50">Speed</p>
      {SPEEDS.map(s => (
        <button key={s} onClick={() => { onSet(s); onClose(); }}
          className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors
            ${s === speed ? "text-teal font-semibold" : "text-foam hover:bg-edge/60"}`}>
          <span>{s}×</span>
          {s === speed && <Icon d="M20 6L9 17l-5-5" size={14} />}
        </button>
      ))}
    </div>
  );
}

/* ── Sleep timer menu ──────────────────────────────────────────────────── */
function SleepMenu({ current, left, onSet, onClose }: {
  current: SleepTimer; left: number | null; onSet: (t: SleepTimer) => void; onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full mb-2 right-0 z-50 w-40 rounded-2xl border border-edge bg-panel shadow-2xl overflow-hidden">
      <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-mist/50">Sleep timer</p>
      {current && left !== null && (
        <p className="px-3 pb-2 text-xs text-teal font-medium">{fmt(left)} remaining</p>
      )}
      {SLEEP_OPTIONS.map(o => (
        <button key={String(o.value)} onClick={() => { onSet(o.value); onClose(); }}
          className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors
            ${o.value === current ? "text-teal font-semibold" : "text-foam hover:bg-edge/60"}`}>
          <span>{o.label}</span>
          {o.value === current && <Icon d="M20 6L9 17l-5-5" size={14} />}
        </button>
      ))}
    </div>
  );
}

/* ── Chapter list ────────────────────────────────────────────────────────── */
function ChapterList({ chapters, position, duration, onSeek }: {
  chapters: ReturnType<typeof parseChapters>;
  position: number;
  duration: number;
  onSeek: (t: number) => void;
}) {
  if (chapters.length === 0) return null;
  const current = chapterAt(chapters, position);
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-mist/50 mb-2">Chapters</p>
      {chapters.map((ch, i) => {
        const isActive = ch === current;
        const pct = duration > 0 ? Math.round((ch.time / duration) * 100) : 0;
        return (
          <button key={i} onClick={() => onSeek(ch.time)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors
              ${isActive ? "bg-teal/10 text-teal" : "text-foam hover:bg-edge/60"}`}>
            <span className={`shrink-0 text-xs tabular-nums ${isActive ? "text-teal" : "text-mist/50"}`}>
              {fmt(ch.time)}
            </span>
            <span className="flex-1 truncate text-sm font-medium">{ch.title}</span>
            <span className="shrink-0 text-[10px] text-mist/30">{pct}%</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Main AudioPlayer ────────────────────────────────────────────────────── */
export type AudioPlayerProps = {
  description?: string | null;
};

export default function AudioPlayer({ description }: AudioPlayerProps) {
  const {
    track, playing, position, duration, speed, sleepTimer, sleepLeft,
    pause, resume, seek, seekFraction, setSpeed, setSleep, skipForward, skipBack, playNext, playPrev,
  } = useAudio();

  const [showSpeed, setShowSpeed]   = useState(false);
  const [showSleep, setShowSleep]   = useState(false);
  const [showChaps, setShowChaps]   = useState(true);

  if (!track) return null;

  const pct      = duration > 0 ? (position / duration) * 100 : 0;
  const chapters = parseChapters(description ?? "");
  const current  = chapterAt(chapters, position);

  return (
    <div className="mx-auto max-w-lg space-y-8">

      {/* Cover art */}
      <div className="mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl border border-edge bg-surface shadow-2xl shadow-black/40">
        {track.coverUrl
          ? <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
          : <div className="grid h-full w-full place-items-center text-mist/20">
              <Icon d="M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6z|M18 19a3 3 0 100-6 3 3 0 000 6z" size={64} />
            </div>
        }
      </div>

      {/* Title + chapter */}
      <div className="space-y-1 px-1">
        <h1 className="text-xl font-bold text-foam leading-tight">{track.title}</h1>
        {track.ownerName && <p className="text-sm text-mist/70">{track.ownerName}</p>}
        {current && (
          <p className="text-xs text-teal/80 font-medium">▶ {current.title}</p>
        )}
      </div>

      {/* Progress bar with chapter markers */}
      <div className="space-y-2">
        <div className="group/bar relative h-2 w-full cursor-pointer rounded-full bg-edge/60"
          onClick={e => {
            const r = e.currentTarget.getBoundingClientRect();
            if (r.width > 0) seekFraction((e.clientX - r.left) / r.width);
          }}>
          {/* Filled */}
          <div className="absolute inset-y-0 left-0 rounded-full bg-teal transition-none" style={{ width: `${pct}%` }} />
          {/* Thumb */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white shadow-md
            opacity-0 group-hover/bar:opacity-100 transition-opacity"
            style={{ left: `${pct}%` }} />
          {/* Chapter markers */}
          {chapters.map((ch, i) => (
            duration > 0 && (
              <div key={i} className="absolute top-0 h-full w-0.5 bg-white/30 rounded-full"
                style={{ left: `${(ch.time / duration) * 100}%` }} />
            )
          ))}
        </div>
        <div className="flex justify-between text-xs text-mist/50 tabular-nums">
          <span>{fmt(position)}</span>
          <span>-{fmt(Math.max(0, duration - position))}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => playPrev()} title="Previous"
          className="grid h-10 w-10 place-items-center rounded-full text-mist/60 hover:text-foam transition-colors">
          <Icon d="M19 20L9 12l10-8v16|M5 19V5" size={20} />
        </button>
        <button onClick={() => skipBack(15)} title="Back 15s"
          className="relative grid h-10 w-10 place-items-center rounded-full text-mist/70 hover:text-foam transition-colors">
          <Icon d="M2.5 8.5A9 9 0 1 0 12 3" size={22} />
          <span className="absolute text-[9px] font-bold leading-none">15</span>
        </button>
        <button onClick={() => playing ? pause() : resume()} title={playing ? "Pause" : "Play"}
          className="grid h-16 w-16 place-items-center rounded-full bg-teal text-black shadow-lg shadow-teal/30
            hover:bg-teal/90 hover:scale-105 transition-all">
          {playing
            ? <Icon d="M6 4h4v16H6z|M14 4h4v16h-4z" size={22} />
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
          }
        </button>
        <button onClick={() => skipForward(15)} title="Forward 15s"
          className="relative grid h-10 w-10 place-items-center rounded-full text-mist/70 hover:text-foam transition-colors">
          <Icon d="M21.5 8.5A9 9 0 1 1 12 3" size={22} />
          <span className="absolute text-[9px] font-bold leading-none">15</span>
        </button>
        <button onClick={() => playNext()} title="Next"
          className="grid h-10 w-10 place-items-center rounded-full text-mist/60 hover:text-foam transition-colors">
          <Icon d="M5 4l10 8-10 8V4|M19 5v14" size={20} />
        </button>
      </div>

      {/* Secondary controls: speed + sleep */}
      <div className="flex items-center justify-between px-1">
        <div className="relative">
          <button onClick={() => { setShowSpeed(v => !v); setShowSleep(false); }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors
              ${showSpeed || speed !== 1
                ? "border-teal/40 bg-teal/10 text-teal"
                : "border-edge text-mist hover:text-foam hover:border-foam/40"}`}>
            <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" size={12} />
            {speed}×
          </button>
          {showSpeed && <SpeedMenu speed={speed} onSet={setSpeed} onClose={() => setShowSpeed(false)} />}
        </div>

        <div className="relative">
          <button onClick={() => { setShowSleep(v => !v); setShowSpeed(false); }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors
              ${showSleep || sleepTimer
                ? "border-teal/40 bg-teal/10 text-teal"
                : "border-edge text-mist hover:text-foam hover:border-foam/40"}`}>
            <Icon d="M17.75 4.09l-2.53 1.94.91 3.06-2.63-1.81-2.63 1.81.91-3.06-2.53-1.94 3.17-.09L12 1l1.03 3z|M5 7.5h.01M2 9.5h.01M7 2h.01" size={12} />
            {sleepTimer ? (sleepLeft !== null ? `${fmt(sleepLeft)}` : `${sleepTimer}m`) : "Sleep"}
          </button>
          {showSleep && (
            <SleepMenu current={sleepTimer} left={sleepLeft} onSet={setSleep} onClose={() => setShowSleep(false)} />
          )}
        </div>

        {chapters.length > 0 && (
          <button onClick={() => setShowChaps(v => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors
              ${showChaps ? "border-teal/40 bg-teal/10 text-teal" : "border-edge text-mist hover:text-foam hover:border-foam/40"}`}>
            <Icon d="M4 6h16M4 12h16M4 18h7" size={12} />
            Chapters
          </button>
        )}
      </div>

      {/* Chapter list */}
      {showChaps && chapters.length > 0 && (
        <div className="rounded-2xl border border-edge bg-surface/60 p-4">
          <ChapterList chapters={chapters} position={position} duration={duration} onSeek={seek} />
        </div>
      )}
    </div>
  );
}
