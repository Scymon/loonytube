"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

type SectionKey = "shortcuts" | "subscriptions" | "playlists" | "groups";
const SECTION_LABELS: Record<SectionKey, string> = {
  shortcuts: "Shortcuts",
  subscriptions: "Subscriptions",
  playlists: "Playlists",
  groups: "Groups",
};
const DEFAULT_VISIBLE: Record<SectionKey, boolean> = {
  shortcuts: true, subscriptions: true, playlists: true, groups: true,
};

type Sub = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

function Icon({ d, fill = "none" }: { d: string; fill?: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.7">{d.split("|").map((p, i) => <path key={i} d={p} />)}</svg>;
}

const SHORTCUTS = [
  { label: "Home", href: "/", icon: "M3 11l9-8 9 8|M5 10v10h5v-6h4v6h5V10" },
  { label: "Search", href: "/search", icon: "M11 4a7 7 0 100 14 7 7 0 000-14z|M21 21l-4-4" },
  { label: "Create", href: "/create", icon: "M12 5v14|M5 12h14" },
];
const SOON_SHORTCUTS = [
  { label: "Explore", icon: "M12 2a10 10 0 100 20 10 10 0 000-20z|M16 8l-2.5 5.5L8 16l2.5-5.5z" },
  { label: "Saved", icon: "M6 3h12v18l-6-4-6 4z" },
];

export default function Ribbon({ open, onClose }: { open: boolean; onClose: () => void }) {
  const supabase = createClient();
  const [visible, setVisible] = useState<Record<SectionKey, boolean>>(DEFAULT_VISIBLE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [signedIn, setSignedIn] = useState(false);

  // load saved section config
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lt-ribbon-sections");
      if (raw) setVisible({ ...DEFAULT_VISIBLE, ...JSON.parse(raw) });
    } catch {}
  }, []);

  // real subscriptions (channels the viewer follows)
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
    setVisible((v) => {
      const next = { ...v, [k]: !v[k] };
      try { localStorage.setItem("lt-ribbon-sections", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const Header = ({ children }: { children: React.ReactNode }) => (
    <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-mist">{children}</p>
  );
  const Row = ({ icon, label, href, soon }: { icon?: string; label: string; href?: string; soon?: boolean }) => {
    const body = (
      <span className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${soon ? "text-mist/60" : "text-foam hover:bg-edge/60"}`}>
        {icon && <span className="text-mist"><Icon d={icon} /></span>}
        <span className="flex-1 truncate">{label}</span>
        {soon && <span className="text-[10px] uppercase tracking-wide text-mist/50">soon</span>}
      </span>
    );
    return href ? <Link href={href} onClick={onClose}>{body}</Link> : <div title="Coming soon">{body}</div>;
  };

  return (
    <>
      {/* mobile backdrop */}
      {open && <div className="fixed inset-0 top-[57px] z-30 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-[57px] z-40 flex h-[calc(100vh-57px)] w-[264px] flex-col border-r border-edge bg-panel transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <p className="text-sm font-bold text-foam">Quick Access</p>
          <button onClick={onClose} aria-label="Close ribbon" className="text-mist hover:text-foam">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

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
              {subs.length > 0 ? (
                subs.map((s) => (
                  <div key={s.id} title="Channel pages coming soon" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foam">
                    <Avatar name={s.full_name || s.username} src={s.avatar_url} size={22} />
                    <span className="truncate">{s.full_name || s.username || "channel"}</span>
                  </div>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-mist/70">{signedIn ? "No subscriptions yet." : "Sign in to see subscriptions."}</p>
              )}
            </div>
          )}

          {visible.playlists && (
            <div>
              <Header>Playlists</Header>
              <p className="px-3 py-2 text-xs text-mist/70">Playlists coming soon.</p>
            </div>
          )}

          {visible.groups && (
            <div>
              <Header>Groups</Header>
              <p className="px-3 py-2 text-xs text-mist/70">Groups coming soon.</p>
            </div>
          )}
        </nav>

        {/* settings */}
        <div className="relative border-t border-edge px-2 py-2">
          {settingsOpen && (
            <div className="absolute bottom-[52px] left-2 right-2 rounded-xl border border-edge bg-surface p-3 shadow-xl">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist">Customize ribbon</p>
              {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => (
                <label key={k} className="flex cursor-pointer items-center justify-between py-1.5 text-sm text-foam">
                  {SECTION_LABELS[k]}
                  <input type="checkbox" checked={visible[k]} onChange={() => toggleSection(k)} className="h-4 w-4 accent-teal" />
                </label>
              ))}
            </div>
          )}
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-mist hover:bg-edge/60 hover:text-foam"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 00-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.4 1 2-3.5-2-1.5a7 7 0 00.1-1z" />
            </svg>
            Ribbon settings
          </button>
        </div>
      </aside>
    </>
  );
}
