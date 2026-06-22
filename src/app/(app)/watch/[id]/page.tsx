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

  // Private videos require a short-lived signed token to play. We only reach here
  // for videos the viewer is allowed to read (RLS), so minting is safe.
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
