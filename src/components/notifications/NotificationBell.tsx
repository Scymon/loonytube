"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { ago } from "@/lib/format";
import { NOTIF_VERB, notifHref, type Notif } from "@/lib/notif";

export default function NotificationBell() {
  const supabase = createClient();
  const [uid, setUid] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, [supabase]);

  const refetchCount = useCallback(async () => {
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
    setCount(count ?? 0);
  }, [supabase]);

  useEffect(() => {
    if (!uid) return;
    refetchCount();
    const ch = supabase.channel(`notif-bell-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, refetchCount)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, supabase, refetchCount]);

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      const { data } = await supabase.rpc("my_notifications", { p_limit: 8 });
      setItems((data ?? []) as Notif[]);
      setLoading(false);
      await supabase.from("notifications").update({ read: true }).eq("read", false);
      refetchCount();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} title="Notifications" aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-full text-mist hover:bg-edge/60 hover:text-foam">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4" />
        </svg>
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-loonred px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-edge bg-panel shadow-xl">
          <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
            <p className="font-bold text-foam">Notifications</p>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-teal hover:underline">See all</Link>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? <p className="px-4 py-8 text-center text-sm text-mist">…</p>
              : items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-mist">Nothing yet.</p>
              : items.map((n) => {
                const name = n.actor_name || n.actor_username || "Someone";
                const href = notifHref(n);
                const row = (
                  <div className={`flex items-center gap-3 px-4 py-2.5 ${!n.read ? "bg-sky/5" : ""}`}>
                    <Avatar name={name} src={n.actor_avatar} size={34} />
                    <p className="min-w-0 flex-1 text-sm text-foam">
                      <span className="font-semibold">{name}</span>{" "}
                      <span className="text-mist">{NOTIF_VERB[n.type] ?? "interacted with you"}</span>
                    </p>
                    <span className="shrink-0 text-[11px] text-mist">{ago(n.created_at)}</span>
                  </div>
                );
                return href
                  ? <Link key={n.id} href={href} onClick={() => setOpen(false)} className="block hover:bg-edge/30">{row}</Link>
                  : <div key={n.id}>{row}</div>;
              })}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)}
            className="block border-t border-edge px-4 py-2.5 text-center text-sm font-semibold text-teal hover:bg-edge/30">
            Open notifications
          </Link>
        </div>
      )}
    </div>
  );
}
