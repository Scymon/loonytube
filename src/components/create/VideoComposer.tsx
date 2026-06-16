"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";

const CATEGORIES = [
  "Gaming", "Tech", "Education & Tech", "Music", "Sports",
  "Comedy", "News", "Science", "Design", "Food", "Finance",
];
type Visibility = "public" | "unlisted" | "private";

export default function VideoComposer() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [kids, setKids] = useState(true); // checkbox label is "Not made for kids"
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null | undefined) {
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function publish() {
    if (!file || !title) {
      setStatus("Add a video file and a title first.");
      return;
    }
    setBusy(true);
    setProgress(0);
    setStatus("Requesting upload slot…");

    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        size: file.size,
        category,
        visibility,
        madeForKids: !kids, // "Not made for kids" checked => made_for_kids = false
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBusy(false);
      setStatus(json.error ?? "Failed to init upload.");
      return;
    }

    setStatus("Uploading…");
    const upload = new tus.Upload(file, {
      uploadUrl: json.uploadUrl,
      chunkSize: 50 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onError: (err) => {
        setBusy(false);
        setStatus(`Upload failed: ${err.message}`);
      },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => {
        setStatus("Uploaded. Processing on Cloudflare…");
        router.push(`/watch/${json.videoId}`);
      },
    });
    upload.start();
  }

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
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2dd4b4" strokeWidth="1.6">
          <path d="M12 16V8M8 11l4-4 4 4" /><path d="M4 16a4 4 0 002 7h12a4 4 0 001-7.9" opacity="0.6" />
        </svg>
        <p className="mt-3 text-lg font-bold text-foam">{file ? file.name : "Drop your video here"}</p>
        <p className="text-sm text-teal">or Browse Files</p>
        <p className="mt-1 text-xs text-mist">MP4, MOV, AVI up to 10GB</p>
      </div>

      {busy && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded bg-edge">
          <div className="h-full bg-sky transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-5">
          <div>
            <label className="lt-label">Video Title</label>
            <input className="lt-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a title" />
          </div>
          <div>
            <label className="lt-label">Description</label>
            <textarea className="lt-input min-h-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell viewers about your video…" />
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
            <label className="lt-label">Thumbnail</label>
            <button type="button" title="Custom thumbnails — coming soon" className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-edge py-3 text-sm text-teal hover:border-hair">
              <span className="text-lg leading-none">＋</span> Upload Custom
            </button>
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
        <button onClick={publish} disabled={busy} className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? `Uploading ${progress}%` : "Publish Video"}
        </button>
      </div>
    </div>
  );
}
