import { createClient } from "@/lib/supabase/server";
import { cfStreamToken, signCfMediaUrl } from "@/lib/cloudflare";
import StreamPlayer from "@/components/StreamPlayer";
import ProcessingWatcher from "@/components/ProcessingWatcher";
import WatchLayout from "@/components/watch/WatchLayout";
import type { SidebarProfile, SidebarVideo, TrendingTag } from "@/components/watch/WatchSidebar";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/pages";

export const dynamic = "force-dynamic";

// Link-preview cards (X, Facebook, iMessage, Discord, Slack). Without these a
// shared watch link renders as a bare URL with no title or thumbnail.
//
// Privacy: this runs with the visitor's cookies, so a crawler is anonymous and
// RLS already hides private rows. The explicit visibility check is belt and
// braces -- a private video must never leak its title or thumbnail into a card.
// Unlisted videos DO get a card (that is the point of a shareable link) but are
// marked noindex so they stay out of search results.
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: v } = await supabase
    .from("videos")
    .select("title, description, thumbnail, visibility, status")
    .eq("id", id)
    .maybeSingle();

  const shareable =
    v && v.status === "ready" && (v.visibility === "public" || v.visibility === "unlisted");

  if (!shareable) {
    return { title: "LoonyTube", robots: { index: false, follow: false } };
  }

  const url = `${SITE_URL}/watch/${id}`;
  const title = v.title?.trim() || "LoonyTube";
  const description =
    v.description?.trim().slice(0, 200) || "Watch. Post. Stream. All in one.";

  // Custom thumbnails are Supabase public URLs; otherwise fall back to the
  // Cloudflare frame. Both are absolute and unsigned for public/unlisted media.
  const image =
    v.thumbnail ||
    `https://videodelivery.net/${id}/thumbnails/thumbnail.jpg?time=1s&height=720`;

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(v.visibility === "unlisted" ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url,
      siteName: "LoonyTube",
      type: "video.other",
      images: [{ url: image, width: 1280, height: 720, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function Watch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // ============================================
  // 1. Gate queries — all independent, one parallel round-trip
  // ============================================
  const [
    { data: live },
    { data: video },
    { data: { user: viewer } },
    { data: tagRows },
  ] = await Promise.all([
    supabase.from("live_streams").select("id, title, description, status, started_at").eq("id", id).maybeSingle(),
    supabase.from("videos").select("id, title, description, status, views, created_at, owner, visibility, thumbnail").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from("post_hashtags").select("tag").limit(200),
  ]);

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

  const viewerId = viewer?.id ?? null;
  const isOwner = viewerId !== null && viewerId === video.owner;

  // Defense in depth. RLS should already hide private rows from everyone but the
  // owner, but this page also mints a Cloudflare playback token below -- so if a
  // private row ever reaches here for a non-owner (stale policy, service-role
  // client, bad migration), we stop before handing out a token.
  if (video.visibility === "private" && !isOwner) {
    return <p className="py-16 text-center text-mist">Video not found or still private.</p>;
  }

  // Everything below depends only on the video row — second parallel round-trip
  const [
    { data: channel },
    token,
    { data: relatedRaw },
    { data: follows },
    { data: suggestRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", video.owner).maybeSingle(),
    video.visibility === "private" ? cfStreamToken(id) : Promise.resolve(null),
    // Sidebar is discovery surface -> public only. Unlisted videos are reachable
    // by direct link but must never be listed here, and private rows are blocked
    // by RLS anyway.
    supabase.from("videos").select("id, title, thumbnail, views, created_at, duration").eq("owner", video.owner).eq("status", "ready").eq("visibility", "public").neq("id", id).order("created_at", { ascending: false }).limit(10),
    viewerId
      ? supabase.from("follows").select("followee").eq("follower", viewerId)
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("id, username, full_name, avatar_url").neq("id", video.owner).limit(20),
  ]);
  // The poster for a private video is a Cloudflare URL behind signed playback --
  // reuse the token we already minted rather than serving a 401 image.
  const posterUrl = video.thumbnail
    ? signCfMediaUrl(video.thumbnail, id, token)
    : null;

  const relatedVideos: SidebarVideo[] = relatedRaw ?? [];
  const followedIds = (follows ?? []).map((f: { followee: string }) => f.followee);
  const isFollowingChannel = followedIds.includes(video.owner);
  const suggestedProfiles: SidebarProfile[] = (suggestRaw ?? [])
    .filter((p: SidebarProfile) => p.id !== viewerId && !followedIds.includes(p.id))
    .slice(0, 5);

  const tagMap: Record<string, number> = {};
  for (const row of tagRows ?? []) tagMap[row.tag] = (tagMap[row.tag] ?? 0) + 1;
  const trendingTags: TrendingTag[] = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => ({ tag, count }));

  return (
    <WatchLayout
      videoId={id}
      token={token}
      poster={posterUrl ?? undefined}
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
      visibility={video.visibility ?? "public"}
      channelHandle={channel?.username ?? video.owner}
      relatedVideos={relatedVideos}
      suggestedProfiles={suggestedProfiles}
      trendingTags={trendingTags}
      signedIn={!!viewerId}
    />
  );
}