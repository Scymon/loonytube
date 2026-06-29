"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import SearchBar from "@/components/SearchBar";
import NotificationBell from "@/components/notifications/NotificationBell";

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
  onClick,
}: {
  k: IconKey;
  href?: string;
  label: string;
  active?: boolean;
  soon?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <span
      className={`relative grid h-10 w-10 place-items-center rounded-full transition ${
        k === "create"
          ? "border border-teal/60 text-teal shadow-[0_0_10px_rgba(45,212,180,0.35)] hover:bg-teal/10 hover:shadow-[0_0_18px_rgba(45,212,180,0.55)]"
          : active ? "text-sky" : "text-mist hover:bg-edge/60 hover:text-foam"
      }`}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONS[k]} />
      </svg>
      {active && <span className="absolute -bottom-[14px] h-0.5 w-7 rounded-full bg-sky" />}
    </span>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} title={label}>
        {inner}
      </button>
    );
  }
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
  const openCreate = (tab: "video" | "post" | "article" = "video") =>
    router.push(`${pathname}?compose=${tab}`);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
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
        setUsername(p?.username ?? null);
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
    <>
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
            <NavIcon k="explore" href="/explore" label="Explore" active={pathname.startsWith("/explore")} />
            <NavIcon k="create" label="Create" onClick={() => openCreate()} active={pathname === "/create"} />
            <NavIcon k="chat" href="/threads" label="Messages" active={pathname.startsWith("/messages")} />
            <NavIcon k="profile" href="/dashboard" label="Dashboard" active={pathname.startsWith("/dashboard")} />
          </nav>
        </div>

        {/* center: covert search — the whole empty space is the field (all breakpoints) */}
        <div className="mx-3 flex flex-1 sm:mx-6">
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
          <NotificationBell />

          {email ? (
            <div className="relative ml-1" ref={menuRef}>
              <button onClick={() => setMenu((v) => !v)} aria-label="Account">
                <Avatar name={name} src={avatar} size={36} ring />
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-edge bg-panel shadow-xl">
                  <Link href={username ? `/@${username}` : "/dashboard"} onClick={() => setMenu(false)}
                    className="block border-b border-edge px-4 py-3 hover:bg-edge/40 transition">
                    <p className="truncate text-sm font-semibold text-teal">{name}</p>
                    <p className="truncate text-xs text-mist">@{username ?? email}</p>
                  </Link>
                  <button onClick={() => { setMenu(false); openCreate("video"); }} className="block w-full px-4 py-2.5 text-left text-sm text-foam hover:bg-edge/60">
                    Upload a video
                  </button>
                  <Link href="/dashboard" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-foam hover:bg-edge/60">
                    My Dashboard
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

      {/* ── Mobile bottom nav — hidden inside conversations & on md+ ── */}
      {!(pathname.startsWith("/messages/") || pathname.startsWith("/threads/dms/")) && (
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-edge bg-panel/95 backdrop-blur-md">
        <div className="relative flex items-center justify-around px-2 pt-2 pb-[env(safe-area-inset-bottom,8px)]">
          <Link href="/" aria-label="Home" className={`flex flex-col items-center gap-0.5 px-2 py-1 ${is("/") ? "text-sky" : "text-mist"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.home} /></svg>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/explore" aria-label="Explore" className={`flex flex-col items-center gap-0.5 px-2 py-1 ${pathname.startsWith("/explore") ? "text-sky" : "text-mist"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.explore} /></svg>
            <span className="text-[10px] font-medium">Explore</span>
          </Link>
          <div className="w-14" aria-hidden="true" />
          <Link href="/threads" aria-label="Threads" className={`flex flex-col items-center gap-0.5 px-2 py-1 ${pathname.startsWith("/threads") || pathname.startsWith("/messages") ? "text-sky" : "text-mist"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.chat} /></svg>
            <span className="text-[10px] font-medium">Threads</span>
          </Link>
          <Link href="/dashboard" aria-label="Dashboard" className={`flex flex-col items-center gap-0.5 px-2 py-1 ${pathname.startsWith("/dashboard") ? "text-sky" : "text-mist"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.profile} /></svg>
            <span className="text-[10px] font-medium">Dashboard</span>
          </Link>
          <button type="button" onClick={() => openCreate()} aria-label="Create"
            className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center gap-0.5">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-teal/60 bg-teal/10 text-teal shadow-[0_0_12px_rgba(58,214,189,0.2)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.create} /></svg>
            </span>
            <span className="text-[10px] font-medium text-teal">Create</span>
          </button>
        </div>
      </nav>
      )}
    </>
  );
}
