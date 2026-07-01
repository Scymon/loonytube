"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import RibbonSettings from "@/components/RibbonSettings";
import type { RibbonShortcut } from "@/components/admin/NavLinksEditor";

type SectionKey = "shortcuts" | "subscriptions" | "playlists" | "groups";
export type Sub = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };
type Network = { id: string; name: string; memberIds: string[] };

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

const SHORTCUTS_ALL      = [{ label: "Home", href: "/", icon: HOME }, { label: "Create", href: "/create", icon: PLUS }, { label: "Explore", href: "/explore", icon: EXPLORE }];
const SOON_SHORTCUTS_ALL = [{ label: "Saved", icon: SAVED }];

const PAGE_ICON = "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";

// Overlapping avatar stack used for network icons
function StackedAvatars({ subs, size = 26 }: { subs: Sub[]; size?: number }) {
  const shown = subs.slice(0, 3);
  const overlap = Math.round(size * 0.32);
  const step = size - overlap;
  const totalW = size + (shown.length - 1) * step;
  return (
    <div className="relative shrink-0" style={{ width: totalW, height: size }}>
      {shown.map((s, i) => (
        <div key={s.id} className="absolute rounded-full ring-[2px] ring-panel"
          style={{ left: i * step, zIndex: i + 1 }}>
          <Avatar name={s.full_name || s.username} src={s.avatar_url} size={size} />
        </div>
      ))}
    </div>
  );
}

