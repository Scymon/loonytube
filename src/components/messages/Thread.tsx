"use client";

import { useRef, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

type LtVideoEmbed = { type: "lt-video"; videoId: string; title: string; thumbnail: string | null; duration?: number | null };
type XPostEmbed  = { type: "x-post"; url: string };
type Embed = LtVideoEmbed | XPostEmbed;

type Msg = {
  id: string;
  sender: string;
  body: string | null;
  images?: string[] | null;
  embeds?: Embed[] | null;
  created_at: string;
  failed?: boolean;
};

type PickerVideo = { id: string; title: string; thumbnail: string | null; duration: number | null };

const MAX_IMAGES = 4;

function fmtDur(sec: number | null | undefined) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function extractXUrl(text: string): string | null {
  const m = text.match(/https?:\/\/(twitter\.com|x\.com)\/\S+/i);
  return m ? m[0] : null;
}

function extractLtVideoId(text: string): string | null {
  // Matches /watch/VIDEO_ID written by the send fallback
  const m = text.match(/\/watch\/([a-zA-Z0-9_-]{8,})/);
  return m ? m[1] : null;
}

// ── X embed — srcdoc + allow-same-origin so widgets.js runs, self-measures ──
// allow-same-origin lets Twitter's widget.js transform the blockquote into a
// real tweet card and fire the MutationObserver so we measure the exact height.

function XEmbedCard({ embed, mine }: { embed: XPostEmbed; mine: boolean }) {
  const [srcdoc, setSrcdoc]   = useState<string | null>(null);
  const [height, setHeight]   = useState(180);
  const key = useRef(`lt${Math.random().toString(36).slice(2, 9)}`).current;

  // Fetch oEmbed HTML from Twitter and build a self-measuring srcdoc
  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/oembed/x?url=${encodeURIComponent(embed.url)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const k = JSON.stringify(key);
        const doc = [
          "<!DOCTYPE html><html><head>",
          "<meta charset=\"utf-8\">",
          "<style>",
          "  *{box-sizing:border-box}",
          "  html,body{margin:0;padding:0;background:transparent;overflow:hidden;}",
          "  .twitter-tweet{margin:0!important;}",
          "</style>",
          "</head><body>",
          d.html as string,
          `<script>(function(){`,
          `  var k=${k};`,
          `  function report(){`,
          `    var h=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);`,
          `    if(h>80)parent.postMessage({type:'lt-h',key:k,h:h},'*');`,
          `  }`,
          `  new MutationObserver(report).observe(document.body,{childList:true,subtree:true,attributes:true});`,
          `  [150,400,800,1500,3000].forEach(function(ms){setTimeout(report,ms);});`,
          `}());<\/script>`,
          "</body></html>",
        ].join("\n");
        setSrcdoc(doc);
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, [embed.url, key]);

  // Receive height reports from the iframe
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as Record<string, unknown>;
      if (d?.type === "lt-h" && d?.key === key && typeof d?.h === "number" && (d.h as number) > 80) {
        setHeight(d.h as number);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [key]);

  const base = mine
    ? "rounded-xl border border-white/20 overflow-hidden"
    : "rounded-xl border border-edge overflow-hidden";

  if (!srcdoc) {
    return (
      <div className={`flex items-center gap-2.5 px-3 py-3 ${base} bg-surface`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent shrink-0" />
        <span className="text-xs text-mist">Loading post…</span>
      </div>
    );
  }

  return (
    <div className={base}>
      <iframe
        srcDoc={srcdoc}
        className="w-full"
        style={{ height, border: "none", display: "block" }}
        scrolling="no"
        title="X post"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
      />
    </div>
  );
}

// ── LT video from watch URL (no embeds column needed) ───────────────────────
// Shown when a /watch/ID URL is detected in the message body (schema fallback).

function LtVideoFromId({ videoId, mine }: { videoId: string; mine: boolean }) {
  const supabase = createClient();
  const [embed, setEmbed] = useState<LtVideoEmbed | null>(null);

  useEffect(() => {
    supabase.from("videos").select("id, title, thumbnail, duration")
      .eq("id", videoId).maybeSingle()
      .then(({ data }) => {
        if (data) setEmbed({ type: "lt-video", videoId: data.id, title: data.title, thumbnail: data.thumbnail, duration: data.duration });
      });
  }, [videoId, supabase]);

  if (!embed) return (
    <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-3">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent shrink-0" />
      <span className="text-xs text-mist">Loading video…</span>
    </div>
  );
  return <LtVideoEmbedCard embed={embed} mine={mine} />;
}

// ── Internal video embed (thumbnail → inline Cloudflare player on click) ────

function LtVideoEmbedCard({ embed, mine }: { embed: LtVideoEmbed; mine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const base = mine
    ? "rounded-xl border border-white/20 overflow-hidden"
    : "rounded-xl border border-edge overflow-hidden";

  return (
    <div className={base}>
      {playing ? (
        <div className="aspect-video">
          <iframe
            src={`https://iframe.cloudflarestream.com/${embed.videoId}?autoplay=1&muted=0`}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
            title={embed.title}
          />
        </div>
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="group relative block w-full aspect-video bg-black"
          aria-label={`Play ${embed.title}`}
        >
          {embed.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={embed.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:brightness-75" />
          ) : (
            <div className="flex h-full items-center justify-center text-mist text-xs">No preview</div>
          )}
          {embed.duration && (
            <span className="absolute bottom-1.5 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {fmtDur(embed.duration)}
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-black/60 ring-2 ring-white/30 transition group-hover:bg-teal/80 group-hover:ring-teal/60">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </button>
      )}
      <div className="px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal mb-0.5">LoonyTube</p>
        <p className={`text-sm font-semibold leading-snug line-clamp-1 ${mine ? "text-ink" : "text-foam"}`}>
          {embed.title}
        </p>
      </div>
    </div>
  );
}

// ── Lightweight compose preview (no oEmbed fetch, no iframe) ───────────────
// Used above the input while the user is composing. Full EmbedCard is only
// rendered inside the message thread after send.

function EmbedPreview({ embed }: { embed: Embed }) {
  if (embed.type === "x-post") {
    const handle = embed.url.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, "").split("?")[0];
    return (
      <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-foam">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <span className="text-xs text-foam truncate">{handle}</span>
      </div>
    );
  }
  if (embed.type === "lt-video") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2">
        {embed.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={embed.thumbnail} alt="" className="h-8 w-14 shrink-0 rounded object-cover" />
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-teal">LoonyTube</p>
          <p className="truncate text-xs text-foam">{embed.title}</p>
        </div>
      </div>
    );
  }
  return null;
}

function EmbedCard({ embed, mine }: { embed: Embed; mine: boolean }) {
  if (embed.type === "x-post")    return <XEmbedCard    embed={embed} mine={mine} />;
  if (embed.type === "lt-video")  return <LtVideoEmbedCard embed={embed} mine={mine} />;
  return null;
}

// ── Video picker ────────────────────────────────────────────────────────────

function VideoPicker({ onPick, onClose }: {
  onPick: (v: PickerVideo) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [videos, setVideos] = useState<PickerVideo[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title, thumbnail, duration")
        .eq("status", "ready")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);
      setVideos((data ?? []) as PickerVideo[]);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = q.trim()
    ? videos.filter((v) => v.title.toLowerCase().includes(q.toLowerCase()))
    : videos;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-20 rounded-xl border border-edge bg-ink shadow-xl">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <p className="text-xs font-bold text-foam">Share a video</p>
        <button onClick={onClose} className="text-mist hover:text-foam text-lg leading-none">×</button>
      </div>
      <div className="px-3 pt-2 pb-1">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search videos…" className="lt-input text-sm" />
      </div>
      <div className="max-h-60 overflow-y-auto px-2 pb-2">
        {loading ? (
          <p className="py-4 text-center text-xs text-mist">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-mist">No videos found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {filtered.map((v) => (
              <button key={v.id} onClick={() => onPick(v)}
                className="group overflow-hidden rounded-lg border border-edge text-left hover:border-teal/50">
                <div className="relative aspect-video bg-black">
                  {v.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-mist text-[10px]">No thumb</div>
                  )}
                  {v.duration && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px text-[10px] text-white">
                      {fmtDur(v.duration)}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 px-1.5 py-1 text-[11px] text-foam leading-snug">{v.title}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Thread ─────────────────────────────────────────────────────────────

export default function Thread({ conversationId, meId, header, onActivity }: {
  conversationId: string;
  meId: string;
  header: { name: string; avatar: string | null } | null;
  onActivity?: () => void;
}) {
  const supabase = createClient();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [pendingEmbeds, setPendingEmbeds] = useState<Embed[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const markRead = async () => {
      await supabase.from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId).eq("user_id", meId);
      await supabase.from("notifications").update({ read: true })
        .eq("type", "dm").eq("entity_id", conversationId).eq("read", false);
    };

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender, body, images, embeds, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!active) return;

      if (error) {
        // embeds column not yet migrated — fall back
        const { data: d2 } = await supabase
          .from("messages")
          .select("id, sender, body, images, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });
        setMsgs((d2 ?? []) as Msg[]);
      } else {
        setMsgs((data ?? []) as Msg[]);
      }

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

  useEffect(() => { if (endRef.current) { endRef.current.scrollTop = endRef.current.scrollHeight; } }, [msgs]);

  async function pickImages(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    const chosen = Array.from(files).slice(0, room);
    if (!chosen.length) return;
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
  function removeEmbed(i: number) { setPendingEmbeds((cur) => cur.filter((_, j) => j !== i)); }

  function addVideoEmbed(v: PickerVideo) {
    const embed: LtVideoEmbed = { type: "lt-video", videoId: v.id, title: v.title, thumbnail: v.thumbnail, duration: v.duration };
    setPendingEmbeds((cur) => [...cur, embed]);
    setShowPicker(false);
  }

  async function send() {
    const text = body.trim();
    const embeds: Embed[] = [...pendingEmbeds]; // only LT video embeds from picker

    // X URLs stay in the message body — the renderer detects and embeds them.
    const hasContent = text || images.length > 0 || embeds.length > 0;
    if (!hasContent || uploading) return;

    const imgs = images;
    setBody(""); setImages([]); setPendingEmbeds([]);

    const payload: Record<string, unknown> = {
      conversation_id: conversationId,
      sender: meId,
      body: text || null,
      images: imgs.length ? imgs : null,
    };
    if (embeds.length) payload.embeds = embeds;

    const tmp: Msg = {
      id: `tmp-${Date.now()}`,
      sender: meId,
      body: text || null,
      images: imgs.length ? imgs : null,
      embeds: embeds.length ? embeds : null,
      created_at: new Date().toISOString(),
    };
    setMsgs((c) => [...c, tmp]);

    let { data, error } = await supabase.from("messages").insert(payload).select().single();

    // Retry cascade: if insert failed for ANY reason (embeds column missing, body constraint, etc.)
    // fall back to a minimal guaranteed-safe payload — no embeds, non-null body.
    if (error) {
      // For LT videos: encode as a watch URL so the renderer can show the player
      // even without the embeds JSONB column in the DB.
      const bodyFallback = embeds.length > 0
        ? (embeds[0].type === "x-post"
            ? embeds[0].url
            : `/watch/${(embeds[0] as LtVideoEmbed).videoId}`)
        : imgs.length > 0 ? "📷 Photo" : text;
      const safePayload = {
        conversation_id: conversationId,
        sender: meId,
        body: text || bodyFallback || "📷",
        images: imgs.length ? imgs : null,
      };
      const r2 = await supabase.from("messages").insert(safePayload).select().single();
      data = r2.data; error = r2.error;
    }

    if (!error && data) {
      setMsgs((c) => c.map((m) => (m.id === tmp.id ? (data as Msg) : m)));
    } else if (error) {
      // Mark the optimistic message as failed so the user knows
      setMsgs((c) => c.map((m) => (m.id === tmp.id ? { ...m, failed: true } : m)));
      console.error("Message send failed:", error.message);
    }
    onActivity?.();
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {header && (
        <div className="flex items-center gap-3 border-b border-edge px-4 py-3">
          <Avatar name={header.name} src={header.avatar} size={36} />
          <p className="font-bold text-foam">{header.name}</p>
        </div>
      )}

      <div ref={endRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-end space-y-2 px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-mist">Loading…</p>
        ) : msgs.length === 0 ? (
          <p className="text-center text-sm text-mist">Say hello 👋</p>
        ) : msgs.map((m) => {
          const mine = m.sender === meId;
          const imgs = m.images ?? [];
          const embeds = m.embeds ?? [];
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {m.failed && (
                <p className="mb-0.5 text-[11px] text-red-400">⚠ Failed to send</p>
              )}
              <div
                className={`max-w-[90%] sm:max-w-[460px] rounded-2xl px-3.5 py-2 text-[15px] ${m.failed ? "opacity-50" : ""} ${mine ? "text-ink" : "bg-surface text-foam"}`}
                style={mine ? { backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" } : undefined}
              >
                {m.body && (() => {
                  const xUrl = extractXUrl(m.body);
                  const ltId = !xUrl ? extractLtVideoId(m.body) : null;
                  let displayText = m.body;
                  if (xUrl) displayText = m.body.replace(xUrl, "").trim();
                  if (ltId) displayText = m.body.replace(`/watch/${ltId}`, "").trim();
                  return (
                    <>
                      {displayText && <p className="whitespace-pre-wrap break-words">{displayText}</p>}
                      {xUrl && (
                        <div className={displayText ? "mt-2" : ""}>
                          <XEmbedCard embed={{ type: "x-post", url: xUrl }} mine={mine} />
                        </div>
                      )}
                      {ltId && !embeds.some((e) => e.type === "lt-video") && (
                        <div className={displayText ? "mt-2" : ""}>
                          <LtVideoFromId videoId={ltId} mine={mine} />
                        </div>
                      )}
                    </>
                  );
                })()}
                {imgs.length > 0 && (
                  <div className={`grid gap-1 ${m.body ? "mt-2" : ""} ${imgs.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {imgs.map((src, i) => (
                      <button key={i} type="button"
                        onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
                        className="cursor-zoom-in">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" loading="lazy" className="max-h-64 w-full rounded-lg object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {embeds.length > 0 && (
                  <div className={`space-y-2 ${(m.body || imgs.length > 0) ? "mt-2" : ""}`}>
                    {embeds.map((e, i) => <EmbedCard key={i} embed={e} mine={mine} />)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <div className="shrink-0 border-t border-edge p-3">
        {(() => {
          const detectedX = extractXUrl(body);
          return (detectedX || pendingEmbeds.length > 0) ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {detectedX && (
                <EmbedPreview embed={{ type: "x-post", url: detectedX }} />
              )}
              {pendingEmbeds.map((e, i) => (
                <div key={i} className="relative">
                  <EmbedPreview embed={e} />
                  <button onClick={() => removeEmbed(i)} aria-label="Remove embed"
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-xs text-foam border border-edge">×</button>
                </div>
              ))}
            </div>
          ) : null;
        })()}

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

        <div className="relative flex items-end gap-2">
          {showPicker && <VideoPicker onPick={addVideoEmbed} onClose={() => setShowPicker(false)} />}

          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
            onChange={(e) => pickImages(e.target.files)} />

          <button onClick={() => fileRef.current?.click()}
            disabled={uploading || images.length >= MAX_IMAGES}
            title="Add image" aria-label="Add image"
            className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-teal hover:bg-edge/60 disabled:opacity-40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </button>

          <button onClick={() => setShowPicker((v) => !v)}
            title="Share a video" aria-label="Share video"
            className={`grid h-11 w-10 shrink-0 place-items-center rounded-full hover:bg-edge/60 transition ${showPicker ? "text-teal bg-edge/60" : "text-teal"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
            </svg>
          </button>

          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message… (paste an x.com link to embed)"
            className="lt-input max-h-32 min-h-[44px] flex-1 resize-none" />

          <button onClick={send} disabled={uploading}
            className="rounded-full px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
            style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
            Send
          </button>
        </div>
        {uploading && <p className="mt-1 text-xs text-mist">Uploading…</p>}
      </div>
    </div>
  );
}
