"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import Thread from "@/components/messages/Thread";

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("my_conversations");
    setConvos((data ?? []) as Convo[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // ?to=<userId> → open or create that DM, then clean the URL
  useEffect(() => {
    const to = params.get("to");
    if (!to) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_or_create_dm", { p_other: to });
      if (!error && data) { await load(); setActiveId(data as string); }
      router.replace("/messages");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // live list refresh on any message I can see
  useEffect(() => {
    const ch = supabase.channel("dm-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, supabase]);

  async function search(text: string) {
    setQ(text);
    if (text.trim().length < 1) { setResults([]); return; }
    const { data } = await supabase.from("profiles").select("id, username, full_name, avatar_url")
      .or(`username.ilike.%${text}%,full_name.ilike.%${text}%`).neq("id", meId).limit(8);
    setResults((data ?? []) as Person[]);
  }

  async function startWith(id: string) {
    const { data, error } = await supabase.rpc("get_or_create_dm", { p_other: id });
    if (!error && data) { await load(); setActiveId(data as string); setShowNew(false); setQ(""); setResults([]); }
  }

  const active = convos.find((c) => c.conversation_id === activeId) || null;
  const nameOf = (c: Convo) => c.other_name || c.other_username || "User";

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl overflow-hidden rounded-xl border border-edge">
      {/* list / new-message */}
      <aside className={`w-full shrink-0 flex-col border-r border-edge md:flex md:w-80 ${activeId ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <h1 className="font-bold text-foam">Messages</h1>
          <button onClick={() => setShowNew((v) => !v)} className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-teal hover:bg-edge">
            {showNew ? "Cancel" : "New"}
          </button>
        </div>

        {showNew ? (
          <div className="p-3">
            <input autoFocus value={q} onChange={(e) => search(e.target.value)} placeholder="Search people…" className="lt-input" />
            <div className="mt-2 space-y-1">
              {results.map((p) => (
                <button key={p.id} onClick={() => startWith(p.id)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-edge/50">
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
          <div className="flex-1 overflow-y-auto">
            {convos.length === 0 ? <p className="px-4 py-8 text-center text-sm text-mist">No conversations yet. Tap “New” to start one.</p>
              : convos.map((c) => (
                <button key={c.conversation_id} onClick={() => setActiveId(c.conversation_id)}
                  className={`flex w-full items-center gap-3 border-b border-edge/50 px-4 py-3 text-left hover:bg-edge/40 ${activeId === c.conversation_id ? "bg-edge/40" : ""}`}>
                  <Avatar name={nameOf(c)} src={c.other_avatar} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foam">{nameOf(c)}</p>
                    <p className={`truncate text-sm ${c.unread > 0 ? "font-semibold text-foam" : "text-mist"}`}>{c.last_body ?? "New conversation"}</p>
                  </div>
                  {c.unread > 0 && <span className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-teal px-1.5 text-xs font-bold text-ink">{c.unread}</span>}
                </button>
              ))}
          </div>
        )}
      </aside>

      {/* active thread */}
      <section className={`min-w-0 flex-1 ${activeId ? "block" : "hidden md:block"}`}>
        {active ? (
          <div className="flex h-full flex-col">
            <button onClick={() => setActiveId(null)} className="border-b border-edge px-4 py-2 text-left text-sm font-semibold text-mist md:hidden">← Back</button>
            <div className="min-h-0 flex-1">
              <Thread conversationId={active.conversation_id} meId={meId} header={{ name: nameOf(active), avatar: active.other_avatar }} onActivity={load} />
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-sm text-mist">Select a conversation</div>
        )}
      </section>
    </div>
  );
}
