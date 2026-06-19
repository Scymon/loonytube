"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

type Msg = { id: string; sender: string; body: string; created_at: string };

export default function Thread({ conversationId, meId, header, onActivity }: {
  conversationId: string; meId: string; header: { name: string; avatar: string | null } | null; onActivity?: () => void;
}) {
  const supabase = createClient();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const markRead = async () => {
      await supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId).eq("user_id", meId);
      // clear the DM notification(s) for this conversation so the bell stays in sync
      await supabase.from("notifications").update({ read: true })
        .eq("type", "dm").eq("entity_id", conversationId).eq("read", false);
    };

    (async () => {
      const { data } = await supabase.from("messages").select("id, sender, body, created_at")
        .eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (!active) return;
      setMsgs((data ?? []) as Msg[]);
      setLoading(false);
      await markRead();
      onActivity?.();
    })();

    const ch = supabase.channel(`conv:${conversationId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
          if (m.sender !== meId) markRead().then(() => onActivity?.());
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, meId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    const tmp: Msg = { id: `tmp-${Date.now()}`, sender: meId, body: text, created_at: new Date().toISOString() };
    setMsgs((c) => [...c, tmp]);
    const { data, error } = await supabase.from("messages")
      .insert({ conversation_id: conversationId, sender: meId, body: text }).select().single();
    if (!error && data) setMsgs((c) => c.map((m) => (m.id === tmp.id ? (data as Msg) : m)));
    onActivity?.();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-edge px-4 py-3">
        {header && <><Avatar name={header.name} src={header.avatar} size={36} /><p className="font-bold text-foam">{header.name}</p></>}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {loading ? <p className="text-center text-sm text-mist">Loading…</p>
          : msgs.length === 0 ? <p className="text-center text-sm text-mist">Say hello 👋</p>
          : msgs.map((m) => {
            const mine = m.sender === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[15px] ${mine ? "text-ink" : "bg-surface text-foam"}`}
                  style={mine ? { backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" } : undefined}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-edge p-3">
        <div className="flex items-end gap-2">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={1} maxLength={4000}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message…" className="lt-input max-h-32 min-h-[44px] flex-1 resize-none" />
          <button onClick={send} className="rounded-full px-5 py-2.5 text-sm font-bold text-ink" style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>Send</button>
        </div>
      </div>
    </div>
  );
}
