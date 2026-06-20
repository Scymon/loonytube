"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

type Msg = { id: string; sender: string; body: string; images?: string[] | null; created_at: string };

const MAX_IMAGES = 4;

export default function Thread({ conversationId, meId, header, onActivity }: {
  conversationId: string; meId: string; header: { name: string; avatar: string | null } | null; onActivity?: () => void;
}) {
  const supabase = createClient();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const markRead = async () => {
      await supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId).eq("user_id", meId);
      await supabase.from("notifications").update({ read: true })
        .eq("type", "dm").eq("entity_id", conversationId).eq("read", false);
    };

    (async () => {
      const { data } = await supabase.from("messages").select("id, sender, body, images, created_at")
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

  async function pickImages(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    const chosen = Array.from(files).slice(0, room);
    if (chosen.length === 0) return;
    setUploading(true);
    for (const file of chosen) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${meId}/dm/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
      if (!error) {
        const { data } = supabase.storage.from("media").getPublicUrl(path);
        setImages((cur) => [...cur, data.publicUrl]);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeImage(url: string) { setImages((cur) => cur.filter((u) => u !== url)); }

  async function send() {
    const text = body.trim();
    if ((!text && images.length === 0) || uploading) return;
    const imgs = images;
    setBody(""); setImages([]);
    const tmp: Msg = { id: `tmp-${Date.now()}`, sender: meId, body: text, images: imgs.length ? imgs : null, created_at: new Date().toISOString() };
    setMsgs((c) => [...c, tmp]);
    const { data, error } = await supabase.from("messages")
      .insert({ conversation_id: conversationId, sender: meId, body: text, images: imgs.length ? imgs : null })
      .select().single();
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
            const imgs = m.images ?? [];
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[15px] ${mine ? "text-ink" : "bg-surface text-foam"}`}
                  style={mine ? { backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" } : undefined}>
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {imgs.length > 0 && (
                    <div className={`grid gap-1 ${m.body ? "mt-2" : ""} ${imgs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {imgs.map((src, i) => (
                        <a key={i} href={src} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" loading="lazy" className="max-h-64 w-full rounded-lg object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-edge p-3">
        {images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-16 w-16 rounded-lg border border-edge object-cover" />
                <button onClick={() => removeImage(url)} aria-label="Remove"
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-xs text-foam">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
            onChange={(e) => pickImages(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading || images.length >= MAX_IMAGES}
            title="Add image or GIF" aria-label="Add image"
            className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-teal hover:bg-edge/60 disabled:opacity-40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message…" className="lt-input max-h-32 min-h-[44px] flex-1 resize-none" />
          <button onClick={send} disabled={uploading} className="rounded-full px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
            style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>Send</button>
        </div>
        {uploading && <p className="mt-1 text-xs text-mist">Uploading…</p>}
      </div>
    </div>
  );
}
