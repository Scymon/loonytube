"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const sections = [
  {
    href: "/threads/dms",
    label: "DMs",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/threads/posts",
    label: "Posts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    soon: true,
  },
  {
    href: "/threads/groups",
    label: "Groups",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    soon: true,
  },
];

// Three snap widths mirroring the ribbon's three states
const SNAP_ICONS = 52;   // icon-only
const SNAP_FULL  = 192;  // labels + icons
const MID        = (SNAP_ICONS + SNAP_FULL) / 2; // 122


export default function ThreadsSidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(SNAP_FULL);
  const liveW          = useRef(SNAP_FULL);
  const isDraggingRef  = useRef(false);
  const startXRef      = useRef(0);
  const startWRef      = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lt:threads-sidebar-w");
      if (saved) {
        const w = parseInt(saved, 10) < MID ? SNAP_ICONS : SNAP_FULL;
        setWidth(w);
        liveW.current = w;
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;
      const w = Math.max(SNAP_ICONS, Math.min(SNAP_FULL, startWRef.current + (e.clientX - startXRef.current)));
      liveW.current = w;
      setWidth(w);
    }
    function onUp() {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const snapped = liveW.current < MID ? SNAP_ICONS : SNAP_FULL;
      liveW.current = snapped;
      setWidth(snapped);
      try { localStorage.setItem("lt:threads-sidebar-w", String(snapped)); } catch { /* noop */ }
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  function onDragStart(e: React.MouseEvent) {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = liveW.current;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }

  const closed   = false;
  const iconOnly = width < SNAP_FULL - 20;

  return (
    <aside
      className="relative hidden md:flex shrink-0 flex-col border-r border-edge bg-ink overflow-hidden transition-none"
      style={{ width }}
    >
      {/* Content — hidden when fully closed */}
      {!closed && (
        <>
          <div className={`py-4 ${iconOnly ? "flex justify-center" : "px-4"}`}>
            {iconOnly
              ? <span className="text-[9px] font-bold uppercase tracking-widest text-mist/40">···</span>
              : <p className="text-xs font-semibold uppercase tracking-widest text-mist">Threads</p>
            }
          </div>

          <nav className={`flex flex-col gap-0.5 ${iconOnly ? "px-1.5" : "px-2"}`}>
            {sections.map((s) => {
              const active = pathname.startsWith(s.href);
              return (
                <Link
                  key={s.href}
                  href={s.soon ? "#" : s.href}
                  title={iconOnly ? s.label : undefined}
                  aria-disabled={s.soon}
                  onClick={s.soon ? (e) => e.preventDefault() : undefined}
                  className={`flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors
                    ${iconOnly ? "justify-center px-2" : "gap-3 px-3"}
                    ${active ? "bg-edge text-foam"
                      : s.soon ? "cursor-default text-mist/40"
                      : "text-mist hover:bg-edge/60 hover:text-foam"}`}
                >
                  <span className="shrink-0">{s.icon}</span>
                  {!iconOnly && <span className="truncate">{s.label}</span>}
                  {!iconOnly && s.soon && (
                    <span className="ml-auto shrink-0 text-[10px] font-medium text-mist/40">soon</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {/* Drag handle — always present */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize group z-10"
        onMouseDown={onDragStart}
        onDoubleClick={() => {
          const next = width < SNAP_FULL - 20 ? SNAP_FULL : SNAP_ICONS;
          liveW.current = next;
          setWidth(next);
          try { localStorage.setItem("lt:threads-sidebar-w", String(next)); } catch { /* noop */ }
        }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-px bg-edge group-hover:bg-teal/60 group-active:bg-teal transition-colors" />
      </div>
    </aside>
  );
}
