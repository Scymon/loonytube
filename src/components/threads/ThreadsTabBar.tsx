"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/threads/dms",    label: "DMs",    soon: false },
  { href: "/threads/posts",  label: "Posts",  soon: true  },
  { href: "/threads/groups", label: "Groups", soon: true  },
];

export default function ThreadsTabBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden flex shrink-0 border-b border-edge bg-ink">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.soon ? "#" : t.href}
            onClick={t.soon ? (e) => e.preventDefault() : undefined}
            aria-disabled={t.soon}
            className={[
              "flex flex-1 items-center justify-center gap-1 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-b-2 border-sky text-foam"
                : t.soon
                ? "cursor-default text-mist/40"
                : "text-mist hover:text-foam",
            ].join(" ")}
          >
            {t.label}
            {t.soon && (
              <span className="rounded px-1 text-[9px] font-semibold uppercase tracking-wide text-mist/40">
                soon
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
