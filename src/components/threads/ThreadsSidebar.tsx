"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function ThreadsSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-48 shrink-0 flex-col border-r border-edge bg-ink">
      <div className="px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-mist">Threads</p>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {sections.map((s) => {
          const active = pathname.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.soon ? "#" : s.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-edge text-foam"
                  : s.soon
                  ? "cursor-default text-mist/40"
                  : "text-mist hover:bg-edge/60 hover:text-foam"
              }`}
              aria-disabled={s.soon}
              onClick={s.soon ? (e) => e.preventDefault() : undefined}
            >
              {s.icon}
              <span>{s.label}</span>
              {s.soon && (
                <span className="ml-auto rounded text-[10px] font-medium text-mist/40">soon</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
