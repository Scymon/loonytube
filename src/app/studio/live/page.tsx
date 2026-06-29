"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LiveResult = {
  liveId: string;
  rtmpUrl: string;
  streamKey: string;
  whipUrl: string | null;
  title: string;
};

export default function GoLivePage() {
  const supabase = createClient();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiveResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Gate to signed-in users only
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setReady(true);
      }
    });
  }, [supabase, router]);

  async function createLiveInput() {
    if (!title.trim()) return;

    setLoading(true);
    setCopied(null);

    try {
      const res = await fetch("/api/live/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Failed to create live input");
        setLoading(false);
        return;
      }

      setResult(json);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Check console.");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  async function goLive() {
    if (!result) return;

    // For MVP we just mark it live manually.
    // In a later step we can call an update API or rely on webhook.
    const { error } = await supabase
      .from("live_streams")
      .update({ status: "live", started_at: new Date().toISOString() })
      .eq("id", result.liveId);

    if (error) {
      alert("Could not mark stream as live. Try again.");
      return;
    }

    // Go to the watch page (reuses the existing player)
    router.push(`/watch/${result.liveId}`);
  }

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">Checking authentication…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-loon/40 bg-panel text-loon">
          <span className="text-xl">◐</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Go Live</h1>
          <p className="text-sm text-gray-400">Start a live stream on LoonyTube</p>
        </div>
      </div>

      {!result ? (
        /* === CREATE FORM === */
        <div className="rounded-2xl border border-edge bg-panel p-8">
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-300">Stream Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Building the hybrid future live"
              className="w-full rounded-lg border border-edge bg-[#0a0e14] px-4 py-3 text-lg outline-none placeholder:text-gray-500 focus:border-loon"
              maxLength={120}
            />
          </div>

          <div className="mb-8">
            <label className="mb-2 block text-sm font-medium text-gray-300">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are we building today?"
              rows={3}
              className="w-full resize-y rounded-lg border border-edge bg-[#0a0e14] px-4 py-3 text-base outline-none placeholder:text-gray-500 focus:border-loon"
              maxLength={500}
            />
          </div>

          <button
            onClick={createLiveInput}
            disabled={loading || !title.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-loon py-4 text-lg font-semibold text-ink transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating live input…" : "Create Live Input"}
          </button>

          <p className="mt-4 text-center text-xs text-gray-500">
            This creates a private RTMP endpoint on Cloudflare Stream. You’ll get a stream key to use in OBS.
          </p>
        </div>
      ) : (
        /* === SUCCESS / INSTRUCTIONS === */
<div className="space-y-6">
  {/* Success header */}
  <div className="rounded-2xl border border-loon/60 bg-panel p-6">
    <div className="flex items-center gap-3">
      <div className="rounded-full bg-loon/10 px-3 py-1 text-xs font-semibold tracking-[2px] text-loon">
        LIVE INPUT READY
      </div>
      <div className="text-sm text-gray-400">ID: {result.liveId}</div>
    </div>
    <h2 className="mt-3 text-2xl font-semibold">{result.title}</h2>
    <p className="mt-1 text-gray-400">Your stream key and RTMP URL are below. Keep them private.</p>
  </div>

  {/* RTMP + Key */}
  <div className="rounded-2xl border border-edge bg-panel p-6">
    <div className="mb-4 flex items-center justify-between">
      <div className="font-semibold">RTMP (OBS + Mobile Apps)</div>
      <div className="text-xs text-loon">COPY THESE INTO OBS OR STREAMING APP</div>
    </div>

    {/* RTMP URL */}
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between text-xs uppercase tracking-widest text-gray-400">
        <span>RTMP URL</span>
        <button
          onClick={() => copyToClipboard(result.rtmpUrl, "rtmp")}
          className="rounded border border-edge px-3 py-0.5 text-[10px] hover:border-loon hover:text-loon"
        >
          {copied === "rtmp" ? "COPIED!" : "COPY"}
        </button>
      </div>
      <div className="font-mono break-all rounded-lg border border-edge bg-[#0a0e14] p-4 text-sm text-loon">
        {result.rtmpUrl}
      </div>
    </div>

    {/* Stream Key */}
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs uppercase tracking-widest text-gray-400">
        <span>STREAM KEY (SECRET)</span>
        <button
          onClick={() => copyToClipboard(result.streamKey, "key")}
          className="rounded border border-edge px-3 py-0.5 text-[10px] hover:border-loon hover:text-loon"
        >
          {copied === "key" ? "COPIED!" : "COPY"}
        </button>
      </div>
      <div className="font-mono break-all rounded-lg border border-red-500/40 bg-[#0a0e14] p-4 text-sm text-red-400">
        {result.streamKey}
      </div>
      <p className="mt-2 text-xs text-red-400/80">
        ⚠️ Never share this key. Anyone with it can stream to your channel.
      </p>
    </div>
  </div>

  {/* WHIP URL (for mobile / modern streaming) */}
  {result.whipUrl && (
    <div className="rounded-2xl border border-edge bg-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-semibold">WHIP (Mobile Browser / Modern Apps)</div>
        <div className="text-xs text-loon">NEWER & BETTER FOR PHONE</div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs uppercase tracking-widest text-gray-400">
          <span>WHIP URL</span>
          <button
            onClick={() => copyToClipboard(result.whipUrl!, "whip")}
            className="rounded border border-edge px-3 py-0.5 text-[10px] hover:border-loon hover:text-loon"
          >
            {copied === "whip" ? "COPIED!" : "COPY"}
          </button>
        </div>
        <div className="font-mono break-all rounded-lg border border-edge bg-[#0a0e14] p-4 text-sm text-loon">
          {result.whipUrl}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Use this with apps that support WHIP, or for future in-browser streaming from your phone.
        </p>
      </div>
    </div>
  )}

  {/* OBS Setup */}
  <div className="rounded-2xl border border-edge bg-panel p-6">
    <div className="mb-4 font-semibold">OBS Studio Setup (30 seconds)</div>

    <ol className="space-y-4 text-sm text-gray-300">
      <li className="flex gap-3">
        <span className="mt-0.5 inline-block h-5 w-5 flex-none rounded-full bg-loon/10 text-center text-xs font-mono leading-5 text-loon">1</span>
        <div>Open OBS → <span className="font-medium">Settings → Stream</span></div>
      </li>
      <li className="flex gap-3">
        <span className="mt-0.5 inline-block h-5 w-5 flex-none rounded-full bg-loon/10 text-center text-xs font-mono leading-5 text-loon">2</span>
        <div>
          Service: <span className="font-medium">Custom</span><br />
          Server: paste the <span className="font-mono text-loon">RTMP URL</span> above<br />
          Stream Key: paste the <span className="font-mono text-red-400">secret key</span> above
        </div>
      </li>
      <li className="flex gap-3">
        <span className="mt-0.5 inline-block h-5 w-5 flex-none rounded-full bg-loon/10 text-center text-xs font-mono leading-5 text-loon">3</span>
        <div>Click <span className="font-medium">Start Streaming</span> in OBS</div>
      </li>
    </ol>

    <div className="mt-6 rounded-xl border border-loon/30 bg-[#0a0e14] p-4 text-xs text-gray-400">
      Pro tip: Use 1080p60 or 720p60 with CBR 6000–8000 kbps for best quality on LoonyTube.
    </div>
  </div>

  {/* Action buttons */}
  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
    <button
      onClick={goLive}
      className="flex-1 rounded-xl bg-loon py-4 text-lg font-semibold text-ink transition active:scale-[0.985]"
    >
      I’m pushing from OBS — Go Live now
    </button>

    <button
      onClick={() => {
        setResult(null);
        setTitle("");
        setDescription("");
      }}
      className="flex-1 rounded-xl border border-edge py-4 text-lg font-medium text-gray-300 hover:border-gray-400"
    >
      Create another input
    </button>
  </div>

  <p className="text-center text-xs text-gray-500">
    Your stream will appear in the feed once you click “Go Live now”. You can end it anytime from the watch page.
  </p>
</div>
      )}
    </div>
  );
}
