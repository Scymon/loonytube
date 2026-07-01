"use client";

import { useState } from "react";
import AdminSwitches from "./AdminSwitches";
import InviteManager, { type Invite } from "./InviteManager";
import RoleManager, { type UserRow } from "./RoleManager";
import SiteConfigEditor, { type SiteConfig } from "./SiteConfigEditor";
import PageManager, { type CmsPage } from "./PageManager";
import NavLinksEditor, { type NavSlotOverride, type RibbonShortcut, type RibbonFixedHidden, type FooterSection } from "./NavLinksEditor";

type Settings  = { invite_only: boolean; signups_enabled: boolean; uploads_enabled: boolean; full_width: boolean };
type WaitlistRow = { email: string; created_at: string };

type Tab = "overview" | "site" | "pages" | "navigation" | "settings" | "invites" | "users";

type Props = {
  isSuper:        boolean;
  settings:       Settings;
  invites:        Invite[];
  waitlist:       WaitlistRow[];
  users:          UserRow[];
  selfId:         string;
  siteConfig:     SiteConfig;
  pages:          CmsPage[];
  navSlotOverrides:  NavSlotOverride[];
  ribbonShortcuts:   RibbonShortcut[];
  ribbonFixedHidden: RibbonFixedHidden;
  footerSections:    FooterSection[];
  stats:          { videos: number; users: number; posts: number; comments: number };
};

