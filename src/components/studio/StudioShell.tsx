"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import Nav from "@/components/Nav";
import Ribbon from "@/components/Ribbon";

type Prof = { username: string | null; full_name: string | null; avatar_url: string | null };

const NAV = [
  { href: "/studio", label: "Dashboard", icon: "M4 13h7V4H4zM13 20h7v-9h-7zM13 4v5h7V4zM4 20h7v-5H4z" },
  { href: "/studio/content", label: "Uploads", icon: "M4 5h16v14H4z|M10 9l5 3-5 3z" },
  { href: "/studio/posts", label: "Threads", icon: "M4 5h16v11H7l-3 3z" },
  { href: "/studio/scheduler", label: "Scheduler", icon: "M4 6h16v15H4z|M4 10h16|M8 3v4|M16 3v4" },
  { href: "/studio/profile", label: "Edit Profile", icon: "M12 12a4 4 0 100-8 4 4 0 000 8z|M4 21c0-4 4-6 8-6s8 2 8 6" },
];

function Glyph({ d }: { d: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{d.split("|").map((p, i) => <path key={i} d={p} />)}</svg>;
}

export default function StudioShell({ profile, children }: { profile: Prof; children: React.ReactNode }) {
  const pathname = usePathname();
  const name = profile.full_name || profile.username || "Your channel";
  const [ribbonOpen,     setRibbonOpen]     = useState(false);
  const [ribbonExpanded, setRibbonExpanded] = useState(false);

  useEffect(() => {
    try {
      setRibbonOpen(localStorage.getItem("lt-ribbon-open") === "1");
      setRibbonExpanded(localStorage.getItem("lt-ribbon-expanded") === "1");
    } catch {}
  }, []);

  function persistRibbon(o: boolean, e: boolean) {
    setRibbonOpen(o); setRibbonExpanded(e);
    try {
      localStorage.setItem("lt-ribbon-open", o ? "1" : "0");
      localStorage.setItem("lt-ribbon-expanded", e ? "1" : "0");
    } catch {}
  }

  // Keep --sidebar-w in sync so MiniAudioPlayer offsets correctly
  useEffect(() => {
    function update() {
      const isLg = window.matchMedia("(min-width: 1024px)").matches;
      const w = ribbonOpen && isLg ? (ribbonExpanded ? "264px" : "72px") : "0px";
      document.documentElement.style.setProperty("--sidebar-w", w);
    }
    update();
    const mq = window.matchMedia("(min-width: 1024px)");
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [ribbonOpen, ribbonExpanded]);

  return (
    <div className="min-h-screen text-foam" style={{ background: "#0d0d0f" }}>
      {/* consistent site top nav (shows "Studio" after the logo while in /studio) */}
      <Nav onLogoClick={() => persistRibbon(!ribbonOpen, ribbonExpanded)} />
      <Ribbon
        open={ribbonOpen}
        expanded={ribbonExpanded}
        onClose={() => persistRibbon(false, ribbonExpanded)}
        onToggleExpand={() => persistRibbon(true, !ribbonExpanded)}
        ribbonShortcuts={[]}
        ribbonFixedHidden={[]}
      />

      <div className="flex">
        {/* internal sidebar */}
        <aside className={`sticky top-[57px] hidden h-[calc(100vh-57px)] w-60 shrink-0 border-r border-edge px-3 py-5 sm:block transition-[margin] duration-200 ${ribbonOpen ? (ribbonExpanded ? "lg:ml-[264px]" : "lg:ml-[72px]") : ""}`}>
          <div className="mb-5 flex flex-col items-center px-2 text-center">
            <Avatar name={name} src={profile.avatar_url} size={72} />
            <p className="mt-2 font-bold">{name}</p>
            <p className="text-xs text-mist">@{profile.username ?? "you"}</p>
          </div>
          <nav className="space-y-1">
            {NAV.map((n) => {
              const active = n.href === "/studio" ? pathname === "/studio" : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    active ? "bg-surface text-foam" : "text-mist hover:bg-edge/50 hover:text-foam"}`}>
                  <Glyph d={n.icon} /> {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* mobile sidebar = horizontal scroll tabs */}
        <main className="min-w-0 flex-1">
          <div className="sticky top-[57px] z-30 flex gap-1 overflow-x-auto border-b border-edge px-4 py-2 sm:hidden" style={{ background: "#0d0d0f" }}>
            {NAV.map((n) => {
              const active = n.href === "/studio" ? pathname === "/studio" : pathname.startsWith(n.href);
              return <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-surface text-foam" : "text-mist"}`}>{n.label}</Link>;
            })}
          </div>
          <div className="px-5 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
