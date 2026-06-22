"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NotifLevel = "all" | "personalized" | "none";

const LEVELS: { value: NotifLevel; label: string; desc: string }[] = [
  { value: "all",         label: "All",         desc: "Every upload & activity" },
  { value: "personalized",label: "Personalized", desc: "Highlights you'll likely enjoy" },
  { value: "none",        label: "None",        desc: "No notifications" },
];

function BellIcon({ level }: { level: NotifLevel }) {
  if (level === "none") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 5.64A9 9 0 0 0 3.28 14.4L2 22l7.6-1.28A9 9 0 0 0 21 11.64"/>
      <line x1="2" y1="2" x2="22" y2="22"/>
    </svg>
  );
  if (level === "personalized") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.92V4a1 1 0 0 0-2 0v1.08A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
  );
}

export default function FollowUserButton({
  targetId, signedIn, initialFollowing, initialNotifLevel = "all", variant = "link",
}: {
  targetId: string;
  signedIn: boolean;
  initialFollowing: boolean;
  initialNotifLevel?: NotifLevel;
  variant?: "link" | "solid";
}) {
  const supabase = createClient();
  const router   = useRouter();
  const [on,        setOn]        = useState(initialFollowing);
  const [level,     setLevelState] = useState<NotifLevel>(initialNotifLevel);
  const [busy,      setBusy]      = useState(false);
  const [bellOpen,  setBellOpen]  = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  async function getMe() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  async function toggle() {
    if (!signedIn) { router.push("/login"); return; }
    setBusy(true);
    const me = await getMe();
    if (!me) { setBusy(false); router.push("/login"); return; }
    if (on) {
      setOn(false);
      await supabase.from("follows").delete().eq("follower", me).eq("followee", targetId);
    } else {
      setOn(true);
      await supabase.from("follows").insert({ follower: me, followee: targetId, notif_level: level });
    }
    setBusy(false);
  }

  async function setLevel(next: NotifLevel) {
    setBellOpen(false);
    setLevelState(next);
    const me = await getMe();
    if (!me) return;
    await supabase.from("follows").update({ notif_level: next }).eq("follower", me).eq("followee", targetId);
  }

  // ── Link variant (inline text) ─────────────────────────────────────────────
  if (variant === "link") {
    return (
      <button onClick={toggle} disabled={busy}
        className={`text-sm font-semibold ${on ? "text-mist" : "text-link"} hover:underline`}>
        {on ? "Following" : "Follow"}
      </button>
    );
  }

  // ── Solid variant (channel page) ───────────────────────────────────────────
  if (!on) {
    return (
      <button onClick={toggle} disabled={busy}
        className="rounded-full px-5 py-2 text-sm font-bold text-ink disabled:opacity-50"
        style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
        Follow
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Following pill — click to unfollow */}
      <button onClick={toggle} disabled={busy}
        className="rounded-full border border-teal/40 bg-teal/10 px-5 py-2 text-sm font-semibold text-teal transition hover:border-loonred/40 hover:bg-loonred/10 hover:text-loonred disabled:opacity-50">
        Following
      </button>

      {/* Bell dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setBellOpen(o => !o)}
          aria-label="Notification level"
          className={`grid h-9 w-9 place-items-center rounded-full border transition ${
            level === "all"
              ? "border-teal/40 bg-teal/10 text-teal"
              : "border-edge text-mist hover:bg-edge/60 hover:text-foam"
          }`}
        >
          <BellIcon level={level} />
        </button>

        {bellOpen && (
          <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-edge bg-ink/95 py-1 shadow-xl backdrop-blur-sm">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-mist/50">
              Notifications
            </p>
            {LEVELS.map(({ value, label, desc }) => (
              <button key={value} onClick={() => setLevel(value)}
                className={`flex w-full flex-col px-3 py-2.5 text-left transition hover:bg-edge/40 ${
                  level === value ? "text-teal" : "text-foam"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {level === value && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {level !== value && <span className="w-[11px]" />}
                  {label}
                </span>
                <span className="ml-[19px] text-xs text-mist/60">{desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
