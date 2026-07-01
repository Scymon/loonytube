"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Ribbon from "@/components/Ribbon";
import SiteFooter from "@/components/SiteFooter";
import CreateModal from "@/components/create/CreateModal";
import type { NavSlotOverride, RibbonShortcut, FooterSection } from "@/components/admin/NavLinksEditor";

// Three ribbon snap positions (px from left edge)
const SNAP_CLOSED = 0;
const SNAP_ICON   = 72;
const SNAP_FULL   = 264;
const SNAPS       = [SNAP_CLOSED, SNAP_ICON, SNAP_FULL];
// Midpoints between snaps — crossing these switches mode during drag
const MID_CLOSE_ICON = (SNAP_CLOSED + SNAP_ICON) / 2;  // 36
const MID_ICON_FULL  = (SNAP_ICON   + SNAP_FULL) / 2;  // 168

function modeFromX(x: number): [boolean, boolean] {
  if (x < MID_CLOSE_ICON) return [false, false]; // closed
  if (x < MID_ICON_FULL)  return [true,  false]; // icon
  return [true, true];                            // expanded
}

export default function AppShell({ children, fullWidth = true, siteName, logoUrl, navSlotOverrides = [], ribbonShortcuts = [], ribbonFixedHidden = [], footerSections = [] }: { children: React.ReactNode; fullWidth?: boolean; siteName?: string; logoUrl?: string | null; navSlotOverrides?: NavSlotOverride[]; ribbonShortcuts?: RibbonShortcut[]; ribbonFixedHidden?: string[]; footerSections?: FooterSection[] }) {
  const [open,     setOpen]     = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [liveShortcuts,   setLiveShortcuts]   = useState<RibbonShortcut[]>(ribbonShortcuts);
  const [liveFixedHidden, setLiveFixedHidden] = useState<string[]>(ribbonFixedHidden);

  // Drag handle state
  const isDraggingRef  = useRef(false);
  const startXRef      = useRef(0);
  const startEdgeRef   = useRef(0); // ribbon right-edge px at drag start
  const openRef        = useRef(false);
  const expandedRef    = useRef(false);
  openRef.current      = open;
  expandedRef.current  = expanded;

  useEffect(() => {
    try {
      setOpen(localStorage.getItem("lt-ribbon-open") === "1");
      setExpanded(localStorage.getItem("lt-ribbon-expanded") === "1");
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail === "object" && !Array.isArray(detail)) {
        if (Array.isArray(detail.shortcuts)) setLiveShortcuts(detail.shortcuts as RibbonShortcut[]);
        if (Array.isArray(detail.fixedHidden)) setLiveFixedHidden(detail.fixedHidden as string[]);
      }
    }
    window.addEventListener("lt:ribbon-shortcuts", handler);
    return () => window.removeEventListener("lt:ribbon-shortcuts", handler);
  }, []);

  useEffect(() => {
    function update() {
      const isLg = window.matchMedia("(min-width: 1024px)").matches;
      const w = open && isLg ? (expanded ? "264px" : "72px") : "0px";
      document.documentElement.style.setProperty("--sidebar-w", w);
    }
    update();
    const mq = window.matchMedia("(min-width: 1024px)");
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [open, expanded]);

  // Global drag events
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;
      const virtualEdge = Math.max(0, Math.min(SNAP_FULL, startEdgeRef.current + (e.clientX - startXRef.current)));
      const [o, ex] = modeFromX(virtualEdge);
      // Only persist if mode changed — avoids thrashing
      if (o !== openRef.current || ex !== expandedRef.current) persist(o, ex);
    }
    function onUp() {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(o: boolean, e: boolean) {
    setOpen(o); setExpanded(e);
    try {
      localStorage.setItem("lt-ribbon-open",     o ? "1" : "0");
      localStorage.setItem("lt-ribbon-expanded", e ? "1" : "0");
    } catch {}
  }

  function onHandleMouseDown(e: React.MouseEvent) {
    isDraggingRef.current = true;
    startXRef.current     = e.clientX;
    startEdgeRef.current  = open ? (expanded ? SNAP_FULL : SNAP_ICON) : SNAP_CLOSED;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }

  const ribbonEdgePx = open ? (expanded ? SNAP_FULL : SNAP_ICON) : SNAP_CLOSED;

  const pad = open ? (expanded ? "lg:pl-[264px]" : "lg:pl-[72px]") : "";
  const pathname   = usePathname();
  const isMessages = pathname.startsWith("/messages") || pathname.startsWith("/threads");
  const isWatch    = pathname.startsWith("/watch");

  return (
    <div className={isMessages ? "fixed inset-0 flex flex-col" : ""}>
      <Nav onLogoClick={() => persist(!open, expanded)} siteName={siteName} logoUrl={logoUrl} navSlotOverrides={navSlotOverrides} />
      <Ribbon
        open={open}
        expanded={expanded}
        onClose={() => persist(false, expanded)}
        onToggleExpand={() => persist(true, !expanded)}
        ribbonShortcuts={liveShortcuts}
        ribbonFixedHidden={liveFixedHidden}
      />

      {/* Drag handle — desktop only, sits on the ribbon's right edge */}
      <div
        className="fixed top-[57px] bottom-0 z-[61] hidden lg:block w-3 cursor-col-resize group"
        style={{ left: ribbonEdgePx - 6 }}
        onMouseDown={onHandleMouseDown}
        onDoubleClick={() => {
          // Toggle between icon (72px) and expanded (264px); open if closed
          persist(true, !expanded);
        }}
      >
        {/* Visible indicator line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-transparent group-hover:bg-teal/50 transition-colors" />
        {/* Grab dots */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {[0,1,2].map(i => <div key={i} className="h-1 w-1 rounded-full bg-teal/70" />)}
        </div>
      </div>

      <main className={
        isMessages ? `flex-1 min-h-0 overflow-hidden ${pad}`
        : isWatch  ? `px-4 pb-24 ${mounted ? "transition-[padding] duration-200" : ""} sm:px-6 ${pad}`
        : `px-4 py-6 pb-24 ${mounted ? "transition-[padding] duration-200" : ""} sm:px-6 md:pb-6 ${pad}`
      }>{fullWidth ? children : <div className="mx-auto w-full max-w-[1440px]">{children}</div>}</main>
      <SiteFooter sections={footerSections} siteName={siteName ?? "LoonyTube"} />
      <Suspense fallback={null}><CreateModal /></Suspense>
    </div>
  );
}
