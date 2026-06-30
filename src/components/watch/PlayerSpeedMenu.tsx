"use client";
import { useEffect, useRef } from "react";

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const label  = (r: number) => r === 1 ? "Normal" : `${r}×`;

type Props = {
  anchor: DOMRect;
  rate: number;
  onSetRate: (r: number) => void;
  onClose: () => void;
};

export default function PlayerSpeedMenu({ anchor, rate, onSetRate, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent)  { if (e.key === "Escape") onClose(); }
    function onDown(e: MouseEvent)    { if (!ref.current?.contains(e.target as Node)) onClose(); }
    document.addEventListener("keydown",   onKey,  true);
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("keydown",   onKey,  true);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [onClose]);

  const menuW = 144;
  const left  = Math.max(8, Math.min(
    anchor.left + anchor.width / 2 - menuW / 2,
    window.innerWidth - menuW - 8
  ));
  const bottom = window.innerHeight - anchor.top + 8;

  return (
    <div
      ref={ref}
      className="fixed z-[200] min-w-36 rounded-2xl border border-white/10 bg-neutral-900/95 py-1.5 shadow-2xl backdrop-blur-md"
      style={{ left, bottom }}
      onMouseDown={e => e.stopPropagation()}
    >
      <p className="px-4 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">Speed</p>
      {RATES.map(r => (
        <button
          key={r}
          type="button"
          onClick={() => { onSetRate(r); onClose(); }}
          className="flex w-full items-center gap-3 px-4 py-[7px] text-left text-sm text-white hover:bg-white/10 transition-colors"
        >
          <span className={`w-4 text-center text-xs ${rate === r ? "text-teal" : "text-transparent"}`}>✓</span>
          {label(r)}
        </button>
      ))}
    </div>
  );
}
