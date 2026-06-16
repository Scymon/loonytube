"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

type SectionKey = "shortcuts" | "subscriptions" | "playlists" | "groups";
const SECTION_LABELS: Record<SectionKey, string> = {
  shortcuts: "Shortcuts", subscriptions: "Subscriptions", playlists: "Playlists", groups: "Groups",
};
const DEFAULT_VISIBLE: Record<SectionKey, boolean> = {
  shortcuts: true, subscriptions: true, playlists: true, groups: true,
};

type Sub = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

function Glyph({ d, size = 18 }: { d: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{d.split("|").map((p, i) => <path key={i} d={p} />)}</svg>;
}

const HOME = "M3 11l9-8 9 8|M5 10v10h5v-6h4v6h5V10";
const PLUS = "M12 5v14|M5 12h14";
const EXPLORE = "M12 2a10 10 0 100 20 10 10 0 000-20z|M16 8l-2.5 5.5L8 16l2.5-5.5z";
const SAVED = "M6 3h12v18l-6-4-6 4z";
const PLAYLIST = "M4 6h11|M4 12h11|M4 18h7|M16 13l5 3-5 3z";
const GROUPS = "M9 11a3 3 0 100-6 3 3 0 000 6z|M2 20c0-3 3-5 7-5s7 2 7 5|M17 11a3 3 0 100-6|M22 20c0-2.5-2-4.2-5-4.7";
const GEAR = "M12 9a3 3 0 100 6 3 3 0 000-6z|M19.4 13a7 7 0 000-2l2-1.5-2-3.5-2.4 1a7 7 0 00-1.7-1L13 3h-4l-.3 2.5a7 7 0 00-1.7 1l-2.4-1-2 3.5L4.6 11a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7 7 0 001.7 1L9 21h4l.3-2.5a7 7 0 001.7-1l2.4 1 2-3.5z";

const SHORTCUTS = [{ label: "Home", href: "/", icon: HOME }, { label: "Create", href: "/create", icon: PLUS }];
const SOON_SHORTCUTS = [{ label: "Explore", icon: EXPLORE }, { label: "Saved", icon: SAVED }];

export default function Ribbon({
  open, expanded, onClose, onToggleExpand,
}: { open: boolean; expanded: boolean; onClose: () => void; onToggleExpand: () => void }) {
  const supabase = createClient();
  const [visible, setVisible] = useState<Record<SectionKey, boolean>>(DEFAULT_VISIBLE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem("lt-ribbon-sections"); if (raw) setVisible({ ...DEFAULT_VISIBLE, ...JSON.parse(raw) }); } catch {}
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

  function toggleSection(k: SectionKey) {
    setVisible((v) => { const n = { ...v, [k]: !v[k] }; try { localStorage.setItem("lt-ribbon-sections", JSON.stringify(n)); } catch {} return n; });
  }

  const SettingsPopover = (
    <div className={`absolute bottom-[96px] z-10 rounded-xl border border-edge bg-surface p-3 shadow-xl ${expanded ? "left-2 right-2" : "left-[72px] w-56"}`}>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist">Customize ribbon</p>
      {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => (
        <label key={k} className="flex cursor-pointer items-center justify-between py-1.5 text-sm text-foam">
          {SECTION_LABELS[k]}
          <input type="checkbox" checked={visible[k]} onChange={() => toggleSection(k)} className="h-4 w-4 accent-teal" />
        </label>
      ))}
    </div>
  );

  const BottomBar = (
    <div className="relative border-t border-edge p-2">
      {settingsOpen && SettingsPopover}
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

  const RailBtn = ({ title, href, onClick, children }: { title: string; href?: string; onClick?: () => void; children: React.ReactNode }) => {
    const cls = "grid h-11 w-11 place-items-center rounded-2xl bg-surface text-mist transition hover:rounded-xl hover:bg-edge hover:text-foam";
    return href
      ? <Link href={href} onClick={onClose} title={title} className={cls}>{children}</Link>
      : <button onClick={onClick} title={title} className={cls}>{children}</button>;
  };

  const iconRail = (
    <nav className="flex flex-1 flex-col items-center gap-2 overflow-y-auto py-3">
      {visible.shortcuts && (
        <>
          {SHORTCUTS.map((s) => <RailBtn key={s.label} title={s.label} href={s.href}><Glyph d={s.icon} /></RailBtn>)}
          {SOON_SHORTCUTS.map((s) => <span key={s.label} title={`${s.label} — coming soon`} className="grid h-11 w-11 place-items-center rounded-2xl bg-surface/50 text-mist/40"><Glyph d={s.icon} /></span>)}
          <span className="my-1 h-px w-8 bg-edge" />
        </>
      )}
      {visible.subscriptions && (subs.length > 0
        ? subs.map((s) => (
            <button key={s.id} title={s.full_name || s.username || "channel"} onClick={onToggleExpand} className="rounded-full ring-1 ring-edge hover:ring-teal">
              <Avatar name={s.full_name || s.username} src={s.avatar_url} size={44} />
            </button>
          ))
        : <RailBtn title={signedIn ? "No subscriptions yet" : "Sign in for subscriptions"} onClick={onToggleExpand}><Glyph d={GROUPS} /></RailBtn>)}
      {visible.playlists && <RailBtn title="Playlists" onClick={onToggleExpand}><Glyph d={PLAYLIST} /></RailBtn>}
      {visible.groups && <RailBtn title="Groups" onClick={onToggleExpand}><Glyph d={GROUPS} /></RailBtn>}
    </nav>
  );

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
          {subs.length > 0 ? subs.map((s) => (
            <div key={s.id} title="Channel pages coming soon" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foam">
              <Avatar name={s.full_name || s.username} src={s.avatar_url} size={22} />
              <span className="truncate">{s.full_name || s.username || "channel"}</span>
            </div>
          )) : <p className="px-3 py-2 text-xs text-mist/70">{signedIn ? "No subscriptions yet." : "Sign in to see subscriptions."}</p>}
        </div>
      )}
      {visible.playlists && (<div><Header>Playlists</Header><p className="px-3 py-2 text-xs text-mist/70">Playlists coming soon.</p></div>)}
      {visible.groups && (<div><Header>Groups</Header><p className="px-3 py-2 text-xs text-mist/70">Groups coming soon.</p></div>)}
    </nav>
  );

  return (
    <>
      {open && <div className="fixed inset-0 top-[57px] z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed left-0 top-[57px] z-40 flex h-[calc(100vh-57px)] flex-col border-r border-edge bg-panel transition-[transform,width] duration-200 ${
          expanded ? "w-[264px]" : "w-[72px]"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {expanded && (
          <div className="flex items-center justify-between border-b border-edge px-4 py-3">
            <p className="text-sm font-bold text-foam">Quick Access</p>
            <button onClick={onClose} aria-label="Close ribbon" className="text-mist hover:text-foam"><Glyph d="M6 6l12 12M18 6L6 18" /></button>
          </div>
        )}
        {expanded ? fullView : iconRail}
        {BottomBar}
      </aside>
    </>
  );
}