const TABS: { id: Tab; label: string; icon: string; superOnly?: boolean }[] = [
  { id: "overview",   label: "Overview",   icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "site",       label: "Site Config", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z|M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "pages",      label: "Pages",      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "navigation", label: "Navigation", icon: "M4 6h16M4 12h16M4 18h7" },
  { id: "settings",   label: "Settings",   icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
  { id: "invites",    label: "Invites",    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { id: "users",      label: "Users",      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", superOnly: true },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

function StatCard({ label, value, color = "text-foam" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-2xl border border-edge bg-surface p-5">
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-mist">{label}</p>
    </div>
  );
}

export default function AdminShell({
  isSuper, settings, invites, waitlist, users, selfId,
  siteConfig, pages: initialPages, navSlotOverrides, ribbonShortcuts, ribbonFixedHidden, footerSections, stats,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [pages, setPages] = useState(initialPages);
  const visibleTabs = TABS.filter(t => !t.superOnly || isSuper);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-57px)]">

      {/* ── Mobile: horizontal scrollable tab strip ── */}
      <div className="lg:hidden border-b border-edge bg-surface/50 overflow-x-auto">
        <div className="flex items-center gap-1 px-3 py-2 min-w-max">
          <span className="text-[11px] font-bold text-mist/40 uppercase tracking-wider pr-2 border-r border-edge mr-1">
            {isSuper ? "Super" : "Admin"}
          </span>
          {visibleTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? "bg-teal/10 text-teal"
                  : "text-mist hover:text-foam hover:bg-white/[0.04]"
              }`}
            >
              <Icon d={t.icon} />
              {t.label}
              {t.id === "invites" && waitlist.length > 0 && (
                <span className="rounded-full bg-sky/20 px-1 py-0.5 text-[9px] font-bold text-sky leading-none">
                  {waitlist.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop: sidebar tab nav ── */}
      <aside className="hidden lg:flex w-44 shrink-0 border-r border-edge bg-surface/50 py-3 flex-col self-start sticky top-[57px]">
        <div className="px-3 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-mist/40">{isSuper ? "Superadmin" : "Admin"}</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {visibleTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-teal/10 text-teal"
                  : "text-mist hover:text-foam hover:bg-white/[0.04]"
              }`}
            >
              <Icon d={t.icon} />
              {t.label}
              {t.id === "invites" && waitlist.length > 0 && (
                <span className="ml-auto rounded-full bg-sky/20 px-1.5 py-0.5 text-[10px] font-bold text-sky">
                  {waitlist.length}
                </span>
              )}
              {t.id === "pages" && pages.length > 0 && (
                <span className="ml-auto text-[10px] text-mist/40 tabular-nums">{pages.length}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Content area ── */}
      <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-7 overflow-y-auto">

        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-8 max-w-4xl">
            <div>
              <h2 className="text-2xl font-bold text-foam">Overview</h2>
              <p className="text-mist mt-1">Platform health at a glance.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Videos"   value={stats.videos}   color="text-teal" />
              <StatCard label="Users"    value={stats.users}    color="text-sky"  />
              <StatCard label="Posts"    value={stats.posts}    color="text-foam" />
              <StatCard label="Comments" value={stats.comments} color="text-foam" />
            </div>
            <div className="rounded-2xl border border-edge bg-surface p-6">
              <h3 className="font-semibold text-foam mb-4">Feature switches</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Signups",        settings.signups_enabled],
                  ["Uploads",        settings.uploads_enabled],
                  ["Invite-only",    settings.invite_only],
                  ["Full-width layout", settings.full_width],
                ].map(([label, on]) => (
                  <div key={label as string}
                    className="flex items-center justify-between rounded-xl border border-edge bg-panel/60 px-4 py-3">
                    <span className="text-sm text-mist">{label as string}</span>
                    <span className={`text-sm font-bold ${on ? "text-teal" : "text-red-400/80"}`}>
                      {on ? "On" : "Off"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Site Config */}
        {tab === "site" && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foam">Site configuration</h2>
              <p className="text-mist mt-1">Name, logo, tagline, and featured content.</p>
            </div>
            <SiteConfigEditor initial={siteConfig} />
          </div>
        )}

        {/* Pages */}
        {tab === "pages" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foam">Pages</h2>
              <p className="text-mist mt-1">Create and manage site pages with the visual page builder.</p>
            </div>
            <PageManager initial={pages} onPagesChange={setPages} />
          </div>
        )}

        {/* Navigation */}
        {tab === "navigation" && (
          <div className="max-w-3xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foam">Navigation & footer</h2>
              <p className="text-mist mt-1">
                Add links to pages or external URLs in the top nav, sidebar, and site footer.
              </p>
            </div>
            <NavLinksEditor
              initialNavSlotOverrides={navSlotOverrides}
              initialRibbonShortcuts={ribbonShortcuts}
              initialRibbonFixedHidden={ribbonFixedHidden}
              initialFooterSections={footerSections}
              pages={pages}
            />
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foam">Platform settings</h2>
              <p className="text-mist mt-1">Control signups, uploads, and access modes.</p>
            </div>
            <AdminSwitches initial={settings} canInviteOnly={isSuper} />
          </div>
        )}

        {/* Invites */}
        {tab === "invites" && (
          <div className="max-w-3xl space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foam">Invites & waitlist</h2>
              <p className="text-mist mt-1">Generate invite codes and review waitlist signups.</p>
            </div>
            <InviteManager initial={invites} uid={selfId} />
            <div>
              <h3 className="font-semibold text-foam mb-3 flex items-center gap-2">
                Waitlist
                {waitlist.length > 0 && (
                  <span className="rounded-full bg-sky/20 px-2 py-0.5 text-[11px] font-bold text-sky">
                    {waitlist.length}
                  </span>
                )}
              </h3>
              <div className="rounded-2xl border border-edge bg-surface p-4">
                {waitlist.length > 0 ? (
                  <ul className="divide-y divide-edge text-sm">
                    {waitlist.map(w => (
                      <li key={w.email} className="flex items-center justify-between py-2.5">
                        <span className="text-foam">{w.email}</span>
                        <span className="text-xs text-mist">{new Date(w.created_at).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="py-4 text-center text-sm text-mist">No waitlist signups yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Users (superadmin) */}
        {tab === "users" && isSuper && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foam">Users</h2>
              <p className="text-mist mt-1">Manage roles for platform members.</p>
            </div>
            <RoleManager initial={users} selfId={selfId} />
          </div>
        )}

      </main>
    </div>
  );
}
