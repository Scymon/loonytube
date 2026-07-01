"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Ribbon from "@/components/Ribbon";
import SiteFooter from "@/components/SiteFooter";
import CreateModal from "@/components/create/CreateModal";
import type { NavSlotOverride, RibbonShortcut, FooterSection } from "@/components/admin/NavLinksEditor";

export default function AppShell({ children, fullWidth = true, siteName, logoUrl, navSlotOverrides = [], ribbonShortcuts = [], ribbonFixedHidden = [], footerSections = [] }: { children: React.ReactNode; fullWidth?: boolean; siteName?: string; logoUrl?: string | null; navSlotOverrides?: NavSlotOverride[]; ribbonShortcuts?: RibbonShortcut[]; ribbonFixedHidden?: string[]; footerSections?: FooterSection[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [liveShortcuts,   setLiveShortcuts]   = useState<RibbonShortcut[]>(ribbonShortcuts);
  const [liveFixedHidden, setLiveFixedHidden] = useState<string[]>(ribbonFixedHidden);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem("lt-ribbon-open") === "1");
      setExpanded(localStorage.getItem("lt-ribbon-expanded") === "1");
    } catch {}
    setMounted(true);
  }, []);

  // Keep ribbon in sync when admin saves — no page reload needed
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

  // Sync --sidebar-w CSS variable so MiniAudioPlayer can offset itself
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

  function persist(o: boolean, e: boolean) {
    setOpen(o); setExpanded(e);
    try {
      localStorage.setItem("lt-ribbon-open", o ? "1" : "0");
      localStorage.setItem("lt-ribbon-expanded", e ? "1" : "0");
    } catch {}
  }

  const pad = open ? (expanded ? "lg:pl-[264px]" : "lg:pl-[72px]") : "";
  const pathname = usePathname();
  const isMessages = pathname.startsWith("/messages") || pathname.startsWith("/threads");
  // Watch page is a full-bleed video player — no px/py padding, just sidebar offset
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
      <main className={
        isMessages ? "flex-1 min-h-0 overflow-hidden"
        : isWatch  ? `px-4 pb-24 ${mounted ? "transition-[padding] duration-200" : ""} sm:px-6 ${pad}`
        : `px-4 py-6 pb-24 ${mounted ? "transition-[padding] duration-200" : ""} sm:px-6 md:pb-6 ${pad}`
      }>{fullWidth ? children : <div className="mx-auto w-full max-w-[1440px]">{children}</div>}</main>
      <SiteFooter sections={footerSections} siteName={siteName ?? "LoonyTube"} />
      <Suspense fallback={null}><CreateModal /></Suspense>
    </div>
  );
}
