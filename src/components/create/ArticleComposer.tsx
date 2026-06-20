"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Block = { id: string; type: "text" | "image"; value?: string; url?: string };
const rid = () => Math.random().toString(36).slice(2, 9);

// Block-based article composer: a title, an optional cover, and an ordered list
// of text/image blocks so media embeds inline.
export default function ArticleComposer() {
  const supabase = createClient();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([{ id: rid(), type: "text", value: "" }]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const inlineRef = useRef<HTMLInputElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, [supabase]);

  async function upload(file: File): Promise<string | null> {
    if (!uid) return null;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${uid}/articles/${Date.now()}-${rid()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setErr(error.message); return null; }
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function pickCover(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true); setErr(null);
    const url = await upload(files[0]);
    if (url) setCover(url);
    setUploading(false);
    if (coverRef.current) coverRef.current.value = "";
  }

  async function addImageBlock(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true); setErr(null);
    const url = await upload(files[0]);
    if (url) setBlocks((b) => [...b, { id: rid(), type: "image", url }]);
    setUploading(false);
    if (inlineRef.current) inlineRef.current.value = "";
  }

  const addParagraph = () => setBlocks((b) => [...b, { id: rid(), type: "text", value: "" }]);
  const setText = (id: string, value: string) => setBlocks((b) => b.map((x) => (x.id === id ? { ...x, value } : x)));
  const remove = (id: string) => setBlocks((b) => b.filter((x) => x.id !== id));

  async function publish() {
    if (!uid) return;
    if (title.trim().length === 0) return setErr("Give your article a title.");
    const clean = blocks
      .map((b) => (b.type === "text" ? { type: "text", value: (b.value || "").trim() } : { type: "image", url: b.url }))
      .filter((b) => (b.type === "text" ? (b as any).value.length > 0 : !!(b as any).url));
    if (clean.length === 0) return setErr("Add some content — a paragraph or an image.");
    setBusy(true); setErr(null);
    const { data, error } = await supabase.from("articles")
      .insert({ owner: uid, title: title.trim(), cover_url: cover, blocks: clean }).select("id").single();
    if (error) { setBusy(false); return setErr(error.message); }
    setPublishedId((data as { id: string }).id);
    setBusy(false);
  }

  if (publishedId) {
    const url = `${window.location.origin}/article/${publishedId}`;
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-lg font-bold text-foam">Article published!</p>
        <p className="text-sm text-mist">Share the link with your audience.</p>
        <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-4 py-3">
          <span className="flex-1 truncate text-left text-sm text-foam">{url}</span>
          <button
            onClick={() => navigator.clipboard.writeText(url)}
            className="shrink-0 rounded-lg bg-teal/20 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/30">
            Copy link
          </button>
        </div>
        <button onClick={() => router.push(`/article/${publishedId}`)}
          className="text-sm text-sky hover:underline">Open article →</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 200))}
        placeholder="Article title" className="lt-input text-lg font-semibold" />

      {/* cover */}
      <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => pickCover(e.target.files)} />
      {cover ? (
        <div className="relative overflow-hidden rounded-xl border border-edge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="max-h-64 w-full object-cover" />
          <button onClick={() => setCover(null)} className="absolute right-2 top-2 rounded-full bg-ink/80 px-3 py-1 text-xs text-foam hover:bg-ink">Remove cover</button>
        </div>
      ) : (
        <button onClick={() => coverRef.current?.click()} className="w-full rounded-xl border border-dashed border-edge py-6 text-sm font-semibold text-teal hover:bg-edge/30">
          + Add cover image
        </button>
      )}

      {/* body blocks */}
      <div className="space-y-3">
        {blocks.map((b) => (
          <div key={b.id} className="group relative">
            {b.type === "text" ? (
              <textarea value={b.value} onChange={(e) => setText(b.id, e.target.value)}
                placeholder="Write a paragraph…" className="lt-input min-h-[90px]" />
            ) : (
              <div className="overflow-hidden rounded-xl border border-edge">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt="" className="max-h-[420px] w-full object-cover" />
              </div>
            )}
            {blocks.length > 1 && (
              <button onClick={() => remove(b.id)} aria-label="Remove block"
                className="absolute -right-2 -top-2 hidden h-6 w-6 place-items-center rounded-full bg-ink text-foam group-hover:grid">×</button>
            )}
          </div>
        ))}
      </div>

      <input ref={inlineRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => addImageBlock(e.target.files)} />
      <div className="flex items-center gap-2">
        <button onClick={addParagraph} className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-foam hover:bg-edge">+ Paragraph</button>
        <button onClick={() => inlineRef.current?.click()} disabled={uploading} className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-teal hover:bg-edge disabled:opacity-40">+ Image</button>
        {uploading && <span className="text-xs text-mist">Uploading…</span>}
      </div>

      {err && <p className="text-sm text-loonred">{err}</p>}

      <div className="flex items-center justify-between border-t border-edge pt-4">
        <p className="text-xs text-mist">Longform — gets its own reading page.</p>
        <button onClick={publish} disabled={busy || uploading} className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? "Publishing…" : "Publish Article"}
        </button>
      </div>
    </div>
  );
}
