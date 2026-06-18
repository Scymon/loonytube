"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import SearchBar from "@/components/SearchBar";

type IconKey = "home" | "explore" | "create" | "chat" | "schedule" | "profile";

const ICONS: Record<IconKey, string> = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  explore: "M12 2a10 10 0 100 20 10 10 0 000-20zM16 8l-2.5 5.5L8 16l2.5-5.5z",
  create: "M12 5v14M5 12h14",
  chat: "M4 5h16v11H8l-4 4z",
  schedule: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
  profile: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
};

function NavIcon({
  k,
  href,
  label,
  active,
  soon,
}: {
  k: IconKey;
  href?: string;
  label: string;
  active?: boolean;
  soon?: boolean;
}) {
  const inner = (
    <span
      className={`relative grid h-10 w-10 place-items-center rounded-full transition ${
        active ? "text-sky" : "text-mist hover:bg-edge/60 hover:text-foam"
      } ${k === "create" ? "border border-edge" : ""}`}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONS[k]} />
      </svg>
      {active && <span className="absolute -bottom-[14px] h-0.5 w-7 rounded-full bg-sky" />}
    </span>
  );
  if (soon || !href) {
    return (
      <button type="button" title={`${label} — coming soon`} aria-label={label}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href} aria-label={label} title={label}>
      {inner}
    </Link>
  );
}

export default function Nav({ onLogoClick }: { onLogoClick?: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_url, role")
          .eq("id", data.user.id)
          .maybeSingle();
        setName(p?.full_name || p?.username || data.user.email || null);
        setAvatar(p?.avatar_url ?? null);
        setRole(p?.role ?? null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setMenu(false);
    router.push("/welcome");
    router.refresh();
  }

  const is = (p: string) => pathname === p;
  const isStudio = pathname.startsWith("/studio");

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-panel/90 backdrop-blur">
      <div className="flex w-full items-center justify-between px-4 py-2.5 sm:px-6">
        {/* left: logo + icon rail */}
        <div className="flex items-center gap-1 sm:gap-2">
          {onLogoClick ? (
            <button onClick={onLogoClick} aria-label="Open menu ribbon" className="transition hover:brightness-110 active:scale-95">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/loony-logo.png" alt="LoonyTube" className="h-9 w-9 rounded-[10px] object-cover" />
            </button>
          ) : (
            <Link href="/" aria-label="LoonyTube home" className="transition hover:brightness-110">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/loony-logo.png" alt="LoonyTube" className="h-9 w-9 rounded-[10px] object-cover" />
            </Link>
          )}
          {isStudio && <span className="ml-1 mr-1 text-lg font-bold tracking-tight text-foam">Studio</span>}
          <nav className="ml-1 hidden items-center gap-1 md:flex">
            <NavIcon k="home" href="/" label="Home" active={is("/")} />
            <NavIcon k="explore" label="Explore" soon />
            <NavIcon k="create" href="/create" label="Create" active={is("/create")} />
            <NavIcon k="chat" label="Messages" soon />
            <NavIcon k="profile" label="Profile" soon />
          </nav>
        </div>

        {/* center: covert search — the whole empty space is the field */}
        <div className="mx-3 hidden flex-1 sm:mx-6 md:flex">
          <Suspense fallback={<div className="h-10 w-full" />}>
            <SearchBar />
          </Suspense>
        </div>

        {/* right: search icon, bell, avatar */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => document.getElementById("nav-search")?.focus()} title="Search" aria-label="Search" className="grid h-10 w-10 place-items-center rounded-full text-mist hover:bg-edge/60 hover:text-foam">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
            </svg>
          </button>
          <button title="Notifications — coming soon" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-full text-mist hover:bg-edge/60 hover:text-foam">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4" />
            </svg>
          </button>

          {email ? (
            <div className="relative ml-1" ref={menuRef}>
              <button onClick={() => setMenu((v) => !v)} aria-label="Account">
                <Avatar name={name} src={avatar} size={36} ring />
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-edge bg-panel shadow-xl">
                  <div className="border-b border-edge px-4 py-3">
                    <p className="truncate text-sm font-semibold text-foam">{name}</p>
                    <p className="truncate text-xs text-mist">{email}</p>
                  </div>
                  <Link href="/create" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-foam hover:bg-edge/60">
                    Upload a video
                  </Link>
                  <Link href="/studio" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-foam hover:bg-edge/60">
                    Creator Studio
                  </Link>
                  <Link href="/studio/profile" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-foam hover:bg-edge/60">
                    Edit Profile
                  </Link>
                  <Link href="/settings" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-foam hover:bg-edge/60">
                    Settings
                  </Link>
                  {(role === "admin" || role === "superadmin") && (
                    <Link href="/admin" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm font-semibold text-sky hover:bg-edge/60">
                      Admin console
                    </Link>
                  )}
                  <button onClick={signOut} className="block w-full px-4 py-2.5 text-left text-sm text-mist hover:bg-edge/60 hover:text-foam">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="ml-1 rounded-full border border-edge px-4 py-2 text-sm font-semibold text-foam hover:border-hair">
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
