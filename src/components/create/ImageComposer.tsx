"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_LIMITS } from "@/lib/upload-limits";

type Visibility = "public" | "unlisted" | "private";

const PHOTO_MAX = 20 * 1024 * 1024; // 20 MiB — matches supabase/photos.sql
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const PHOTO_ACCEPT = PHOTO_TYPES.join(",");

function formatBytes(b: number) {
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(0)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}

function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const IMG_ICON = "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z|M12 17a4 4 0 100-8 4 4 0 000 8z";

export default function ImageComposer({ onComplete }: { onComplete?: (photoId: string) => void }) {
  const supabase = createClient();

  const [file,        setFile]        = useState<File | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [title,       setTitle]       = useState("");
  const [description, setDesc]        = useState("");
  const [visibility,  setVisibility]  = useState<Visibility>("public");
  const [progress,    setProgress]    = useState(0);
  const [status,      setStatus]      = useState<string | null>(null);
  const [busy,        setBusy]        = useState(false);
  const [drag,        setDrag]        = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const objRef  = useRef<string | null>(null);

  function photoError(f: File): string | null {
    if (!(PHOTO_TYPES as readonly string[]).includes(f.type))
      return `Unsupported format: ${f.type || "unknown"}. Use JPEG, PNG, WebP, or GIF.`;
    if (f.size > PHOTO_MAX)
      return `File is ${formatBytes(f.size)} — max is ${formatBytes(PHOTO_MAX)}.`;
    return null;
  }

  function pickFile(f: File) {
    const err = photoError(f);
    if (err) { setStatus(err); return; }
    setStatus(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, UPLOAD_LIMITS.TITLE_MAX));
    if (objRef.current) URL.revokeObjectURL(objRef.current);
    const url = URL.createObjectURL(f);
    objRef.current = url;
    setPreview(url);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  function reset() {
    setFile(null); setTitle(""); setDesc(""); setVisibility("public");
    setProgress(0); setStatus(null); setBusy(false); setDrag(false);
    if (objRef.current) { URL.revokeObjectURL(objRef.current); objRef.current = null; }
    setPreview(null);
  }

  async function submit() {
    if (!file) { setStatus("Add an image first."); return; }
    if (!title.trim()) { setStatus("Add a title first."); return; }
    const err = photoError(file);
    if (err) { setStatus(err); return; }

    setBusy(true); setProgress(10); setStatus("Uploading…");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); setStatus("Not signed in."); return; }

    const ext = file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp"
      : file.type === "image/gif"  ? "gif"
      : "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("photos")
      .upload(path, file, { upsert: false });

    if (uploadErr) {
      setBusy(false);
      setStatus(`Upload failed: ${uploadErr.message}`);
      return;
    }

    setProgress(80); setStatus("Saving…");

    const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(path);

    const { data: row, error: dbErr } = await supabase
      .from("photos")
      .insert({
        owner: user.id,
        title: title.trim(),
        description: description || null,
        url: publicUrl,
        visibility,
      })
      .select("id")
      .single();

    if (dbErr || !row) {
      setBusy(false);
      setStatus(`DB insert failed: ${dbErr?.message ?? "unknown error"}`);
      return;
    }

    setProgress(100);
    reset();
    onComplete?.(row.id);
  }

  const titleOver = title.length > UPLOAD_LIMITS.TITLE_MAX;
  const descOver  = description.length > UPLOAD_LIMITS.DESCRIPTION_MAX;
  const isErr     = !!status && (status.includes("fail") || status.includes("Unsupported") || status.includes("Add") || status.includes("Not"));

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onClick={() => !file && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200
          ${drag ? "border-teal bg-teal/10 scale-[1.01]"
          : file ? "border-teal/40 bg-teal/5 cursor-default"
          : "border-edge hover:border-teal/50 hover:bg-edge/30 cursor-pointer"}`}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="max-h-80 w-full object-contain bg-black/20" />
            <div className="absolute inset-0 flex items-end justify-between p-3">
              <p className="rounded-lg bg-black/60 px-2 py-1 text-xs text-foam backdrop-blur-sm">
                {file?.name} · {formatBytes(file?.size ?? 0)}
              </p>
              <button
                onClick={e => { e.stopPropagation(); reset(); }}
                className="rounded-lg bg-black/60 px-2 py-1 text-xs text-mist hover:text-red-400 backdrop-blur-sm transition-colors">
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 px-6 text-center py-8">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-edge text-mist">
              <Icon d={IMG_ICON} size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foam">Drop image here</p>
              <p className="text-xs text-mist mt-0.5">JPEG, PNG, WebP, GIF — up to {formatBytes(PHOTO_MAX)}</p>
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-edge px-4 py-2 text-xs font-semibold text-mist hover:text-foam hover:border-foam/40 transition-colors">
              Browse files
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept={PHOTO_ACCEPT} className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
      </div>

      {/* Metadata */}
      <div className="space-y-3">
        <div>
          <input type="text" placeholder="Title"
            value={title} onChange={e => setTitle(e.target.value)} maxLength={UPLOAD_LIMITS.TITLE_MAX + 10}
            className={`lt-input w-full text-sm font-semibold ${titleOver ? "border-red-500" : ""}`} />
          {titleOver && <p className="mt-1 text-xs text-red-400">{title.length}/{UPLOAD_LIMITS.TITLE_MAX}</p>}
        </div>

        <select value={visibility} onChange={e => setVisibility(e.target.value as Visibility)}
          className="lt-input w-full text-sm">
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </select>

        <div>
          <textarea placeholder="Description (optional)"
            value={description} onChange={e => setDesc(e.target.value)}
            rows={3} className={`lt-input w-full resize-none text-sm ${descOver ? "border-red-500" : ""}`} />
          {descOver && <p className="mt-1 text-xs text-red-400">{description.length}/{UPLOAD_LIMITS.DESCRIPTION_MAX.toLocaleString()}</p>}
        </div>
      </div>

      {/* Progress */}
      {busy && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
            <div className="h-full rounded-full bg-teal transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-mist">{status}</p>
        </div>
      )}
      {!busy && status && (
        <p className={`text-sm ${isErr ? "text-red-400" : "text-teal"}`}>{status}</p>
      )}

      <button onClick={submit} disabled={busy || !file}
        className="w-full rounded-xl bg-teal py-3 text-sm font-bold text-black
          hover:bg-teal/90 disabled:opacity-40 disabled:pointer-events-none transition-colors">
        {busy ? `${status} ${progress < 100 ? `${progress}%` : ""}` : "Publish image"}
      </button>
    </div>
  );
}
