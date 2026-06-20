"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_LIMITS } from "@/lib/upload-limits";

const CATEGORIES = [
  "Gaming", "Tech", "Education & Tech", "Music", "Sports",
  "Comedy", "News", "Science", "Design", "Food", "Finance",
];
type Visibility = "public" | "unlisted" | "private";

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(0)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function VideoComposer() {
  const router = useRouter();
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [kids, setKids] = useState(true); // checkbox label is "Not made for kids"
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  // ── Pre-flight helpers ────────────────────────────────────────────────────
  function validateVideoFile(f: File): string | null {
    const allowedTypes = UPLOAD_LIMITS.ALLOWED_VIDEO_TYPES as readonly string[];
    if (f.type && !allowedTypes.includes(f.type)) {
      return `Unsupported format "${f.type}". Accepted: MP4, MOV, AVI, MKV, WebM and common variants.`;
    }
    if (f.size > UPLOAD_LIMITS.VIDEO_MAX_BYTES) {
      return `File is ${formatBytes(f.size)} — exceeds the ${formatBytes(UPLOAD_LIMITS.VIDEO_MAX_BYTES)} limit.`;
    }
    return null;
  }

  function validateThumbFile(f: File): string | null {
    const allowedTypes = UPLOAD_LIMITS.ALLOWED_THUMB_TYPES as readonly string[];
    if (f.type && !allowedTypes.includes(f.type)) {
      return `Thumbnail must be JPEG, PNG, WebP, or GIF.`;
    }
    if (f.size > UPLOAD_LIMITS.THUMB_MAX_BYTES) {
      return `Thumbnail is ${formatBytes(f.size)} — max is ${formatBytes(UPLOAD_LIMITS.THUMB_MAX_BYTES)}.`;
    }
    return null;
  }

  // ── File picker ───────────────────────────────────────────────────────────
  function pick(f: File | null | undefined) {
    if (!f) return;
    const problem = validateVideoFile(f);
    if (problem) { setStatus(problem); return; }
    setStatus(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, UPLOAD_LIMITS.TITLE_MAX));
  }

  // ── Thumbnail upload ──────────────────────────────────────────────────────
  async function uploadThumb(f: File) {
    const problem = validateThumbFile(f);
    if (problem) { setStatus(problem); return; }

    setThumbBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setThumbBusy(false); setStatus("Sign in to upload a thumbnail."); return; }
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/thumb-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, f, { upsert: true, cacheControl: "3600" });
    if (error) { setThumbBusy(false); setStatus(`Thumbnail upload failed: ${error.message}`); return; }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setThumbUrl(data.publicUrl);
    setThumbBusy(false);
  }

  // ── Publish ───────────────────────────────────────────────────────────────
  async function publish() {
    if (!file) { setStatus("Add a video file first."); return; }
    if (!title.trim()) { setStatus("Add a title first."); return; }

    // Client-side pre-flight (mirrors server validation for instant feedback)
    const videoErr = validateVideoFile(file);
    if (videoErr) { setStatus(videoErr); return; }
    if (title.length > UPLOAD_LIMITS.TITLE_MAX) {
      setStatus(`Title must be ${UPLOAD_LIMITS.TITLE_MAX} characters or fewer.`); return;
    }
    if (description.length > UPLOAD_LIMITS.DESCRIPTION_MAX) {
      setStatus(`Description must be ${UPLOAD_LIMITS.DESCRIPTION_MAX.toLocaleString()} characters or fewer.`); return;
    }

    setBusy(true);
    setProgress(0);
    setStatus("Requesting upload slot…");

    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description,
        size: file.size,
        type: file.type || undefined,
        category,
        visibility,
        madeForKids: !kids, // "Not made for kids" checked => made_for_kids = false
        thumbnail: thumbUrl,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBusy(false);
      setStatus(json.error ?? "Failed to init upload.");
      return;
    }

    setStatus("Uploading…");
    const tus = await import("tus-js-client");
    const upload = new tus.Upload(file, {
      uploadUrl: json.uploadUrl,
      chunkSize: 8 * 1024 * 1024, // 8 MiB (≥5 MiB CF minimum, multiple of 256 KiB)
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onError: (err) => {
        setBusy(false);
        const resp = (err as { originalResponse?: { getStatus?: () => number } | null }).originalResponse;
        const httpStatus = resp?.getStatus?.();
        if (!httpStatus) {
          setStatus(
            "Upload was blocked before reaching our servers. This is almost always an ad-blocker, VPN, or privacy browser (e.g. Brave Shields). Turn off blocking for this site, or try a different browser or network.",
          );
        } else {
          setStatus(`Upload failed (HTTP ${httpStatus}). ${err.message}`);
        }
      },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => {
        setStatus("Uploaded. Processing on Cloudflare…");
        router.push(`/watch/${json.videoId}`);
      },
    });
    upload.start();
  }

  const titleOver = title.length > UPLOAD_LIMITS.TITLE_MAX;
  const descOver  = description.length > UPLOAD_LIMITS.DESCRIPTION_MAX;

  return (
    <div>
      {/* drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed py-14 text-center transition ${
          drag ? "border-teal bg-teal/5" : "border-edge bg-surface/40 hover:border-hair"
        }`}
      >
        <input ref={inputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => pick(e.target.files?.[0])} />
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2dd4b4" strokeWidth="1.6">
          <path d="M12 16V8M8 11l4-4 4 4" /><path d="M4 16a4 4 0 002 7h12a4 4 0 001-7.9" opacity="0.6" />
        </svg>
        <p className="mt-3 text-lg font-bold text-foam">{file ? file.name : "Drop your video here"}</p>
        <p className="text-sm text-teal">or Browse Files</p>
        <p className="mt-1 text-xs text-mist">
          MP4, MOV, AVI, MKV, WebM · up to {formatBytes(UPLOAD_LIMITS.VIDEO_MAX_BYTES)}
        </p>
      </div>

      {busy && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded bg-edge">
          <div className="h-full bg-sky transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="lt-label">Video Title</label>
              <span className={`text-xs tabular-nums ${titleOver ? "text-red-400" : "text-mist"}`}>
                {title.length}/{UPLOAD_LIMITS.TITLE_MAX}
              </span>
            </div>
            <input
              className="lt-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a title"
              maxLength={UPLOAD_LIMITS.TITLE_MAX + 20}
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="lt-label">Description</label>
              <span className={`text-xs tabular-nums ${descOver ? "text-red-400" : "text-mist"}`}>
                {description.length}/{UPLOAD_LIMITS.DESCRIPTION_MAX.toLocaleString()}
              </span>
            </div>
            <textarea
              className="lt-input min-h-[120px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your video…"
            />
          </div>
          <div>
            <label className="lt-label">Category</label>
            <select className="lt-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="lt-label">
              Thumbnail
              <span className="ml-1 text-xs font-normal text-mist">
                (JPEG/PNG/WebP/GIF · max {formatBytes(UPLOAD_LIMITS.THUMB_MAX_BYTES)})
              </span>
            </label>
            <input ref={thumbInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              hidden onChange={(e) => e.target.files?.[0] && uploadThumb(e.target.files[0])} />
            <button type="button" onClick={() => thumbInput.current?.click()} disabled={thumbBusy}
              className="relative flex aspect-video w-full items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-dashed border-edge text-sm text-teal transition hover:border-hair disabled:opacity-60">
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <><span className="text-lg leading-none">＋</span> {thumbBusy ? "Uploading…" : "Upload Custom"}</>
              )}
            </button>
            {thumbUrl && (
              <button type="button" onClick={() => setThumbUrl(null)} className="mt-1 text-xs text-mist hover:text-foam">
                Remove thumbnail
              </button>
            )}
          </div>
          <div>
            <label className="lt-label">Visibility</label>
            <div className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-edge">
              {(["public", "unlisted", "private"] as Visibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`py-2.5 text-sm font-semibold capitalize transition ${
                    visibility === v ? "bg-surface text-foam" : "text-mist hover:text-foam"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="lt-label">Audience</label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foam">
              <input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)} className="h-5 w-5 accent-sky" />
              Not made for kids
            </label>
          </div>
        </div>
      </div>

      {status && <p className="mt-4 text-sm text-mist">{status}</p>}

      <div className="mt-8 flex items-center justify-end gap-5">
        <button type="button" title="Drafts — coming soon" className="text-sm font-semibold text-mist hover:text-foam">Save Draft</button>
        <button type="button" title="Scheduling — coming soon" className="text-sm font-semibold text-mist hover:text-foam">Schedule</button>
        <button onClick={publish} disabled={busy || titleOver || descOver}
          className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? `Uploading ${progress}%` : "Publish Video"}
        </button>
      </div>
    </div>
  );
}
