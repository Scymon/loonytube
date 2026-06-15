"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    setStatus("Requesting upload slot…");

    // 1. Get a one-time direct-upload URL + the video id.
    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBusy(false);
      setStatus(json.error ?? "Failed to init upload.");
      return;
    }
    const { uploadURL, videoId } = json;

    // 2. Upload the file straight to Cloudflare (XHR for a progress bar).
    setStatus("Uploading…");
    const form = new FormData();
    form.append("file", file);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadURL);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("upload failed")));
      xhr.onerror = () => reject(new Error("network error"));
      xhr.send(form);
    }).catch((err) => {
      setBusy(false);
      setStatus(err.message);
    });

    // 3. Cloudflare now transcodes; the webhook flips status to "ready".
    setStatus("Uploaded. Processing on Cloudflare…");
    router.push(`/watch/${videoId}`);
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
