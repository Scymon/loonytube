"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { ago } from "@/lib/format";

type Notif = {
  id: string; actor_id: string | null; actor_username: string | null; actor_name: string | null;
  actor_avatar: string | null; type: string; entity_type: string | null; entity_id: string | null;
  read: boolean; created_at: string;
};

const VERB: Record<string, string> = {
  follow: "followed you",
  post_like: "liked your post",
  video_like: "liked your video",
  comment: "commented on your thread",
  video_comment: "commented on your video",
};

function hrefFor(n: Notif): string | null {
  if (!n.entity_id) return null;
  if (n.entity_type === "post") return `/post/${n.entity_id}`;
  if (n.entity_type === "video") return `/watch/${n.entity_id}`;
  return null; // profile pages not built yet
}

export default function NotificationList({ meId }: { meId: string }) {
  const supabase = createClient();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("my_notifications", { p_limit: 50 });
    setItems((data ?? []) as Notif[]);
    setLoading(false);
  }, [supabase]);

  const markAllRead = useCallback(async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
  }, [supabase]);

  useEffect(() => {
    (async () => { await load(); await markAllRead(); })();
    const ch = supabase.channel("notif-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${meId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  if (loading) return <p className="py-16 text-center text-mist">…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="mt-6 divide-y divide-edge rounded-xl border border-edge bg-surface">
        {items.length === 0 && <p className="px-4 py-12 text-center text-sm text-mist">Nothing yet. Likes, comments, and new followers will show up here.</p>}
        {items.map((n) => {
          const name = n.actor_name || n.actor_username || "Someone";
          const href = hrefFor(n);
          const inner = (
            <div className={`flex items-center gap-3 px-4 py-3 ${!n.read ? "bg-sky/5" : ""}`}>
              <Avatar name={name} src={n.actor_avatar} size={40} />
              <p className="min-w-0 flex-1 text-sm text-foam">
                <span className="font-semibold">{name}</span>{" "}
                <span className="text-mist">{VERB[n.type] ?? "interacted with you"}</span>
              </p>
              <span className="shrink-0 text-xs text-mist">{ago(n.created_at)}</span>
              {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-teal" />}
            </div>
          );
          return href
            ? <Link key={n.id} href={href} className="block hover:bg-edge/30">{inner}</Link>
            : <div key={n.id}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
