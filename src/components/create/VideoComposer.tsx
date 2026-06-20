"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_LIMITS } from "@/lib/upload-limits";
import { ThumbnailPicker } from "@/components/ThumbnailPicker";

const CATEGORIES = [
  "Gaming", "Tech", "Education & Tech", "Music", "Sports",
  "Comedy", "News", "Science", "Design", "Food", "Finance",
];
type Visibility = "public" | "unlisted" | "private";
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

export default function VideoComposer({ onBack }: { onBack?: () => void } = {}) {
  const supabase = createClient();

  // ── Core upload state ─────────────────────────────────────────────────────
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
  // thumbPane: which selector (0/1/2) has the checkmark. null = custom/none.
  // showScrubber: whether the scrubber slider is visible (pane 4 is a toggle).
  const [thumbPane, setThumbPane] = useState<0 | 1 | 2 | null>(null);
  const [showScrubber, setShowScrubber] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // ── Post-upload done screen ───────────────────────────────────────────────
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [uploadedTitle, setUploadedTitle] = useState("");
  const [uploadedThumb, setUploadedThumb] = useState<string | null>(null);
  const [uploadedStatus, setUploadedStatus] = useState<UploadedStatus>("processing");

  // ── Refs ──────────────────────────────────────────────────────────────────
  const inputRef = useRef<HTMLInputElement>(null);
  // Single video element used for BOTH frame capture and scrubbing.
  // Keeping it in the DOM is critical — off-screen detached video elements
  // do not guarantee decoded frames, causing all captured stills to look identical.
  const vidRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const autoSelectedRef = useRef(false);
  const capturingRef = useRef(false); // prevent concurrent capture runs

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  // ── Poll processing status after upload ───────────────────────────────────
  useEffect(() => {
    if (!uploadedId || uploadedStatus !== "processing") return;
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

  // ── Trigger frame capture when a new file is loaded ───────────────────────
  // We wait for the video element (vidRef) — which is always in the DOM — to
  // report loadedmetadata, then sequentially capture frames from it.
  // Using a DOM-mounted video is the only reliable cross-browser way to get
  // distinct decoded frames at different seek positions.
  useEffect(() => {
    if (!file) return;
    autoSelectedRef.current = false;
    capturingRef.current = false;

    const vid = vidRef.current;
    if (!vid) return;

    function onMeta() {
      const dur = vid!.duration;
      if (!isFinite(dur) || dur <= 0) return;
      setVideoDuration(dur);
      const mid = dur * 0.5;
      setScrubTime(mid);
      vid!.currentTime = mid;
      if (!capturingRef.current) {
        capturingRef.current = true;
        captureAutoThumbs(vid!, dur);
      }
    }

    // readyState >= 1 means HAVE_METADATA — might already be loaded
    if (vid.readyState >= 1) {
      onMeta();
    } else {
      vid.addEventListener("loadedmetadata", onMeta, { once: true });
      return () => vid.removeEventListener("loadedmetadata", onMeta);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

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
  // Seek the video to `time` and capture once the frame is actually painted.
  // requestAnimationFrame after `seeked` is required because `seeked` fires when
  // the position is set, not when the decoded frame is ready to read from canvas.
  function captureFrameAt(vid: HTMLVideoElement, time: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("seek timeout")), 8000);
      const onSeeked = () => {
        clearTimeout(timer);
        requestAnimationFrame(() => {
          try {
            const c = document.createElement("canvas");
            c.width = vid.videoWidth || 640;
            c.height = vid.videoHeight || 360;
            c.getContext("2d")?.drawImage(vid, 0, 0, c.width, c.height);
            resolve(c.toDataURL("image/jpeg", 0.85));
          } catch (e) { reject(e); }
        });
      };
      vid.addEventListener("seeked", onSeeked, { once: true });
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
        // Auto-select pane 0 the moment the first frame arrives
        if (i === 0 && !autoSelectedRef.current && result[0]) {
          autoSelectedRef.current = true;
          uploadDataUrl(result[0]).then((url) => {
            if (url) { setThumbUrl(url); setThumbPane(0); }
          });
        }
      } catch { /* leave null — timeout or decode failure */ }
    }
    // Restore video to scrub position after capture is done
    if (vidRef.current) vidRef.current.currentTime = scrubTime;
    capturingRef.current = false;
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
    setThumbPane(null);
    setShowScrubber(false);
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
    setThumbUrl(null);
    setThumbPane(null);
    setShowScrubber(false);
    setScrubTime(0);
    setVideoDuration(0);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(f);
    // Do NOT create a detached video element here.
    // The useEffect([file]) will trigger capture via the DOM-mounted vidRef.
  }

  // ── Pane selection ────────────────────────────────────────────────────────
  async function selectPane(i: 0 | 1 | 2) {
    const dataUrl = autoThumbs[i];
    if (!dataUrl || thumbBusy) return;
    setThumbPane(i);
    setShowScrubber(false);
    const url = await uploadDataUrl(dataUrl);
    if (url) setThumbUrl(url);
  }

  async function confirmScrubFrame() {
    const vid = vidRef.current;
    if (!vid) return;
    const c = document.createElement("canvas");
    c.width = vid.videoWidth || 640;
    c.height = vid.videoHeight || 360;
    c.getContext("2d")?.drawImage(vid, 0, 0, c.width, c.height);
    const url = await uploadDataUrl(c.toDataURL("image/jpeg", 0.85));
    if (url) {
      setThumbUrl(url);
      setThumbPane(null);
    }
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
    new tus.Upload(file, {
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
        setBusy(false);
        setUploadedId(json.videoId);
        setUploadedTitle(title.trim());
        setUploadedThumb(thumbUrl);
        setUploadedStatus("processing");
      },
    }).start();
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    setFile(null); setTitle(""); setDescription(""); setCategory(CATEGORIES[0]);
    setVisibility("public"); setKids(true);
    setThumbUrl(null); setThumbBusy(false);
    setAutoThumbs([null, null, null]); setThumbPane(null); setShowScrubber(false);
    setScrubTime(0); setVideoDuration(0);
    setProgress(0); setStatus(null); setBusy(false); setDrag(false);
    setUploadedId(null); setUploadedTitle(""); setUploadedThumb(null);
    setUploadedStatus("processing");
    autoSelectedRef.current = false;
    capturingRef.current = false;
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
  }

  const titleOver = title.length > UPLOAD_LIMITS.TITLE_MAX;
  const descOver  = description.length > UPLOAD_LIMITS.DESCRIPTION_MAX;

  // ── Done screen ───────────────────────────────────────────────────────────
  if (uploadedId) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="aspect-video w-56 overflow-hidden rounded-xl border border-edge bg-black shadow-lg">
          {uploadedThumb
            ? <img src={uploadedThumb} alt="" className="h-full w-full object-cover" />
            : <div className="h-full w-full" style={{ background: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
        </div>
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
          {uploadedStatus === "ready"  && <p className="text-sm font-semibold text-teal">✓ Ready to watch!</p>}
          {uploadedStatus === "failed" && <p className="text-sm text-red-400">Processing failed — check the Studio for details.</p>}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {uploadedStatus === "ready" && (
            <Link href={`/watch/${uploadedId}`}
              className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-ink"
              style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
              Watch video
            </Link>
          )}
          {onBack ? (
            <button type="button" onClick={onBack}
              className="rounded-[10px] border border-edge bg-surface px-5 py-2.5 text-sm font-semibold text-foam hover:bg-edge/40">
              Go to Studio
            </button>
          ) : (
            <Link href="/studio/content"
              className="rounded-[10px] border border-edge bg-surface px-5 py-2.5 text-sm font-semibold text-foam hover:bg-edge/40">
              Go to Studio
            </Link>
          )}
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

  // Determine which static image to show over the video when not scrubbing
  const staticFrame: string | null =
    (thumbPane !== null ? autoThumbs[thumbPane] : null) ??
    thumbUrl ??
    autoThumbs[0];

  // ── Upload form ───────────────────────────────────────────────────────────
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
          {/* ── Thumbnail ─────────────────────────────────────────────── */}
          <div>
            <div className="flex items-baseline justify-between">
              <label className="lt-label">
                Thumbnail
                <span className="ml-1 text-xs font-normal text-mist">
                  (JPEG/PNG/WebP/GIF · max {formatBytes(UPLOAD_LIMITS.THUMB_MAX_BYTES)})
                </span>
              </label>
              {(thumbUrl || thumbPane !== null) && (
                <button type="button"
                  onClick={() => { setThumbUrl(null); setThumbPane(null); setShowScrubber(false); }}
                  className="text-xs text-mist hover:text-foam">Clear</button>
              )}
            </div>
            <ThumbnailPicker
              suggestions={autoThumbs as [string | null, string | null, string | null]}
              selectedPane={thumbPane}
              onSelectPane={selectPane}
              showScrubber={showScrubber}
              onToggleScrubber={() => file && videoDuration > 0 && setShowScrubber((v) => !v)}
              scrubberEnabled={!!file && videoDuration > 0}
              previewContent={file ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={vidRef}
                    src={objectUrlRef.current ?? undefined}
                    muted playsInline preload="auto"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {!showScrubber && (
                    <div className="absolute inset-0 z-10">
                      {staticFrame
                        ? <img src={staticFrame} alt="" className="h-full w-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                        : <div className="flex h-full w-full items-center justify-center bg-black/40">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-edge border-t-mist" />
                          </div>
                      }
                    </div>
                  )}
                </>
              ) : null}
              scrubberContent={file && videoDuration > 0 ? (
                <>
                  <input type="range" min={0} max={videoDuration} step={0.033} value={scrubTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      setScrubTime(t);
                      if (vidRef.current) vidRef.current.currentTime = t;
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
                </>
              ) : null}
              busy={thumbBusy}
              onFileSelect={uploadThumbFile}
              emptyHint={!file ? "Load a video to generate thumbnail suggestions." : undefined}
            />
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
        <button onClick={publish} disabled={busy || thumbBusy || titleOver || descOver}
          className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? `Uploading ${progress}%` : thumbBusy ? "Uploading thumbnail…" : "Publish Video"}
        </button>
      </div>
    </div>
  );
}
