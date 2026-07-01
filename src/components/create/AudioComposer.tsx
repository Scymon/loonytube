"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UPLOAD_LIMITS } from "@/lib/upload-limits";
import * as tus from "tus-js-client";

type Visibility = "public" | "unlisted" | "private";
import CategoryCombobox, { type Category } from "./CategoryCombobox";

function formatBytes(b: number) {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(0)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}

const AUDIO_ACCEPT = (UPLOAD_LIMITS.ALLOWED_AUDIO_TYPES as readonly string[]).join(",");
const COVER_ACCEPT = "image/jpeg,image/png,image/webp";

/* ── Icon helpers ──────────────────────────────────────────────────────── */
function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const MUSIC_ICON = "M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6z|M18 19a3 3 0 100-6 3 3 0 000 6z";
const IMG_ICON   = "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z|M12 17a4 4 0 100-8 4 4 0 000 8z";

export default function AudioComposer({ onComplete }: { onComplete?: (trackId: string) => void }) {
  const supabase = createClient();

  const [file,        setFile]        = useState<File | null>(null);
  const [title,       setTitle]       = useState("");
  const [description, setDesc]        = useState("");
  const [chapters,    setChapters]    = useState("");
  const [categoryId,  setCategoryId]  = useState<string>("");
  const [categories,  setCategories]  = useState<Category[]>([]);

  const [visibility,  setVisibility]  = useState<Visibility>("public");
  const [coverUrl,    setCoverUrl]    = useState<string | null>(null);
  const [coverPreview,setCoverPreview]= useState<string | null>(null);
  const [coverBusy,   setCoverBusy]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [status,      setStatus]      = useState<string | null>(null);
  const [busy,        setBusy]        = useState(false);
  const [drag,        setDrag]        = useState(false);
  const [converting,  setConverting]  = useState(false);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const convertAbortRef = useRef<(() => void) | null>(null);

  // Actual file sent to the TUS uploader — converted version takes priority
  const uploadFile = convertedFile ?? file;

  const fileRef  = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const objRef   = useRef<string | null>(null);

  useEffect(() => () => { if (objRef.current) URL.revokeObjectURL(objRef.current); }, []);

  // Fetch categories
  useEffect(() => {
    supabase.from("audio_categories").select("id,name,slug").order("name")
      .then(({ data }) => {
        if (data) {
          setCategories(data as Category[]);
          if (!categoryId && data.length) setCategoryId(data[0].id);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Validation ── */
  function audioError(f: File): string | null {
    const allowed = UPLOAD_LIMITS.ALLOWED_AUDIO_TYPES as readonly string[];
    if (!allowed.includes(f.type as never)) return `Unsupported format: ${f.type || "unknown"}`;
    if (f.size > UPLOAD_LIMITS.AUDIO_MAX_BYTES)
      return `File is ${formatBytes(f.size)} — max is ${formatBytes(UPLOAD_LIMITS.AUDIO_MAX_BYTES)}.`;
    return null;
  }

  /* ── File pick / drop ── */
  function pickFile(f: File) {
    const err = audioError(f);
    if (err) { setStatus(err); return; }
    setStatus(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, UPLOAD_LIMITS.TITLE_MAX));
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  /* ── Cover art upload ── */
  async function uploadCover(f: File) {
    if (!["image/jpeg","image/png","image/webp"].includes(f.type)) {
      setStatus("Cover must be JPEG, PNG, or WebP."); return;
    }
    if (f.size > UPLOAD_LIMITS.THUMB_MAX_BYTES) {
      setStatus(`Cover is ${formatBytes(f.size)} — max is ${formatBytes(UPLOAD_LIMITS.THUMB_MAX_BYTES)}.`); return;
    }
    setCoverBusy(true);
    const prev = URL.createObjectURL(f);
    setCoverPreview(prev);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCoverBusy(false); setStatus("Sign in to upload a cover."); return; }
    const ext  = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `covers/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("thumbnails").upload(path, f, { upsert: true });
    if (error) { setCoverBusy(false); setStatus(`Cover upload failed: ${error.message}`); return; }
    const { data: { publicUrl } } = supabase.storage.from("thumbnails").getPublicUrl(path);
    setCoverUrl(publicUrl);
    setCoverBusy(false);
  }

  /* ── Optional WebM/Opus conversion (for large WAV/FLAC files) ── */
  // Uses MediaRecorder — runs in real-time, so duration ≈ audio length.
  // For a 5-min WAV this takes ~5 min; progress bar reflects playback position.
  const CONVERT_THRESHOLD = 40 * 1024 * 1024; // show button above 40 MB
  const CONVERTIBLE_TYPES = ["audio/wav", "audio/x-wav", "audio/flac", "audio/x-flac"];
  const canConvert =
    !!file && !convertedFile && !converting &&
    CONVERTIBLE_TYPES.includes(file.type) &&
    file.size > CONVERT_THRESHOLD;

  async function convertToWebm() {
    if (!file) return;
    setConverting(true);
    setStatus("Converting audio to WebM/Opus…");
    setProgress(0);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodeCtx   = new AudioContext();
      const audioBuffer  = await decodeCtx.decodeAudioData(arrayBuffer);
      await decodeCtx.close();

      const playCtx  = new AudioContext();
      const dest     = playCtx.createMediaStreamDestination();
      const source   = playCtx.createBufferSource();
      source.buffer  = audioBuffer;
      source.connect(dest);

      const mimeType = "audio/webm;codecs=opus";
      const recorder = new MediaRecorder(dest.stream, { mimeType, audioBitsPerSecond: 192_000 });
      const chunks: BlobPart[] = [];

      let aborted = false;
      convertAbortRef.current = () => { aborted = true; recorder.stop(); };

      await new Promise<void>((resolve, reject) => {
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => (aborted ? reject(new Error("cancelled")) : resolve());
        recorder.onerror = () => reject(new Error("Conversion failed"));

        const duration = audioBuffer.duration * 1000;
        const startedAt = Date.now();
        const tick = setInterval(() => {
          setProgress(Math.min(95, Math.round(((Date.now() - startedAt) / duration) * 100)));
        }, 500);

        source.onended = () => { clearInterval(tick); recorder.stop(); void playCtx.close(); };
        recorder.start(1_000);
        source.start();
      });

      const blob      = new Blob(chunks, { type: mimeType });
      const converted = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, ".webm"),
        { type: "audio/webm" },
      );
      setConvertedFile(converted);
      setProgress(100);
      setStatus(`Compressed: ${formatBytes(file.size)} → ${formatBytes(converted.size)}`);
    } catch (e) {
      if (e instanceof Error && e.message !== "cancelled")
        setStatus("Conversion failed — you can still upload the original.");
      else setStatus(null);
      setConvertedFile(null);
    } finally {
      setConverting(false);
      convertAbortRef.current = null;
    }
  }

  /* ── Main upload ── */
  async function submit() {
    if (!file)         { setStatus("Add an audio file first."); return; }
    if (!title.trim()) { setStatus("Add a title first."); return; }
    const audioErr = audioError(file);
    if (audioErr) { setStatus(audioErr); return; }
    if (title.length > UPLOAD_LIMITS.TITLE_MAX) {
      setStatus(`Title must be ${UPLOAD_LIMITS.TITLE_MAX} characters or fewer.`); return;
    }

    // Read duration from local file before upload so it can be stored in DB
    let fileDurationSec: number | null = null;
    try {
      fileDurationSec = await new Promise<number | null>(resolve => {
        const a = document.createElement("audio");
        const url = URL.createObjectURL(uploadFile!);
        a.preload = "metadata";
        a.onloadedmetadata = () => { URL.revokeObjectURL(url); const d = a.duration; resolve(isFinite(d) && d > 0 ? Math.round(d) : null); };
        a.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        a.src = url;
      });
    } catch {}

    setBusy(true); setProgress(0); setStatus("Uploading…");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to upload audio.");

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const extMap: Record<string, string> = {
        "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a",
        "audio/wav": "wav", "audio/x-wav": "wav",
        "audio/flac": "flac", "audio/x-flac": "flac",
        "audio/ogg": "ogg", "audio/aac": "aac", "audio/webm": "webm",
      };
      const ext = extMap[uploadFile!.type] ?? "audio";
      const storagePath = `${user.id}/${Date.now()}.${ext}`;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Resumable TUS upload — chunks the file, retries on hiccups,
      // and works with files well above Supabase's single-request 50 MB cap.
      // Note: the audio-files bucket max-file-size must also be raised in the
      // Supabase dashboard (Storage → audio-files → Edit) to match AUDIO_MAX_BYTES.
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(uploadFile!, {
          endpoint:                    `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays:                 [0, 3_000, 5_000, 10_000, 20_000],
          headers: {
            authorization: `Bearer ${token ?? supabaseKey}`,
            "x-upsert":    "false",
          },
          uploadDataDuringCreation:    true,
          removeFingerprintOnSuccess:  true,
          metadata: {
            bucketName:   "audio-files",
            objectName:   storagePath,
            contentType:  uploadFile!.type || "audio/mpeg",
            cacheControl: "3600",
          },
          chunkSize:  6 * 1024 * 1024, // 6 MB — Supabase recommended chunk size
          onError:    (err) => reject(new Error(`Upload failed: ${err.message}`)),
          onProgress: (bytesUploaded, bytesTotal) =>
            setProgress(Math.round((bytesUploaded / bytesTotal) * 100)),
          onSuccess:  () => resolve(),
        });
        upload.start();
      });

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/audio-files/${storagePath}`;
      const vis = visibility as string;

      const { data: row, error: insertError } = await supabase
        .from("audio_tracks")
        .insert({
          owner:       user.id,
          title:       title.trim(),
          description: description || null,
          status:      "ready",
          visibility:  vis,
          category_id: categoryId || null,
          cover_url:   coverUrl   || null,
          chapters:    chapters   || null,
          url:         publicUrl,
          duration:    fileDurationSec,
        })
        .select("id")
        .single();

      if (insertError || !row) {
        // Best-effort cleanup of the storage object
        await supabase.storage.from("audio-files").remove([storagePath]);
        throw new Error(insertError?.message ?? "DB insert failed");
      }

      const trackId = row.id as string;
      reset();
      onComplete?.(trackId);
    } catch (e) {
      setBusy(false);
      setStatus(e instanceof Error ? e.message : "Upload failed");
    }
  }

  function reset() {
    convertAbortRef.current?.();
    setFile(null); setTitle(""); setDesc(""); setChapters(""); setVisibility("public");
    setCoverUrl(null); setCoverPreview(null); setProgress(0); setStatus(null);
    setBusy(false); setDrag(false); setConverting(false); setConvertedFile(null);
    if (objRef.current) { URL.revokeObjectURL(objRef.current); objRef.current = null; }
  }

  const titleOver = title.length > UPLOAD_LIMITS.TITLE_MAX;
  const descOver  = description.length > UPLOAD_LIMITS.DESCRIPTION_MAX;

  /* ── Render ── */
  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onClick={() => !file && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3
          rounded-2xl border-2 border-dashed transition-all duration-200
          ${drag ? "border-teal bg-teal/10 scale-[1.01]"
          : file ? "border-teal/40 bg-teal/5 cursor-default"
          : "border-edge hover:border-teal/50 hover:bg-edge/30"}`}
      >
        {file ? (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal">
              <Icon d={MUSIC_ICON} size={22} />
            </div>
            <p className="text-sm font-semibold text-foam">{file.name}</p>
            <p className="text-xs text-mist">{formatBytes(file.size)}</p>
            <button onClick={e => { e.stopPropagation(); reset(); }}
              className="text-xs text-mist/50 hover:text-red-400 transition-colors mt-1">
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-edge text-mist">
              <Icon d={MUSIC_ICON} size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foam">Drop audio file here</p>
              <p className="text-xs text-mist mt-0.5">MP3, M4A, WAV, FLAC, OGG, AAC — up to {formatBytes(UPLOAD_LIMITS.AUDIO_MAX_BYTES)}</p>
            </div>
            <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
              className="rounded-lg border border-edge px-4 py-2 text-xs font-semibold text-mist hover:text-foam hover:border-foam/40 transition-colors">
              Browse files
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept={AUDIO_ACCEPT} className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
      </div>

      {/* Cover art + metadata side-by-side */}
      <div className="flex gap-5">
        {/* Cover art */}
        <div className="shrink-0">
          <button onClick={() => coverRef.current?.click()}
            className={`relative grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-edge
              bg-surface text-mist hover:border-teal/40 transition-colors ${coverBusy ? "opacity-60" : ""}`}>
            {coverPreview
              ? <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
              : <Icon d={IMG_ICON} size={28} />
            }
            <span className="absolute inset-0 flex items-center justify-center bg-black/50
              opacity-0 hover:opacity-100 transition-opacity text-xs font-semibold text-white">
              {coverBusy ? "Uploading…" : "Add cover"}
            </span>
          </button>
          <input ref={coverRef} type="file" accept={COVER_ACCEPT} className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }} />
          <p className="mt-1 text-center text-[10px] text-mist/50">Cover art</p>
        </div>

        {/* Title + category + visibility */}
        <div className="flex-1 space-y-3">
          <div>
            <input type="text" placeholder="Title"
              value={title} onChange={e => setTitle(e.target.value)} maxLength={UPLOAD_LIMITS.TITLE_MAX + 10}
              className={`lt-input w-full text-sm font-semibold ${titleOver ? "border-red-500" : ""}`} />
            {titleOver && <p className="mt-1 text-xs text-red-400">{title.length}/{UPLOAD_LIMITS.TITLE_MAX}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CategoryCombobox
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              onAdd={cat => setCategories(prev =>
                [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))}
            />
            <select value={visibility} onChange={e => setVisibility(e.target.value as Visibility)}
              className="lt-input text-sm">
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <textarea placeholder="Description (optional)"
          value={description} onChange={e => setDesc(e.target.value)}
          rows={3} className={`lt-input w-full resize-none text-sm ${descOver ? "border-red-500" : ""}`} />
        {descOver && <p className="mt-1 text-xs text-red-400">{description.length}/{UPLOAD_LIMITS.DESCRIPTION_MAX.toLocaleString()}</p>}
      </div>

      {/* Chapters */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-mist/70">
          Chapters <span className="font-normal text-mist/40">(optional — one per line: 0:00 Intro)</span>
        </label>
        <textarea placeholder={"0:00 Intro\n5:30 Chapter 1\n22:15 Chapter 2"}
          value={chapters} onChange={e => setChapters(e.target.value)}
          rows={4} className="lt-input w-full resize-none font-mono text-xs" />
      </div>

      {/* Convert option — shown for large WAV/FLAC before upload */}
      {canConvert && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-400">Large file detected</p>
            <p className="text-[11px] text-mist/60 mt-0.5">
              {formatBytes(file!.size)} WAV/FLAC — convert to WebM/Opus for a ~8× smaller upload.
              Conversion runs in real-time (roughly equal to track duration).
            </p>
          </div>
          <button
            type="button"
            onClick={convertToWebm}
            className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold
              text-amber-300 hover:bg-amber-500/30 transition-colors">
            Convert
          </button>
        </div>
      )}
      {converting && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
            <div className="h-full rounded-full bg-amber-400 transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-400/80">{status} {progress}%</p>
            <button type="button" onClick={() => convertAbortRef.current?.()}
              className="text-xs text-mist/40 hover:text-red-400 transition-colors">Cancel</button>
          </div>
        </div>
      )}
      {convertedFile && !converting && (
        <div className="flex items-center gap-2 rounded-xl border border-teal/30 bg-teal/5 px-4 py-2.5">
          <svg className="shrink-0 text-teal" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="flex-1 text-xs text-teal/80">
            Converted to WebM/Opus — {formatBytes(convertedFile.size)}
          </p>
          <button type="button" onClick={() => { setConvertedFile(null); setStatus(null); }}
            className="text-[11px] text-mist/40 hover:text-mist transition-colors">Undo</button>
        </div>
      )}

      {/* Progress + submit */}
      {busy && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
            <div className="h-full rounded-full bg-teal transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-mist">{status} {progress > 0 && `${progress}%`}</p>
        </div>
      )}
      {!busy && status && (
        <p className={`text-sm ${status.includes("fail") || status.includes("exceed") || status.includes("Add") || status.includes("must") || status.includes("Unsupported") || status.includes("blocked") ? "text-red-400" : "text-teal"}`}>
          {status}
        </p>
      )}

      <button onClick={submit} disabled={busy || converting || !file}
        className="w-full rounded-xl bg-teal py-3 text-sm font-bold text-black
          hover:bg-teal/90 disabled:opacity-40 disabled:pointer-events-none transition-colors">
        {busy ? `Uploading… ${progress}%` : "Publish audio"}
      </button>
    </div>
  );
}
