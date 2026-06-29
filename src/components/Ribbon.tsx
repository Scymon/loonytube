"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import RibbonSettings from "@/components/RibbonSettings";

type SectionKey = "shortcuts" | "subscriptions" | "playlists" | "groups";
export type Sub = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

const DEFAULT_VISIBLE: Record<SectionKey, boolean> = {
  shortcuts: true, subscriptions: true, playlists: true, groups: true,
};

function Glyph({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const HOME     = "M3 11l9-8 9 8|M5 10v10h5v-6h4v6h5V10";
const PLUS     = "M12 5v14|M5 12h14";
const EXPLORE  = "M12 2a10 10 0 100 20 10 10 0 000-20z|M16 8l-2.5 5.5L8 16l2.5-5.5z";
const SAVED    = "M6 3h12v18l-6-4-6 4z";
const PLAYLIST = "M4 6h11|M4 12h11|M4 18h7|M16 13l5 3-5 3z";
const GROUPS   = "M9 11a3 3 0 100-6 3 3 0 000 6z|M2 20c0-3 3-5 7-5s7 2 7 5|M17 11a3 3 0 100-6|M22 20c0-2.5-2-4.2-5-4.7";
const GEAR     = "M12 9a3 3 0 100 6 3 3 0 000-6z|M19.4 13a7 7 0 000-2l2-1.5-2-3.5-2.4 1a7 7 0 00-1.7-1L13 3h-4l-.3 2.5a7 7 0 00-1.7 1l-2.4-1-2 3.5L4.6 11a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7 7 0 001.7 1L9 21h4l.3-2.5a7 7 0 001.7-1l2.4 1 2-3.5z";

const SHORTCUTS      = [{ label: "Home", href: "/", icon: HOME }, { label: "Create", href: "/create", icon: PLUS }];
const SOON_SHORTCUTS = [{ label: "Explore", icon: EXPLORE }, { label: "Saved", icon: SAVED }];

export default function Ribbon({
  open, expanded, onClose, onToggleExpand,
}: { open: boolean; expanded: boolean; onClose: () => void; onToggleExpand: () => void }) {
  const supabase = createClient();
  const [visible,      setVisible]      = useState<Record<SectionKey, boolean>>(DEFAULT_VISIBLE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subs,         setSubs]         = useState<Sub[]>([]);
  const [signedIn,     setSignedIn]     = useState(false);
  const [subOrder,     setSubOrder]     = useState<string[]>([]);
  const [hidden,       setHidden]       = useState<Set<string>>(new Set());
  const [dragSrc,      setDragSrc]      = useState<number | null>(null);
  const [ctxMenu,      setCtxMenu]      = useState<{ x: number; y: number; id: string } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const rs = localStorage.getItem("lt-ribbon-sections");
      if (rs) setVisible({ ...DEFAULT_VISIBLE, ...JSON.parse(rs) });
      const ro = localStorage.getItem("lt-ribbon-sub-order");
      if (ro) setSubOrder(JSON.parse(ro));
      const rh = localStorage.getItem("lt-ribbon-hidden-subs");
      if (rh) setHidden(new Set(JSON.parse(rh)));
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      if (!user) return;
      const { data: f } = await supabase.from("follows").select("followee").eq("follower", user.id);
      const ids = (f ?? []).map((r) => r.followee as string);
      if (!ids.length) return;
      const { data: profs } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ids).limit(30);
      setSubs((profs ?? []) as Sub[]);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!ctxMenu) return;
    function h(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ctxMenu]);

  const sortedSubs = (() => {
    const ordered = subOrder.length
      ? [...subOrder.map(id => subs.find(s => s.id === id)).filter(Boolean) as Sub[],
         ...subs.filter(s => !subOrder.includes(s.id))]
      : [...subs];
    return ordered.filter(s => !hidden.has(s.id));
  })();
  const hiddenList = subs.filter(s => hidden.has(s.id));

  function saveOrder(order: string[]) {
    setSubOrder(order);
    try { localStorage.setItem("lt-ribbon-sub-order", JSON.stringify(order)); } catch {}
  }
  function toggleHidden(id: string, hide: boolean) {
    setHidden(prev => {
      const next = new Set(prev);
      hide ? next.add(id) : next.delete(id);
      try { localStorage.setItem("lt-ribbon-hidden-subs", JSON.stringify([...next])); } catch {}
      return next;
    });
  }
  function toggleSection(k: SectionKey) {
    setVisible(v => {
      const n = { ...v, [k]: !v[k] };
      try { localStorage.setItem("lt-ribbon-sections", JSON.stringify(n)); } catch {}
      return n;
    });
  }

  function onDragStart(idx: number) { setDragSrc(idx); }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragSrc === null || dragSrc === idx) return;
    const next = [...sortedSubs];
    const [moved] = next.splice(dragSrc, 1);
    next.splice(idx, 0, moved);
    setDragSrc(idx);
    saveOrder(next.map(s => s.id));
  }
  function onDragEnd() { setDragSrc(null); }
  function onCtxMenu(e: React.MouseEvent, id: string) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, id });
  }

  const RailBtn = ({ title, href, onClick, children }: { title: string; href?: string; onClick?: () => void; children: React.ReactNode }) => {
    const cls = "grid h-11 w-11 place-items-center rounded-2xl bg-surface text-mist transition hover:rounded-xl hover:bg-edge hover:text-foam";
    return href
      ? <Link href={href} onClick={onClose} title={title} className={cls}>{children}</Link>
      : <button onClick={onClick} title={title} className={cls}>{children}</button>;
  };

  const Header = ({ children }: { children: React.ReactNode }) => (
    <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-mist">{children}</p>
  );
  const Row = ({ icon, label, href, soon }: { icon: string; label: string; href?: string; soon?: boolean }) => {
    const body = (
      <span className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${soon ? "text-mist/60" : "text-foam hover:bg-edge/60"}`}>
        <span className="text-mist"><Glyph d={icon} /></span>
        <span className="flex-1 truncate">{label}</span>
        {soon && <span className="text-[10px] uppercase tracking-wide text-mist/50">soon</span>}
      </span>
    );
    return href ? <Link href={href} onClick={onClose}>{body}</Link> : <div title="Coming soon">{body}</div>;
  };

  const SubItem = ({ s, idx }: { s: Sub; idx: number }) => (
    <div draggable onDragStart={() => onDragStart(idx)} onDragOver={(e) => onDragOver(e, idx)} onDragEnd={onDragEnd}
      onContextMenu={(e) => onCtxMenu(e, s.id)}
      className={`transition-opacity ${dragSrc === idx ? "opacity-40" : ""}`}>
      <Link href={s.username ? `/@${s.username}` : "/"} onClick={onClose}
        className="flex cursor-grab items-center gap-3 rounded-lg px-3 py-2 text-sm text-foam hover:bg-edge/60 active:cursor-grabbing">
        <Avatar name={s.full_name || s.username} src={s.avatar_url} size={22} />
        <span className="truncate">{s.full_name || s.username || "channel"}</span>
      </Link>
    </div>
  );

  const BottomBar = (
    <div className="relative border-t border-edge p-2">
      {settingsOpen && (
        <RibbonSettings expanded={expanded} visible={visible} hiddenList={hiddenList}
          onToggleSection={toggleSection} onRestore={(id) => toggleHidden(id, false)} />
      )}
      <button onClick={onToggleExpand} title={expanded ? "Collapse ribbon" : "Expand ribbon"}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-mist hover:bg-edge/60 hover:text-foam ${expanded ? "" : "justify-center"}`}>
        <Glyph d={expanded ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
        {expanded && <span>Collapse</span>}
      </button>
      <button onClick={() => setSettingsOpen((v) => !v)} title="Ribbon settings"
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-mist hover:bg-edge/60 hover:text-foam ${expanded ? "" : "justify-center"}`}>
        <Glyph d={GEAR} />
        {expanded && <span>Ribbon settings</span>}
      </button>
    </div>
  );

  const iconRail = (
    <nav className="flex flex-1 flex-col items-center gap-2 overflow-y-auto py-3">
      {visible.shortcuts && (
        <>
          {SHORTCUTS.map((s) => <RailBtn key={s.label} title={s.label} href={s.href}><Glyph d={s.icon} /></RailBtn>)}
          {SOON_SHORTCUTS.map((s) => (
            <span key={s.label} title={`${s.label} — coming soon`} className="grid h-11 w-11 place-items-center rounded-2xl bg-surface/50 text-mist/40">
              <Glyph d={s.icon} />
            </span>
          ))}
          <span className="my-1 h-px w-8 bg-edge" />
        </>
      )}
      {visible.subscriptions && (sortedSubs.length > 0
        ? sortedSubs.map((s, idx) => (
            <Link key={s.id} href={s.username ? `/@${s.username}` : "/"} onClick={onClose}
              title={s.full_name || s.username || "channel"} draggable
              onDragStart={() => onDragStart(idx)} onDragOver={(e) => onDragOver(e, idx)}
              onDragEnd={onDragEnd} onContextMenu={(e) => onCtxMenu(e, s.id)}
              className={`rounded-full ring-1 ring-edge transition-opacity hover:ring-teal cursor-grab active:cursor-grabbing ${dragSrc === idx ? "opacity-40 scale-95" : ""}`}>
              <Avatar name={s.full_name || s.username} src={s.avatar_url} size={44} />
            </Link>
          ))
        : <RailBtn title={signedIn ? "No subscriptions yet" : "Sign in for subscriptions"} onClick={onToggleExpand}><Glyph d={GROUPS} /></RailBtn>
      )}
      {visible.playlists && <RailBtn title="Playlists" onClick={onToggleExpand}><Glyph d={PLAYLIST} /></RailBtn>}
      {visible.groups    && <RailBtn title="Groups"    onClick={onToggleExpand}><Glyph d={GROUPS}   /></RailBtn>}
    </nav>
  );

  const fullView = (
    <nav className="flex-1 overflow-y-auto px-2 pb-3">
      {visible.shortcuts && (
        <div>
          <Header>Shortcuts</Header>
          {SHORTCUTS.map((s) => <Row key={s.label} icon={s.icon} label={s.label} href={s.href} />)}
          {SOON_SHORTCUTS.map((s) => <Row key={s.label} icon={s.icon} label={s.label} soon />)}
        </div>
      )}
      {visible.subscriptions && (
        <div>
          <Header>Subscriptions</Header>
          {sortedSubs.length > 0
            ? sortedSubs.map((s, idx) => <SubItem key={s.id} s={s} idx={idx} />)
            : <p className="px-3 py-2 text-xs text-mist/70">{signedIn ? "No subscriptions yet." : "Sign in to see subscriptions."}</p>}
        </div>
      )}
      {visible.playlists && (<div><Header>Playlists</Header><p className="px-3 py-2 text-xs text-mist/70">Playlists coming soon.</p></div>)}
      {visible.groups    && (<div><Header>Groups</Header>   <p className="px-3 py-2 text-xs text-mist/70">Groups coming soon.</p></div>)}
    </nav>
  );

  return (
    <>
      {ctxMenu && (
        <div ref={ctxRef} className="fixed z-[100] min-w-[160px] overflow-hidden rounded-xl border border-edge bg-panel shadow-xl"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          {(() => {
            const sub = subs.find(s => s.id === ctxMenu.id);
            return (
              <>
                <Link href={sub?.username ? `/@${sub.username}` : "/"} onClick={() => { setCtxMenu(null); onClose(); }}
                  className="block px-4 py-2.5 text-sm text-foam hover:bg-edge/60">Visit channel</Link>
                <button onClick={() => { toggleHidden(ctxMenu.id, true); setCtxMenu(null); }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-mist hover:bg-edge/60 hover:text-foam">Hide from ribbon</button>
              </>
            );
          })()}
        </div>
      )}
      {open && <div className="fixed inset-0 top-[57px] z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside className={`fixed left-0 top-[57px] z-40 flex h-[calc(100vh-57px)] flex-col border-r border-edge bg-panel transition-[transform,width] duration-200 ${
        expanded ? "w-[264px]" : "w-[72px]"
      } ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {expanded && (
          <div className="flex items-center justify-between border-b border-edge px-4 py-3">
            <p className="text-sm font-bold text-foam">Quick Access</p>
            <button onClick={onClose} aria-label="Close ribbon" className="text-mist hover:text-foam">
              <Glyph d="M6 6l12 12M18 6L6 18" />
            </button>
          </div>
        )}
        {expanded ? fullView : iconRail}
        {BottomBar}
      </aside>
    </>
  );
}
