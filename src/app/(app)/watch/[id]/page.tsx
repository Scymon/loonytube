import { createClient } from "@/lib/supabase/server";
import { cfStreamToken } from "@/lib/cloudflare";
import StreamPlayer from "@/components/StreamPlayer";
import ProcessingWatcher from "@/components/ProcessingWatcher";
import WatchLayout from "@/components/watch/WatchLayout";
import type { SidebarProfile, SidebarVideo, TrendingTag } from "@/components/watch/WatchSidebar";

export const dynamic = "force-dynamic";

export default async function Watch({ params }: { params: Promise<{ id: string }> }) {
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
    .select("id, title, description, status, views, created_at, owner, visibility, thumbnail")
    .eq("id", id)
    .maybeSingle();

  if (!video) {
    return <p className="py-16 text-center text-mist">Video not found or still private.</p>;
  }

  if (video.status !== "ready") {
    return (
      <div className="py-16 text-center text-mist">
        <ProcessingWatcher videoId={id} />
        <p className="text-xl">Processing on Cloudflare...</p>
        <p className="mt-2 text-sm">This page refreshes automatically when ready.</p>
      </div>
    );
  }

  const { data: { user: viewer } } = await supabase.auth.getUser();
  const viewerId = viewer?.id ?? null;

  const { data: channel } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", video.owner)
    .maybeSingle();

  const token = video.visibility === "private" ? await cfStreamToken(id) : null;

  const { data: relatedRaw } = await supabase
    .from("videos")
    .select("id, title, thumbnail, views, created_at, duration")
    .eq("owner", video.owner)
    .eq("status", "ready")
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(10);
  const relatedVideos: SidebarVideo[] = relatedRaw ?? [];

  let followedIds: string[] = [];
  let isFollowingChannel = false;
  if (viewerId) {
    const { data: follows } = await supabase
      .from("follows").select("followee").eq("follower", viewerId);
    followedIds = (follows ?? []).map((f: { followee: string }) => f.followee);
    isFollowingChannel = followedIds.includes(video.owner);
  }

  const { data: suggestRaw } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .neq("id", video.owner)
    .limit(20);
  const suggestedProfiles: SidebarProfile[] = (suggestRaw ?? [])
    .filter((p: SidebarProfile) => p.id !== viewerId && !followedIds.includes(p.id))
    .slice(0, 5);

  const { data: tagRows } = await supabase.from("post_hashtags").select("tag").limit(200);
  const tagMap: Record<string, number> = {};
  for (const row of tagRows ?? []) tagMap[row.tag] = (tagMap[row.tag] ?? 0) + 1;
  const trendingTags: TrendingTag[] = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => ({ tag, count }));

  return (
    <WatchLayout
      videoId={id}
      token={token}
      poster={video.thumbnail ?? undefined}
      title={video.title}
      description={video.description ?? null}
      views={video.views ?? 0}
      createdAt={video.created_at}
      owner={video.owner}
      channelUsername={channel?.username ?? null}
      channelName={channel?.full_name ?? null}
      channelAvatar={channel?.avatar_url ?? null}
      signedInUserId={viewerId}
      isFollowing={isFollowingChannel}
      channelHandle={channel?.username ?? video.owner}
      relatedVideos={relatedVideos}
      suggestedProfiles={suggestedProfiles}
      trendingTags={trendingTags}
      signedIn={!!viewerId}
    />
  );
}