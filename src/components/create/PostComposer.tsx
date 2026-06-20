"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX = 2000;
const MAX_IMAGES = 4;
const EMOJI = "😀 😂 🥹 😍 😎 🤔 😭 😅 🙌 👍 🔥 ✨ 🎉 ❤️ 💀 👀 🙏 💯 🚀 🐦 🌊 🍿 ⚡ 🎬 📸 🎵 😴 🤝 👏 🥳".split(" ");

// Writing a Post starts a Thread (a root node). Comments continue it later.
export default function PostComposer() {
  const supabase = createClient();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, [supabase]);
  useEffect(() => {
    function onClick(e: MouseEvent) { if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function pickImages(files: FileList | null) {
    if (!files || !uid) return;
    setErr(null);
    const room = MAX_IMAGES - images.length;
    const chosen = Array.from(files).slice(0, room);
    if (chosen.length === 0) { setErr(`Up to ${MAX_IMAGES} images.`); return; }
    setUploading(true);
    for (const file of chosen) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
      if (error) { setErr(error.message); continue; }
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setImages((cur) => [...cur, data.publicUrl]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeImage(url: string) { setImages((cur) => cur.filter((u) => u !== url)); }

  async function submit() {
    const text = body.trim();
    if (!text && images.length === 0) return setErr("Write something or add an image.");
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("create_post", {
      p_body: text, p_video_id: null, p_parent_id: null, p_images: images.length ? images : null,
    });
    if (error) { setBusy(false); return setErr(error.message); }
    router.push(`/post/${data as string}`);
    router.refresh();
  }

  const canPost = (!!body.trim() || images.length > 0) && !busy && !uploading;

  return (
    <div className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX))}
        placeholder="What's happening? Use #hashtags to reach more people."
        className="lt-input min-h-[160px]"
      />

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {images.map((url) => (
            <div key={url} className="relative overflow-hidden rounded-xl border border-edge">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-24 w-full object-cover" />
              <button onClick={() => removeImage(url)} aria-label="Remove image"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-foam hover:bg-ink">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Image / GIF */}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
            onChange={(e) => pickImages(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} disabled={images.length >= MAX_IMAGES || uploading}
            title="Add images or GIFs" aria-label="Add images"
            className="grid h-9 w-9 place-items-center rounded-full text-teal hover:bg-edge/60 disabled:opacity-40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </button>

          {/* Emoji */}
          <div className="relative" ref={emojiRef}>
            <button onClick={() => setShowEmoji((v) => !v)} title="Emoji" aria-label="Emoji"
              className="grid h-9 w-9 place-items-center rounded-full text-teal hover:bg-edge/60">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" /><path d="M8 14a4 4 0 008 0" /><path d="M9 9h.01M15 9h.01" />
              </svg>
            </button>
            {showEmoji && (
              <div className="absolute z-50 mt-2 grid w-64 grid-cols-8 gap-1 rounded-xl border border-edge bg-panel p-2 shadow-xl">
                {EMOJI.map((e) => (
                  <button key={e} onClick={() => setBody((b) => (b + e).slice(0, MAX))}
                    className="rounded-md p-1 text-lg hover:bg-edge/60">{e}</button>
                ))}
              </div>
            )}
          </div>

          {uploading && <span className="ml-1 text-xs text-mist">Uploading…</span>}
        </div>

        <div className="text-right text-xs text-mist">{body.length}/{MAX}</div>
      </div>

      {err && <p className="text-sm text-loonred">{err}</p>}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-mist">Starts a new thread — others continue it with comments.</p>
        <button onClick={submit} disabled={!canPost} className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
