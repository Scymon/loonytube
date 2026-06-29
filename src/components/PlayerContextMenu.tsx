"use client";
import { useEffect, useRef } from "react";

type Props = {
  x: number;
  y: number;
  onClose: () => void;
  loop: boolean;
  onToggleLoop: () => void;
  playbackRate: number;
  onSetRate: (r: number) => void;
  currentTime: number;
  videoId: string;
};

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function Item({
  onClick,
  children,
  className = "",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-[7px] text-left text-sm text-white hover:bg-white/10 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export default function PlayerContextMenu({
  x, y, onClose,
  loop, onToggleLoop,
  playbackRate, onSetRate,
  currentTime, videoId,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Adjust position so menu stays inside viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    let lx = x, ly = y;
    if (lx + width  > window.innerWidth  - 8) lx = x - width;
    if (ly + height > window.innerHeight - 8) ly = y - height;
    el.style.left = `${Math.max(8, lx)}px`;
    el.style.top  = `${Math.max(8, ly)}px`;
  }, [x, y]);

  // Close on outside click or Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent)  { if (e.key === "Escape") onClose(); }
    function onDown(e: MouseEvent)    {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown",   onKey,  true);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("keydown",   onKey,  true);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [onClose]);

  function copyUrl(withTime: boolean) {
    const base = `${window.location.origin}/watch/${videoId}`;
    const url  = withTime ? `${base}?t=${Math.floor(currentTime)}` : base;
    navigator.clipboard.writeText(url).catch(() => {});
    onClose();
  }

  const rateLabel = (r: number) => (r === 1 ? "Normal" : `${r}×`);

  return (
    <div
      ref={ref}
      onMouseDown={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
      className="fixed z-[200] min-w-56 overflow-visible rounded-2xl border border-white/10 bg-neutral-900/95 py-1.5 shadow-2xl backdrop-blur-md"
      style={{ left: x, top: y }}
    >
      {/* Loop toggle */}
      <Item onClick={() => { onToggleLoop(); onClose(); }}>
        <span className={`w-4 text-center text-xs ${loop ? "text-teal" : "text-transparent"}`}>✓</span>
        Loop
      </Item>

      {/* Speed — hover to reveal flyout */}
      <div className="group/spd relative">
        <Item className="cursor-default">
          <span className="w-4" />
          Playback speed
          <span className="ml-auto text-xs text-white/50">
            {rateLabel(playbackRate)}&nbsp;›
          </span>
        </Item>

        {/* flyout */}
        <div className="pointer-events-none absolute top-0 left-full hidden pl-1 group-hover/spd:pointer-events-auto group-hover/spd:block">
          <div className="min-w-36 rounded-2xl border border-white/10 bg-neutral-900/95 py-1.5 shadow-2xl backdrop-blur-md">
            {RATES.map(r => (
              <Item key={r} onClick={() => { onSetRate(r); onClose(); }}>
                <span className={`w-4 text-center text-xs ${playbackRate === r ? "text-teal" : "text-transparent"}`}>✓</span>
                {rateLabel(r)}
              </Item>
            ))}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="my-1.5 h-px bg-white/10" />

      {/* Copy URLs */}
      <Item onClick={() => copyUrl(false)}>
        <span className="w-4" />
        Copy video URL
      </Item>
      <Item onClick={() => copyUrl(true)}>
        <span className="w-4" />
        Copy video URL at current time
      </Item>
    </div>
  );
}
