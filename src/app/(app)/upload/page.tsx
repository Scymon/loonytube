"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";

export default function UploadPage() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Gate the page to signed-in users.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else setReady(true);
    });
  }, [supabase, router]);

  async function start() {
    if (!file || !title) {
      setStatus("Pick a file and a title first.");
      return;
    }
    setBusy(true);
    setProgress(0);
    setStatus("Requesting upload slot…");

    // 1. Server creates a TUS upload and returns a credential-free upload URL + video id.
    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, size: file.size }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBusy(false);
      setStatus(json.error ?? "Failed to init upload.");
      return;
    }
    const { uploadUrl, videoId } = json;

    // 2. Resumable, chunked upload straight to Cloudflare. No token in the browser,
    //    no size ceiling, and it auto-retries dropped connections.
    setStatus("Uploading…");
    const upload = new tus.Upload(file, {
      uploadUrl, // pre-created URL from our server (skips tus client-side creation)
      chunkSize: 50 * 1024 * 1024, // 50MB — Cloudflare requires a multiple of 256KiB
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onError: (err) => {
        setBusy(false);
        setStatus(`Upload failed: ${err.message}`);
      },
      onProgress: (sent, total) => {
        setProgress(Math.round((sent / total) * 100));
      },
      onSuccess: () => {
        setStatus("Uploaded. Processing on Cloudflare…");
        router.push(`/watch/${videoId}`);
      },
    });
    upload.start();
  }

  if (!ready) return <p className="py-16 text-center text-gray-400">…</p>;

  return (
    <div className="mx-auto max-w-xl py-10">
      <h1 className="mb-6 text-2xl font-bold">Upload a video</h1>
      <div className="space-y-4">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-edge bg-panel px-3 py-2 outline-none focus:border-loon"
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded border border-edge bg-panel px-3 py-2 outline-none focus:border-loon"
        />
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-edge file:px-3 file:py-2 file:text-white"
        />
        {busy && (
          <div className="h-2 w-full overflow-hidden rounded bg-edge">
            <div className="h-full bg-loon transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <button
          onClick={start}
          disabled={busy}
          className="w-full rounded bg-loon py-2 font-semibold text-ink hover:opacity-90 disabled:opacity-50"
        >
          {busy ? `Uploading ${progress}%` : "Upload"}
        </button>
        {status && <p className="text-sm text-gray-400">{status}</p>}
      </div>
    </div>
  );
}