export default function Ribbon({
  open, expanded, onClose, onToggleExpand, ribbonShortcuts = [], ribbonFixedHidden = [],
}: { open: boolean; expanded: boolean; onClose: () => void; onToggleExpand: () => void; ribbonShortcuts?: RibbonShortcut[]; ribbonFixedHidden?: string[] }) {
  const supabase = createClient();
  const SHORTCUTS      = SHORTCUTS_ALL.filter(s => !ribbonFixedHidden.includes(s.label));
  const SOON_SHORTCUTS = SOON_SHORTCUTS_ALL.filter(s => !ribbonFixedHidden.includes(s.label));

  const [visible,         setVisible]         = useState<Record<SectionKey, boolean>>(DEFAULT_VISIBLE);
  const [settingsOpen,    setSettingsOpen]    = useState(false);
  const [subs,            setSubs]            = useState<Sub[]>([]);
  const [signedIn,        setSignedIn]        = useState(false);
  const [subOrder,        setSubOrder]        = useState<string[]>([]);
  const [hidden,          setHidden]          = useState<Set<string>>(new Set());
  const [dragSrc,         setDragSrc]         = useState<number | null>(null);
  const [dragGroupTarget, setDragGroupTarget] = useState<string | null>(null); // sub ID hovered for grouping
  const [ctxMenu,         setCtxMenu]         = useState<{ x: number; y: number; id: string; netId?: string } | null>(null);
  const [networks,        setNetworks]        = useState<Network[]>([]);
  const [namingNetId,     setNamingNetId]     = useState<string | null>(null);
  const [namingDraft,     setNamingDraft]     = useState("");
  const [openNetId,       setOpenNetId]       = useState<string | null>(null); // carousel in icon rail
  const [showFull,        setShowFull]        = useState(expanded);

  const ctxRef       = useRef<HTMLDivElement>(null);
  const carouselRef  = useRef<HTMLDivElement>(null);
  const dragSrcIdRef = useRef<string | null>(null);

  // ── Hydrate from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const rs = localStorage.getItem("lt-ribbon-sections");
      if (rs) setVisible({ ...DEFAULT_VISIBLE, ...JSON.parse(rs) });
      const ro = localStorage.getItem("lt-ribbon-sub-order");
      if (ro) setSubOrder(JSON.parse(ro));
      const rh = localStorage.getItem("lt-ribbon-hidden-subs");
      if (rh) setHidden(new Set(JSON.parse(rh)));
      const rn = localStorage.getItem("lt-ribbon-networks");
      if (rn) setNetworks(JSON.parse(rn));
    } catch {}
  }, []);

  // ── Fetch subscriptions ────────────────────────────────────────────────────
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

  // ── Context menu close-on-outside ──────────────────────────────────────────
  useEffect(() => {
    if (!ctxMenu) return;
    function h(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ctxMenu]);

  // ── Carousel close-on-outside ──────────────────────────────────────────────
  useEffect(() => {
    if (!openNetId) return;
    function h(e: MouseEvent) {
      if (carouselRef.current && !carouselRef.current.contains(e.target as Node)) {
        setOpenNetId(null);
        setNamingNetId(null);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openNetId]);

  // ── Delayed text reveal on expand ──────────────────────────────────────────
  useEffect(() => {
    if (expanded) {
      const t = setTimeout(() => setShowFull(true), 180);
      return () => clearTimeout(t);
    } else {
      setShowFull(false);
    }
  }, [expanded]);

  // ── Derived: subs in any network ──────────────────────────────────────────
  const networkedSubIds = new Set(networks.flatMap(n => n.memberIds));

  const sortedSubs = (() => {
    const ordered = subOrder.length
      ? [...subOrder.map(id => subs.find(s => s.id === id)).filter(Boolean) as Sub[],
         ...subs.filter(s => !subOrder.includes(s.id))]
      : [...subs];
    return ordered.filter(s => !hidden.has(s.id) && !networkedSubIds.has(s.id));
  })();
  const hiddenList = subs.filter(s => hidden.has(s.id));

  // ── Network helpers ────────────────────────────────────────────────────────
  function saveNetworks(nets: Network[]) {
    setNetworks(nets);
    try { localStorage.setItem("lt-ribbon-networks", JSON.stringify(nets)); } catch {}
  }
  function createNetwork(subIdA: string, subIdB: string) {
    const id = crypto.randomUUID();
    saveNetworks([...networks, { id, name: "Network", memberIds: [subIdA, subIdB] }]);
    setNamingDraft("Network");
    setNamingNetId(id);
  }
  function addSubToNetwork(netId: string, subId: string) {
    saveNetworks(networks.map(n => n.id === netId ? { ...n, memberIds: [...n.memberIds, subId] } : n));
  }
  function confirmNetworkName(id: string, name: string) {
    saveNetworks(networks.map(n => n.id === id ? { ...n, name: name.trim() || "Network" } : n));
    setNamingNetId(null);
  }
  function removeSubFromNetwork(netId: string, subId: string) {
    const updated = networks
      .map(n => n.id === netId ? { ...n, memberIds: n.memberIds.filter(id => id !== subId) } : n)
      .filter(n => n.memberIds.length >= 2);
    saveNetworks(updated);
  }
  function dissolveNetwork(netId: string) {
    saveNetworks(networks.filter(n => n.id !== netId));
  }

  // ── Sub order / visibility helpers ────────────────────────────────────────
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

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function onDragStart(idx: number) {
    setDragSrc(idx);
    dragSrcIdRef.current = sortedSubs[idx]?.id ?? null;
  }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragSrc === null || !dragSrcIdRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const isCenter = relY > rect.height * 0.22 && relY < rect.height * 0.78;
    const hoveredSub = sortedSubs[idx];

    if (isCenter && hoveredSub && hoveredSub.id !== dragSrcIdRef.current) {
      // Group mode — show merge ring, don't reorder
      setDragGroupTarget(hoveredSub.id);
    } else {
      // Reorder mode
      setDragGroupTarget(null);
      if (dragSrc === idx) return;
      const next = [...sortedSubs];
      const [moved] = next.splice(dragSrc, 1);
      next.splice(idx, 0, moved);
      setDragSrc(idx);
      saveOrder(next.map(s => s.id));
    }
  }
  function onDragEnd() {
    const srcId = dragSrcIdRef.current;
    const tgtId = dragGroupTarget;
    if (srcId && tgtId && srcId !== tgtId) {
      const targetNetwork = networks.find(n => n.memberIds.includes(tgtId));
      if (targetNetwork) addSubToNetwork(targetNetwork.id, srcId);
      else createNetwork(srcId, tgtId);
    }
    setDragGroupTarget(null);
    setDragSrc(null);
    dragSrcIdRef.current = null;
  }
  function onCtxMenu(e: React.MouseEvent, id: string, netId?: string) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, id, netId });
  }

  // ── Shared sub-components ─────────────────────────────────────────────────
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
      className={`transition-all duration-100 ${dragSrc === idx ? "opacity-40" : ""} ${dragGroupTarget === s.id ? "ring-2 ring-teal rounded-lg bg-teal/5" : ""}`}>
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
        {showFull && <span>Collapse</span>}
      </button>
      <button onClick={() => setSettingsOpen((v) => !v)} title="Ribbon settings"
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-mist hover:bg-edge/60 hover:text-foam ${expanded ? "" : "justify-center"}`}>
        <Glyph d={GEAR} />
        {showFull && <span>Ribbon settings</span>}
      </button>
    </div>
  );

  // ── Icon rail ──────────────────────────────────────────────────────────────
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
          {ribbonShortcuts.map((sc) => (
            <RailBtn key={sc.id} title={sc.label} href={sc.href}>
              <Glyph d={PAGE_ICON} />
            </RailBtn>
          ))}
          <span className="my-1 h-px w-8 bg-edge" />
        </>
      )}
      {visible.subscriptions && (
        <>
          {/* Network icons */}
          {networks.map(net => {
            const members = subs.filter(s => net.memberIds.includes(s.id));
            if (!members.length) return null;
            const isOpen = openNetId === net.id;
            return (
              <button key={net.id} title={net.name}
                onClick={() => { setOpenNetId(isOpen ? null : net.id); if (isOpen) setNamingNetId(null); }}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition hover:bg-edge/60 ${isOpen ? "bg-edge/60 ring-1 ring-teal/50" : ""}`}>
                <StackedAvatars subs={members} size={26} />
              </button>
            );
          })}

          {/* Lone sub avatars */}
          {sortedSubs.length > 0
            ? sortedSubs.map((s, idx) => (
                <Link key={s.id} href={s.username ? `/@${s.username}` : "/"} onClick={onClose}
                  title={s.full_name || s.username || "channel"} draggable
                  onDragStart={() => onDragStart(idx)} onDragOver={(e) => onDragOver(e, idx)}
                  onDragEnd={onDragEnd} onContextMenu={(e) => onCtxMenu(e, s.id)}
                  className={`rounded-full ring-1 cursor-grab active:cursor-grabbing transition-all duration-100
                    ${dragSrc === idx ? "opacity-40 scale-95" : ""}
                    ${dragGroupTarget === s.id
                      ? "ring-teal ring-[3px] scale-110 brightness-110"
                      : "ring-edge hover:ring-teal"}`}>
                  <Avatar name={s.full_name || s.username} src={s.avatar_url} size={44} />
                </Link>
              ))
            : networks.length === 0 && (
                <RailBtn title={signedIn ? "No subscriptions yet" : "Sign in for subscriptions"} onClick={onToggleExpand}>
                  <Glyph d={GROUPS} />
                </RailBtn>
              )
          }
        </>
      )}
      {visible.playlists && <RailBtn title="Playlists" onClick={onToggleExpand}><Glyph d={PLAYLIST} /></RailBtn>}
      {visible.groups    && <RailBtn title="Groups"    onClick={onToggleExpand}><Glyph d={GROUPS}   /></RailBtn>}
    </nav>
  );

  // ── Full expanded view ────────────────────────────────────────────────────
  const fullView = (
    <nav className="flex-1 overflow-y-auto px-2 pb-3">
      {visible.shortcuts && (
        <div>
          <Header>Shortcuts</Header>
          {SHORTCUTS.map((s) => <Row key={s.label} icon={s.icon} label={s.label} href={s.href} />)}
          {SOON_SHORTCUTS.map((s) => <Row key={s.label} icon={s.icon} label={s.label} soon />)}
          {ribbonShortcuts.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-mist/40">Pages</p>
              {ribbonShortcuts.map((sc) => <Row key={sc.id} icon={PAGE_ICON} label={sc.label} href={sc.href} />)}
            </>
          )}
        </div>
      )}
      {visible.subscriptions && (
        <div>
          <Header>Subscriptions</Header>

          {/* Networks */}
          {networks.map(net => {
            const members = subs.filter(s => net.memberIds.includes(s.id));
            if (!members.length) return null;
            return (
              <div key={net.id} className="mb-2">
                {/* Network header row */}
                <div className="group flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-edge/30">
                  <StackedAvatars subs={members} size={20} />
                  {namingNetId === net.id ? (
                    <input
                      autoFocus
                      value={namingDraft}
                      onChange={e => setNamingDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") confirmNetworkName(net.id, namingDraft);
                        if (e.key === "Escape") setNamingNetId(null);
                      }}
                      onBlur={() => confirmNetworkName(net.id, namingDraft)}
                      className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-foam outline-none"
                    />
                  ) : (
                    <button onClick={() => { setNamingDraft(net.name); setNamingNetId(net.id); }}
                      className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-mist hover:text-foam">
                      {net.name}
                    </button>
                  )}
                  <button onClick={() => dissolveNetwork(net.id)} title="Dissolve network"
                    className="shrink-0 text-mist opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100">
                    <Glyph d="M6 6l12 12M18 6L6 18" size={13} />
                  </button>
                </div>
                {/* Network members */}
                {members.map(s => (
                  <div key={s.id} onContextMenu={(e) => onCtxMenu(e, s.id, net.id)}>
                    <Link href={s.username ? `/@${s.username}` : "/"} onClick={onClose}
                      className="flex items-center gap-3 rounded-lg py-1.5 pl-8 pr-3 text-xs text-foam hover:bg-edge/60">
                      <Avatar name={s.full_name || s.username} src={s.avatar_url} size={18} />
                      <span className="truncate">{s.full_name || s.username || "channel"}</span>
                    </Link>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Lone subs */}
          {sortedSubs.length > 0
            ? sortedSubs.map((s, idx) => <SubItem key={s.id} s={s} idx={idx} />)
            : networks.length === 0 && (
                <p className="px-3 py-2 text-xs text-mist/70">
                  {signedIn ? "No subscriptions yet." : "Sign in to see subscriptions."}
                </p>
              )
          }
        </div>
      )}
      {visible.playlists && (<div><Header>Playlists</Header><p className="px-3 py-2 text-xs text-mist/70">Your playlists appear on the <a href="/playlist" className="text-teal hover:underline">Playlists page</a>.</p></div>)}
      {visible.groups    && (<div><Header>Groups</Header>   <p className="px-3 py-2 text-xs text-mist/70">Groups coming soon.</p></div>)}
    </nav>
  );

  // ── Network carousel (icon-rail mode) ─────────────────────────────────────
  const carouselLeft = expanded ? 272 : 80;
  const activeNet = openNetId ? networks.find(n => n.id === openNetId) : null;
  const carousel = activeNet ? (
    <div ref={carouselRef}
      className="fixed top-[57px] z-[70] overflow-hidden rounded-xl border border-edge bg-panel shadow-2xl"
      style={{ left: carouselLeft }}>
      {/* Header with network name */}
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        {namingNetId === activeNet.id ? (
          <input
            autoFocus
            value={namingDraft}
            onChange={e => setNamingDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") confirmNetworkName(activeNet.id, namingDraft);
              if (e.key === "Escape") setNamingNetId(null);
            }}
            onBlur={() => confirmNetworkName(activeNet.id, namingDraft)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foam outline-none"
            placeholder="Network name"
          />
        ) : (
          <button onClick={() => { setNamingDraft(activeNet.name); setNamingNetId(activeNet.id); }}
            className="flex-1 text-left text-sm font-semibold text-foam hover:text-teal transition-colors">
            {activeNet.name}
          </button>
        )}
        <button onClick={() => { setOpenNetId(null); setNamingNetId(null); }}
          className="shrink-0 text-mist hover:text-foam transition-colors">
          <Glyph d="M6 6l12 12M18 6L6 18" size={14} />
        </button>
      </div>
      {/* Horizontal member carousel */}
      <div className="flex gap-1 overflow-x-auto p-2" style={{ maxWidth: 320 }}>
        {subs.filter(s => activeNet.memberIds.includes(s.id)).map(s => (
          <Link key={s.id} href={s.username ? `/@${s.username}` : "/"} onClick={() => { setOpenNetId(null); onClose(); }}
            className="flex shrink-0 flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-edge/60 transition-colors">
            <Avatar name={s.full_name || s.username} src={s.avatar_url} size={42} />
            <span className="w-[54px] truncate text-center text-[10px] text-mist">
              {s.full_name || s.username || "…"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  ) : null;

  // ── Naming popover (appears right after network creation, before carousel opens) ──
  const namingPopover = namingNetId && !openNetId ? (
    <div className="fixed top-[57px] z-[70] rounded-xl border border-edge bg-panel p-3 shadow-2xl"
      style={{ left: carouselLeft }}>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist">Name your network</p>
      <input
        autoFocus
        value={namingDraft}
        onChange={e => setNamingDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") confirmNetworkName(namingNetId, namingDraft);
          if (e.key === "Escape") setNamingNetId(null);
        }}
        onBlur={() => confirmNetworkName(namingNetId, namingDraft)}
        className="w-48 rounded-lg border border-edge bg-surface px-3 py-1.5 text-sm text-foam outline-none focus:border-teal placeholder:text-mist/40"
        placeholder="e.g. Gaming, Art, News…"
      />
    </div>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
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
                {ctxMenu.netId ? (
                  <button onClick={() => { removeSubFromNetwork(ctxMenu.netId!, ctxMenu.id); setCtxMenu(null); }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-mist hover:bg-edge/60 hover:text-foam">
                    Remove from network
                  </button>
                ) : (
                  <button onClick={() => { toggleHidden(ctxMenu.id, true); setCtxMenu(null); }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-mist hover:bg-edge/60 hover:text-foam">
                    Hide from ribbon
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}
      {open && <div className="fixed inset-0 top-[57px] z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside className={`fixed left-0 top-[57px] z-[60] flex h-[calc(100vh-57px)] flex-col border-r border-edge bg-panel transition-[transform,width] duration-200 ${
        expanded ? "w-[264px]" : "w-[72px]"
      } ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {showFull && (
          <div className="flex items-center justify-between border-b border-edge px-4 py-3">
            <p className="text-sm font-bold text-foam">Quick Access</p>
            <button onClick={onClose} aria-label="Close ribbon" className="text-mist hover:text-foam">
              <Glyph d="M6 6l12 12M18 6L6 18" />
            </button>
          </div>
        )}
        {showFull ? fullView : iconRail}
        {BottomBar}
      </aside>
      {carousel}
      {namingPopover}
    </>
  );
}
