"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Fully covert search: no border, no background, no placeholder — the empty nav
// space just accepts typing. Typed text is cyan, 18px.
export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (pathname === "/search") setQ(params.get("q") ?? "");
  }, [pathname, params]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form onSubmit={submit} className="w-full">
      <input
        id="nav-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search LoonyTube"
        className="h-10 w-full border-0 bg-transparent px-4 text-[18px] text-loon caret-loon outline-none focus:outline-none"
      />
    </form>
  );
}
