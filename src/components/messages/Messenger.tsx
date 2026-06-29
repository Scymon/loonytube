"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

type Convo = {
  conversation_id: string; other_id: string | null; other_username: string | null;
  other_name: string | null; other_avatar: string | null; last_body: string | null; last_at: string; unread: number;
};
type Person = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

export default function Messenger({ meId }: { meId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("my_conversations");
    setConvos((data ?? []) as Convo[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // ?to=<userId> → create or find DM and navigate straight to it
  useEffect(() => {
    const to = params.get("to");
    if (!to) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_or_create_dm", { p_other: to });
      if (!error && data) router.replace(`/messages/${data}`);
      else router.replace("/messages");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // live list refresh
  useEffect(() => {
    const ch = supabase.channel("dm-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, supabase]);

  async function search(text: string) {
    setQ(text);
    if (text.trim().length < 1) { setResults([]); return; }
    const { data } = await supabase.from("profiles")
      .select("id, username, full_name, avatar_url")
      .or(`username.ilike.%${text}%,full_name.ilike.%${text}%`)
      .neq("id", meId).limit(8);
    setResults((data ?? []) as Person[]);
  }

  async function startWith(id: string) {
    const { data, error } = await supabase.rpc("get_or_create_dm", { p_other: id });
    if (!error && data) router.push(`/messages/${data}`);
  }

  const nameOf = (c: Convo) => c.other_name || c.other_username || "User";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-foam">Threads</h1>
        <button onClick={() => setShowNew((v) => !v)}
          className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-teal hover:bg-edge">
          {showNew ? "Cancel" : "New"}
        </button>
      </div>

      {showNew ? (
        <div className="px-4">
          <input autoFocus value={q} onChange={(e) => search(e.target.value)}
            placeholder="Search people…" className="lt-input w-full" />
          <div className="mt-2 space-y-1">
            {results.map((p) => (
              <button key={p.id} onClick={() => startWith(p.id)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-edge/50">
                <Avatar name={p.full_name || p.username} src={p.avatar_url} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foam">{p.full_name || p.username || "User"}</p>
                  <p className="truncate text-xs text-mist">@{p.username}</p>
                </div>
              </button>
            ))}
            {q && results.length === 0 && <p className="px-2 py-3 text-sm text-mist">No people found.</p>}
          </div>
        </div>
      ) : (
        <div>
          {convos.length === 0
            ? <p className="px-4 py-8 text-center text-sm text-mist">No conversations yet. Tap "New" to start one.</p>
            : convos.map((c) => (
              <button key={c.conversation_id} onClick={() => router.push(`/messages/${c.conversation_id}`)}
                className="flex w-full items-center gap-3 border-b border-edge/50 px-4 py-3 text-left hover:bg-edge/40">
                <Avatar name={nameOf(c)} src={c.other_avatar} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foam">{nameOf(c)}</p>
                  <p className={`truncate text-sm ${c.unread > 0 ? "font-semibold text-foam" : "text-mist"}`}>
                    {c.last_body ?? "New conversation"}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-teal px-1.5 text-xs font-bold text-ink">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
