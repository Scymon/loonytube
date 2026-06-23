import { createClient } from "@/lib/supabase/server";
import { cfStreamToken } from "@/lib/cloudflare";
import StreamPlayer from "@/components/StreamPlayer";
import LikeButton from "@/components/LikeButton";
import Comments from "@/components/Comments";
import WatchClient from "@/components/watch/WatchClient";
import ProcessingWatcher from "@/components/ProcessingWatcher";

export const dynamic = "force-dynamic";

export default async function Watch({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // ============================================
  // 1. Check if this is a LIVE stream first
  // ============================================
  const { data: live } = await supabase
    .from("live_streams")
    .select("id, title, description, status, started_at")
    .eq("id", id)
    .maybeSingle();

  if (live) {
    if (live.status !== "live") {
      return (
        <div className="py-16 text-center text-gray-400">
          <p className="text-xl">Stream is not live yet.</p>
          <p className="mt-2 text-sm">Waiting for OBS to connect...</p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded bg-red-600 px-3 py-0.5 text-xs font-bold tracking-[2px] text-white">
            LIVE
          </div>
          <h1 className="text-2xl font-bold">{live.title}</h1>
        </div>

        <StreamPlayer uid={id} />

        {live.description && (
          <p className="mt-4 whitespace-pre-wrap rounded-lg border border-edge bg-panel p-4 text-sm text-gray-300">
            {live.description}
          </p>
        )}

        <div className="mt-8 text-sm text-gray-400">
          Live chat coming soon...
        </div>
      </div>
    );
  }

  // ============================================
  // 2. Normal video flow (your existing logic)
  // ============================================
  const { data: video } = await supabase
    .from("videos")
    .select("id, title, description, status, views, created_at, owner, visibility")
    .eq("id", id)
    .maybeSingle();

  if (!video) {
    return (
      <p className="py-16 text-center text-gray-400">
        Video not found — or still private while it processes.
      </p>
    );
  }

  if (video.status !== "ready") {
    return (
      <div className="py-16 text-center text-gray-400">
        <ProcessingWatcher videoId={id} />
        <p className="text-xl">Processing on Cloudflare…</p>
        <p className="mt-2 text-sm">This page refreshes automatically when it&apos;s ready.</p>
      </div>
    );
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", video.owner)
    .maybeSingle();

  const token = video.visibility === "private" ? await cfStreamToken(id) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <StreamPlayer uid={id} token={token} />
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{video.title}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {prof?.username ?? "someone"} · {video.views} views
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WatchClient videoId={id} />
          <LikeButton videoId={id} />
        </div>
      </div>
      {video.description && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg border border-edge bg-panel p-4 text-sm text-gray-300">
          {video.description}
        </p>
      )}
      <Comments videoId={id} />
    </div>
  );
}