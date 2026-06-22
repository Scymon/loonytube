"use client";
import { useRef, useState } from "react";
import type { ExploreTab } from "@/components/explore/ExploreShell";

/* Line-style SVG paths — same strokeWidth="1.8" theme as Nav */
const TAB_ICONS: Record<string, { paths: string[]; viewBox?: string }> = {
  videos: {
    paths: [
      "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14V10z",
      "M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z",
    ],
  },
  posts: {
    paths: [
      "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7",
      "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    ],
  },
  articles: {
    paths: [
      "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z",
      "M14 2v6h6M16 13H8M16 17H8M10 9H8",
    ],
  },
};

const TABS: { key: ExploreTab; title: string }[] = [
  { key: "videos",   title: "Videos"   },
  { key: "posts",    title: "Posts"    },
  { key: "articles", title: "Articles" },
];

type Props = {
  activeTab: ExploreTab;
  onTabChange: (t: ExploreTab) => void;
  role: string | null;
  dark?: boolean;
};

function TabIcon({ tabKey }: { tabKey: string }) {
  const { paths } = TAB_ICONS[tabKey];
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export default function ExploreTabBar({ activeTab, onTabChange, role, dark }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSuper = role === "superadmin";

  return (
    /* Full-width sticky row — transparent so the pill appears to float */
    <div className="flex items-center justify-center gap-2 px-4 py-2.5">
      {/* Floating pill */}
      <div className={`pointer-events-auto flex items-center gap-0.5 rounded-2xl border px-2 shadow-xl backdrop-blur-md ${
          dark
            ? "border-white/15 bg-black/55"
            : "border-edge/60 bg-panel/75"
        }`}>
        {TABS.map(({ key, title }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              title={title}
              className={`relative grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                active ? "text-teal" : "text-mist hover:text-foam"
              }`}
            >
              <TabIcon tabKey={key} />
              {active && (
                <span className="absolute bottom-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-teal" />
              )}
            </button>
          );
        })}

        {/* Divider */}
        <span className="mx-1 h-5 w-px bg-edge/60" />

        {/* Three-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            title="More options"
            className="grid h-10 w-8 place-items-center rounded-xl text-mist transition-colors hover:text-foam"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5"  r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div
              className="absolute left-1/2 top-12 z-30 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-edge bg-panel shadow-xl"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div className="border-b border-edge px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mist">Preferences</p>
              </div>
              <button className="block w-full px-4 py-2.5 text-left text-sm text-foam hover:bg-edge/60">
                Filter my Explore feed
              </button>
              <button className="block w-full px-4 py-2.5 text-left text-sm text-foam hover:bg-edge/60">
                Hide a content type
              </button>
              {isSuper && (
                <>
                  <div className="mt-1 border-t border-edge px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky">SuperAdmin</p>
                  </div>
                  <button className="block w-full px-4 py-2.5 text-left text-sm text-sky hover:bg-edge/60">
                    Manage content type tabs
                  </button>
                  <button className="block w-full px-4 py-2.5 text-left text-sm text-sky hover:bg-edge/60">
                    Reorder / rename tabs
                  </button>
                  <button className="block w-full px-4 py-2.5 text-left text-sm text-sky hover:bg-edge/60">
                    Add custom content type
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
