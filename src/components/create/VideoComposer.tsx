"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_LIMITS } from "@/lib/upload-limits";

const CATEGORIES = [
  "Gaming", "Tech", "Education & Tech", "Music", "Sports",
  "Comedy", "News", "Science", "Design", "Food", "Finance",
];
type Visibility = "public" | "unlisted" | "private";
type ThumbMode = "none" | "auto0" | "auto1" | "auto2" | "scrub" | "file";
type UploadedStatus = "processing" | "ready" | "failed";

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(0)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Initial form state (used for reset too) ───────────────────────────────
function freshState() {
  return {
    file: null as File | null,
    title: "",
    description: "",
    category: "Gaming",
    visibility: "public" as Visibility,
    kids: true,
    thumbUrl: null as string | null,
    thumbBusy: false,
    autoThumbs: [null, null, null] as (string | null)[],
    thumbMode: "none" as ThumbMode,
    scrubTime: 0,
    videoDuration: 0,
    progress: 0,
    status: null as string | null,
    busy: false,
    drag: false,
  };
}

export default function VideoComposer() {
  const supabase = createClient();

  // ── Core state ────────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [kids, setKids] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  // ── Thumbnail state ───────────────────────────────────────────────────────
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [autoThumbs, setAutoThumbs] = useState<(string | null)[]>([null, null, null]);
  const [thumbMode, setThumbMode] = useState<ThumbMode>("none");
  const [scrubTime, setScrubTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // ── Post-upload done screen ───────────────────────────────────────────────
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [uploadedTitle, setUploadedTitle] = useState("");
  const [uploadedThumb, setUploadedThumb] = useState<string | null>(null);
  const [uploadedStatus, setUploadedStatus] = useState<UploadedStatus>("processing");

  // ── Refs ──────────────────────────────────────────────────────────────────
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbFileInput = useRef<HTMLInputElement>(null);
  const captureVidRef = useRef<HTMLVideoElement | null>(null);
  const scrubVidRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Revoke object URL on unmount
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  // ── Poll processing status after upload completes ─────────────────────────
  useEffect(() => {
    if (!uploadedId || uploadedStatus !== "processing") return;
    // Poll immediately, then every 5 s
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/sync-video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: uploadedId }),
        });
        if (!alive) return;
        if (res.ok) {
          const { status: s } = await res.json() as { status: string };
          if (s === "ready") setUploadedStatus("ready");
          else if (s === "failed") setUploadedStatus("failed");
        }
      } catch { /* ignore */ }
    }
    poll();
    const timer = setInterval(poll, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, [uploadedId, uploadedStatus]);

  // ── Validation ────────────────────────────────────────────────────────────
  function validateVideoFile(f: File): string | null {
    const allowed = UPLOAD_LIMITS.ALLOWED_VIDEO_TYPES as readonly string[];
    if (f.type && !allowed.includes(f.type))
      return `Unsupported format "${f.type}". Accepted: MP4, MOV, AVI, MKV, WebM and common variants.`;
    if (f.size > UPLOAD_LIMITS.VIDEO_MAX_BYTES)
      return `File is ${formatBytes(f.size)} — exceeds the ${formatBytes(UPLOAD_LIMITS.VIDEO_MAX_BYTES)} limit.`;
    return null;
  }
  function validateThumbFile(f: File): string | null {
    const allowed = UPLOAD_LIMITS.ALLOWED_THUMB_TYPES as readonly string[];
    if (f.type && !allowed.includes(f.type)) return "Thumbnail must be JPEG, PNG, WebP, or GIF.";
    if (f.size > UPLOAD_LIMITS.THUMB_MAX_BYTES)
      return `Thumbnail is ${formatBytes(f.size)} — max is ${formatBytes(UPLOAD_LIMITS.THUMB_MAX_BYTES)}.`;
    return null;
  }

  // ── Frame capture ─────────────────────────────────────────────────────────
  function captureFrameAt(vid: HTMLVideoElement, time: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("seek timeout")), 8000);
      vid.addEventListener("seeked", function onSeeked() {
        clearTimeout(timer);
        vid.removeEventListener("seeked", onSeeked);
        try {
          const c = document.createElement("canvas");
          c.width = vid.videoWidth || 640;
          c.height = vid.videoHeight || 360;
          c.getContext("2d")?.drawImage(vid, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.85));
        } catch (e) { reject(e); }
      }, { once: true });
      vid.currentTime = time;
    });
  }

  async function captureAutoThumbs(vid: HTMLVideoElement, dur: number) {
    const times = [dur * 0.25, dur * 0.5, dur * 0.75];
    const result: (string | null)[] = [null, null, null];
    for (let i = 0; i < times.length; i++) {
      try {
        result[i] = await captureFrameAt(vid, times[i]);
        setAutoThumbs([...result]);
      } catch { /* leave null */ }
    }
  }

  // ── Upload helpers ────────────────────────────────────────────────────────
  async function uploadDataUrl(dataUrl: string): Promise<string | null> {
    setThumbBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setThumbBusy(false); return null; }
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${user.id}/thumb-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("media").upload(path, blob, {
      contentType: "image/jpeg", upsert: true, cacheControl: "3600",
    });
    if (error) { setThumbBusy(false); setStatus(`Thumbnail upload failed: ${error.message}`); return null; }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setThumbBusy(false);
    return data.publicUrl;
  }

  async function uploadThumbFile(f: File) {
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
    setThumbMode("file");
    setThumbBusy(false);
  }

  // ── File picker ───────────────────────────────────────────────────────────
  function pick(f: File | null | undefined) {
    if (!f) return;
    const problem = validateVideoFile(f);
    if (problem) { setStatus(problem); return; }
    setStatus(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, UPLOAD_LIMITS.TITLE_MAX));
    setAutoThumbs([null, null, null]);
    setThumbMode("none");
    setThumbUrl(null);
    setScrubTime(0);
    setVideoDuration(0);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(f);
    objectUrlRef.current = url;
    const vid = document.createElement("video");
    vid.preload = "auto";
    vid.muted = true;
    vid.playsInline = true;
    vid.src = url;
    captureVidRef.current = vid;
    vid.addEventListener("loadedmetadata", () => {
      const dur = vid.duration;
      if (!isFinite(dur) || dur <= 0) return;
      setVideoDuration(dur);
      setScrubTime(Math.min(dur * 0.5, dur));
      captureAutoThumbs(vid, dur);
    });
  }

  async function selectAutoThumb(i: number) {
    const dataUrl = autoThumbs[i];
    if (!dataUrl) return;
    setThumbMode(`auto${i}` as ThumbMode);
    const url = await uploadDataUrl(dataUrl);
    if (url) setThumbUrl(url);
  }

  async function confirmScrubFrame() {
    const vid = scrubVidRef.current;
    if (!vid) return;
    const c = document.createElement("canvas");
    c.width = vid.videoWidth || 640;
    c.height = vid.videoHeight || 360;
    c.getContext("2d")?.drawImage(vid, 0, 0, c.width, c.height);
    const url = await uploadDataUrl(c.toDataURL("image/jpeg", 0.85));
    if (url) setThumbUrl(url);
  }

  // ── Publish ───────────────────────────────────────────────────────────────
  async function publish() {
    if (!file) { setStatus("Add a video file first."); return; }
    if (!title.trim()) { setStatus("Add a title first."); return; }
    const videoErr = validateVideoFile(file);
    if (videoErr) { setStatus(videoErr); return; }
    if (title.length > UPLOAD_LIMITS.TITLE_MAX) {
      setStatus(`Title must be ${UPLOAD_LIMITS.TITLE_MAX} characters or fewer.`); return;
    }
    if (description.length > UPLOAD_LIMITS.DESCRIPTION_MAX) {
      setStatus(`Description must be ${UPLOAD_LIMITS.DESCRIPTION_MAX.toLocaleString()} characters or fewer.`); return;
    }
    setBusy(true); setProgress(0); setStatus("Requesting upload slot…");
    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(), description, size: file.size,
        type: file.type || undefined, category, visibility,
        madeForKids: !kids, thumbnail: thumbUrl,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setBusy(false); setStatus(json.error ?? "Failed to init upload."); return; }
    setStatus("Uploading…");
    const tus = await import("tus-js-client");
    const upload = new tus.Upload(file, {
      uploadUrl: json.uploadUrl,
      chunkSize: 8 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onError: (err) => {
        setBusy(false);
        const resp = (err as { originalResponse?: { getStatus?: () => number } | null }).originalResponse;
        const httpStatus = resp?.getStatus?.();
        setStatus(httpStatus
          ? `Upload failed (HTTP ${httpStatus}). ${err.message}`
          : "Upload was blocked before reaching our servers. This is almost always an ad-blocker, VPN, or privacy browser (e.g. Brave Shields). Turn off blocking for this site, or try a different browser or network.");
      },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => {
        // ↳ Stay in the modal — show the done/processing screen
        setBusy(false);
        setUploadedId(json.videoId);
        setUploadedTitle(title.trim());
        setUploadedThumb(thumbUrl);
        setUploadedStatus("processing");
      },
    });
    upload.start();
  }

  // ── Reset to upload another ───────────────────────────────────────────────
  function reset() {
    const s = freshState();
    setFile(s.file); setTitle(s.title); setDescription(s.description);
    setCategory(s.category); setVisibility(s.visibility); setKids(s.kids);
    setThumbUrl(s.thumbUrl); setThumbBusy(s.thumbBusy);
    setAutoThumbs(s.autoThumbs); setThumbMode(s.thumbMode);
    setScrubTime(s.scrubTime); setVideoDuration(s.videoDuration);
    setProgress(s.progress); setStatus(s.status); setBusy(s.busy); setDrag(s.drag);
    setUploadedId(null); setUploadedTitle(""); setUploadedThumb(null);
    setUploadedStatus("processing");
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    captureVidRef.current = null;
  }

  const titleOver = title.length > UPLOAD_LIMITS.TITLE_MAX;
  const descOver  = description.length > UPLOAD_LIMITS.DESCRIPTION_MAX;
  const autoCapturing = !!file && autoThumbs.some((t) => t === null);
  const scrubActive = thumbMode === "scrub";

  // ── ─── Done screen ───────────────────────────────────────────────────────
  if (uploadedId) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        {/* Thumbnail preview */}
        <div className="aspect-video w-56 overflow-hidden rounded-xl border border-edge bg-black shadow-lg">
          {uploadedThumb
            ? // eslint-disable-next-line @next/next/no-img-element
              <img src={uploadedThumb} alt="" className="h-full w-full object-cover" />
            : <div className="h-full w-full" style={{ background: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
        </div>

        {/* Title + status */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-foam">{uploadedTitle}</h2>

          {uploadedStatus === "processing" && (
            <div className="flex items-center justify-center gap-2 text-sm text-mist">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky" />
              </span>
              Processing on Cloudflare…
            </div>
          )}
          {uploadedStatus === "ready" && (
            <p className="text-sm font-semibold text-teal">✓ Ready to watch!</p>
          )}
          {uploadedStatus === "failed" && (
            <p className="text-sm text-red-400">Processing failed — check the Studio for details.</p>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {uploadedStatus === "ready" && (
            <Link href={`/watch/${uploadedId}`}
              className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-ink"
              style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
              Watch video
            </Link>
          )}
          <Link href="/studio/content"
            className="rounded-[10px] border border-edge bg-surface px-5 py-2.5 text-sm font-semibold text-foam hover:bg-edge/40">
            Go to Studio
          </Link>
          <button type="button" onClick={reset}
            className="rounded-[10px] border border-edge bg-surface px-5 py-2.5 text-sm font-semibold text-foam hover:bg-edge/40">
            Upload another
          </button>
        </div>

        <p className="max-w-xs text-xs text-mist">
          {uploadedStatus === "processing"
            ? "This usually takes a minute or two. You can close this and check the Studio later."
            : uploadedStatus === "ready"
            ? "Your video is live and visible to viewers."
            : "Your file was received but encoding failed. Try re-uploading."}
        </p>
      </div>
    );
  }

  // ── ─── Upload form ───────────────────────────────────────────────────────
  return (
    <div>
      {/* Drop zone */}
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
        {/* Left: title / description / category */}
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="lt-label">Video Title</label>
              <span className={`text-xs tabular-nums ${titleOver ? "text-red-400" : "text-mist"}`}>
                {title.length}/{UPLOAD_LIMITS.TITLE_MAX}
              </span>
            </div>
            <input className="lt-input" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a title" maxLength={UPLOAD_LIMITS.TITLE_MAX + 20} />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="lt-label">Description</label>
              <span className={`text-xs tabular-nums ${descOver ? "text-red-400" : "text-mist"}`}>
                {description.length}/{UPLOAD_LIMITS.DESCRIPTION_MAX.toLocaleString()}
              </span>
            </div>
            <textarea className="lt-input min-h-[120px]" value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your video…" />
          </div>
          <div>
            <label className="lt-label">Category</label>
            <select className="lt-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Right: thumbnail / visibility / audience */}
        <div className="space-y-5">
          {/* Thumbnail */}
          <div>
            <div className="flex items-baseline justify-between">
              <label className="lt-label">
                Thumbnail
                <span className="ml-1 text-xs font-normal text-mist">
                  (JPEG/PNG/WebP/GIF · max {formatBytes(UPLOAD_LIMITS.THUMB_MAX_BYTES)})
                </span>
              </label>
              {thumbMode !== "none" && (
                <button type="button" onClick={() => { setThumbUrl(null); setThumbMode("none"); }}
                  className="text-xs text-mist hover:text-foam">Clear</button>
              )}
            </div>

            {/* 4 panes */}
            <div className="grid grid-cols-4 gap-2">
              {([0, 1, 2] as const).map((i) => {
                const thumb = autoThumbs[i];
                const sel = thumbMode === (`auto${i}` as ThumbMode);
                return (
                  <button key={i} type="button"
                    onClick={() => selectAutoThumb(i)}
                    disabled={thumbBusy || (!thumb && !file)}
                    className={`group relative aspect-video overflow-hidden rounded-lg border-2 transition ${
                      sel ? "border-sky" : "border-edge hover:border-hair"
                    } bg-surface disabled:cursor-default`}
                  >
                    {thumb ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                        {sel && (
                          <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky">
                            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l3 3 5-5" /></svg>
                          </span>
                        )}
                      </>
                    ) : file && autoCapturing ? (
                      <div className="grid h-full w-full place-items-center">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-edge border-t-mist" />
                      </div>
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </button>
                );
              })}

              {/* Pane 3: scrubber */}
              <button type="button"
                onClick={() => setThumbMode("scrub")}
                disabled={!file || !videoDuration}
                className={`group relative aspect-video overflow-hidden rounded-lg border-2 transition ${
                  scrubActive ? "border-sky" : "border-edge hover:border-hair"
                } bg-surface disabled:cursor-default disabled:opacity-40`}
                title="Pick a custom frame"
              >
                {scrubActive && thumbUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l3 3 5-5" /></svg>
                    </span>
                  </>
                ) : (
                  <div className="grid h-full w-full place-items-center text-mist group-hover:text-foam">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <path d="M7 6V4M12 6V4M17 6V4M7 18v2M12 18v2M17 18v2" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  </div>
                )}
              </button>
            </div>

            {!file && <p className="mt-1.5 text-xs text-mist">Load a video to generate thumbnail suggestions.</p>}
            {file && autoCapturing && <p className="mt-1.5 text-xs text-mist">Generating suggestions…</p>}

            {/* Scrubber panel */}
            {scrubActive && objectUrlRef.current && videoDuration > 0 && (
              <div className="mt-2 overflow-hidden rounded-xl border border-sky/40 bg-surface">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={scrubVidRef} src={objectUrlRef.current} muted playsInline preload="auto"
                  className="w-full bg-black"
                  onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = scrubTime; }} />
                <div className="space-y-2 p-3">
                  <input type="range" min={0} max={videoDuration} step={0.033} value={scrubTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      setScrubTime(t);
                      if (scrubVidRef.current) scrubVidRef.current.currentTime = t;
                    }}
                    className="w-full accent-sky" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs tabular-nums text-mist">{formatTime(scrubTime)}</span>
                    <button type="button" onClick={confirmScrubFrame} disabled={thumbBusy}
                      className="rounded-lg bg-sky/20 px-3 py-1.5 text-xs font-semibold text-sky hover:bg-sky/30 disabled:opacity-50">
                      {thumbBusy ? "Uploading…" : "Use this frame"}
                    </button>
                    <span className="text-xs tabular-nums text-mist">{formatTime(videoDuration)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload custom image */}
            <input ref={thumbFileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              hidden onChange={(e) => e.target.files?.[0] && uploadThumbFile(e.target.files[0])} />
            <button type="button" onClick={() => thumbFileInput.current?.click()} disabled={thumbBusy}
              className="mt-2 text-xs text-mist hover:text-foam disabled:opacity-50">
              + Upload custom image
            </button>
          </div>

          {/* Visibility */}
          <div>
            <label className="lt-label">Visibility</label>
            <div className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-edge">
              {(["public", "unlisted", "private"] as Visibility[]).map((v) => (
                <button key={v} type="button" onClick={() => setVisibility(v)}
                  className={`py-2.5 text-sm font-semibold capitalize transition ${
                    visibility === v ? "bg-surface text-foam" : "text-mist hover:text-foam"
                  }`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="lt-label">Audience</label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foam">
              <input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)}
                className="h-5 w-5 accent-sky" />
              Not made for kids
            </label>
          </div>
        </div>
      </div>

      {status && <p className="mt-4 text-sm text-mist">{status}</p>}

      <div className="mt-8 flex items-center justify-end gap-5">
        <button type="button" title="Drafts — coming soon"
          className="text-sm font-semibold text-mist hover:text-foam">Save Draft</button>
        <button type="button" title="Scheduling — coming soon"
          className="text-sm font-semibold text-mist hover:text-foam">Schedule</button>
        <button onClick={publish} disabled={busy || titleOver || descOver}
          className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? `Uploading ${progress}%` : "Publish Video"}
        </button>
      </div>
    </div>
  );
}
