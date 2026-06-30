"use client";
import { useEffect, useRef } from "react";
import type { PlayerMode } from "./useWatchPlayer";

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

type Opts = {
  enabled: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  muted: boolean;
  playbackRate: number;
  mode: PlayerMode;
  onTogglePlay: () => void;
  onSeekTo: (t: number) => void;
  onToggleMute: () => void;
  onSetRate: (r: number) => void;
  onFullscreen: () => void;
  onModeChange: (m: PlayerMode) => void;
  onOSD: (msg: string) => void;
  /** Navigate to previous video in this channel's queue */
  onPrev?: () => void;
  /** Navigate to next video in this channel's queue */
  onNext?: () => void;
  /** Move up to the previous channel */
  onChannelUp?: () => void;
  /** Move down to the next channel */
  onChannelDown?: () => void;
};

export function useKeyboardShortcuts(opts: Opts) {
  // Keep a live ref so the handler always sees current values
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    if (!opts.enabled) return;

    function handler(e: KeyboardEvent) {
      const o = ref.current;
      if (!o.enabled) return;

      // Skip when typing in inputs
      const t = e.target as HTMLElement;
      if (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable
      ) return;

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      switch (e.key) {
        /* ── Play / Pause ─────────────────────────────── */
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          o.onTogglePlay();
          o.onOSD(o.isPaused ? "\u25B6 Play" : "\u23F8 Pause");
          break;

        /* ── Prev video in channel (←) ────────────────── */
        case "ArrowLeft":
          e.preventDefault();
          o.onPrev?.();
          break;

        /* ── Next video in channel (→) ────────────────── */
        case "ArrowRight":
          e.preventDefault();
          o.onNext?.();
          break;

        /* ── Channel up (↑) ───────────────────────────── */
        case "ArrowUp":
          e.preventDefault();
          o.onChannelUp?.();
          break;

        /* ── Channel down (↓) ─────────────────────────── */
        case "ArrowDown":
          e.preventDefault();
          o.onChannelDown?.();
          break;

        /* ── Seek back 10s (J) ────────────────────────── */
        case "j":
        case "J":
          e.preventDefault();
          o.onSeekTo(Math.max(0, o.currentTime - 10));
          o.onOSD("\u23EA 10s");
          break;

        /* ── Seek forward 10s (L) ─────────────────────── */
        case "l":
        case "L":
          e.preventDefault();
          o.onSeekTo(Math.min(o.duration || 0, o.currentTime + 10));
          o.onOSD("\u23E9 10s");
          break;

        /* ── Mute ─────────────────────────────────────── */
        case "m":
        case "M":
          e.preventDefault();
          o.onToggleMute();
          o.onOSD(o.muted ? "\uD83D\uDD0A Unmuted" : "\uD83D\uDD07 Muted");
          break;

        /* ── Fullscreen ───────────────────────────────── */
        case "f":
        case "F":
          e.preventDefault();
          o.onFullscreen();
          break;

        /* ── Theatre ──────────────────────────────────── */
        case "t":
        case "T":
          e.preventDefault();
          o.onModeChange(o.mode === "theatre" ? "page" : "theatre");
          break;

        /* ── Speed down (,) ───────────────────────────── */
        case ",":
        case "<": {
          e.preventDefault();
          const idx = RATES.indexOf(o.playbackRate);
          const next = RATES[Math.max(0, idx - 1)];
          o.onSetRate(next);
          o.onOSD(`Speed: ${next === 1 ? "Normal" : next + "\xD7"}`);
          break;
        }

        /* ── Speed up (.) ─────────────────────────────── */
        case ".":
        case ">": {
          e.preventDefault();
          const idx = RATES.indexOf(o.playbackRate);
          const next = RATES[Math.min(RATES.length - 1, idx + 1)];
          o.onSetRate(next);
          o.onOSD(`Speed: ${next === 1 ? "Normal" : next + "\xD7"}`);
          break;
        }

        /* ── Jump to % (0-9) ──────────────────────────── */
        case "0": case "1": case "2": case "3": case "4":
        case "5": case "6": case "7": case "8": case "9":
          if (!o.duration) break;
          e.preventDefault();
          o.onSeekTo(o.duration * (parseInt(e.key, 10) / 10));
          o.onOSD(`${e.key}0%`);
          break;
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled]);
}
