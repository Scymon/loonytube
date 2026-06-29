import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashHero, { type FeaturedVideo } from "@/components/dashboard/DashHero";
import ProfileBar from "@/components/dashboard/ProfileBar";
import DashSchedule from "@/components/dashboard/DashSchedule";
import LikedSection, { type LikedGroup } from "@/components/dashboard/LikedSection";
import SavedSection from "@/components/dashboard/SavedSection";
import PlaylistsSection from "@/components/dashboard/PlaylistsSection";
import WatchHistorySection from "@/components/dashboard/WatchHistorySection";

export const dynamic = "force-dynamic";

type VideoRow = {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  owner: string;
};

type HeroRow = { id: string; title: string; thumbnail: string | null; owner: string };
type ProfRow = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Own profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url, banner_url")
    .eq("id", user.id)
    .maybeSingle();

  // Following count
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower", user.id);

  // Featured hero video — from followed channels, fallback to liked
  const { data: followRows } = await supabase
    .from("follows")
    .select("followee")
    .eq("follower", user.id)
    .limit(50);
  const followeeIds = (followRows ?? []).map((r: { followee: string }) => r.followee);

  let featuredVideos: FeaturedVideo[] = [];
  if (followeeIds.length) {
    const { data: heroRows } = await supabase
      .from("videos")
      .select("id, title, thumbnail, owner")
      .in("owner", followeeIds)
      .eq("status", "ready")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(10);
    if (heroRows?.length) {
      const ownerIds = [...new Set((heroRows as HeroRow[]).map(v => v.owner))];
      const { data: heroProfs } = await supabase
        .from("profiles").select("id, username, full_name, avatar_url")
        .in("id", ownerIds);
      const hp = new Map((heroProfs ?? []).map((p: ProfRow) => [p.id, p]));
      featuredVideos = (heroRows as HeroRow[]).map(v => {
        const p = hp.get(v.owner);
        return {
          id: v.id, title: v.title, thumbnail: v.thumbnail,
          channelName: p?.full_name || p?.username || "Unknown",
          channelHandle: p?.username ?? "",
          channelAvatar: p?.avatar_url ?? null,
          isLive: false,
        };
      });
    }
  }
  let featuredVideo: FeaturedVideo | null = featuredVideos[0] ?? null;

  // Liked video IDs (newest first, cap 40)
  const { data: likedRows } = await supabase
    .from("likes")
    .select("video_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const videoIds = (likedRows ?? []).map((r: { video_id: string }) => r.video_id);

  let likedGroups: LikedGroup[] = [];
  if (videoIds.length) {
    const { data: likedVideos } = await supabase
      .from("videos")
      .select("id, title, thumbnail, duration, owner")
      .in("id", videoIds)
      .eq("status", "ready");

    const byOwner = new Map<string, VideoRow[]>();
    for (const v of (likedVideos ?? []) as VideoRow[]) {
      const arr = byOwner.get(v.owner) ?? [];
      arr.push(v);
      byOwner.set(v.owner, arr);
    }

    if (byOwner.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", [...byOwner.keys()]);

      const profMap = new Map(
        (profs ?? []).map((p: { id: string; username: string | null; full_name: string | null; avatar_url: string | null }) => [p.id, p])
      );
      likedGroups = [...byOwner.entries()].map(([ownerId, videos]) => {
        const p = profMap.get(ownerId);
        return {
          channelName:   p?.full_name || p?.username || "Unknown",
          channelHandle: p?.username ?? "",
          channelAvatar: p?.avatar_url ?? null,
          videos,
        };
      });
    }
  }

  // Fallback hero: liked videos if no followed-channel content
  if (!featuredVideos.length) {
    for (const g of likedGroups) {
      for (const v of g.videos) {
        featuredVideos.push({
          id: v.id, title: v.title, thumbnail: v.thumbnail,
          channelName: g.channelName, channelHandle: g.channelHandle,
          channelAvatar: g.channelAvatar, isLive: false,
        });
        if (featuredVideos.length >= 10) break;
      }
      if (featuredVideos.length >= 10) break;
    }
    featuredVideo = featuredVideos[0] ?? null;
  }

  // Date label for schedule header
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  // Playlists
  const { data: playlistRows } = await supabase
    .from("playlists")
    .select("id, title, visibility")
    .eq("owner", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Thumbnail + count per playlist
  const playlistCards = await Promise.all((playlistRows ?? []).map(async (pl) => {
    const { count } = await supabase
      .from("playlist_items")
      .select("*", { count: "exact", head: true })
      .eq("playlist_id", pl.id);
    const { data: fi } = await supabase
      .from("playlist_items").select("video_id")
      .eq("playlist_id", pl.id).order("position", { ascending: true }).limit(1);
    let thumbnail: string | null = null;
    if (fi?.[0]?.video_id) {
      const { data: vid } = await supabase
        .from("videos").select("thumbnail").eq("id", fi[0].video_id).maybeSingle();
      thumbnail = vid?.thumbnail ?? null;
    }
    return { id: pl.id, title: pl.title, videoCount: count ?? 0, thumbnail };
  }));

  return (
    <div className="-mt-6 pb-24">
      {/* Hero — shows live from followed channels; falls back to profile banner */}
      <DashHero featuredVideo={featuredVideo} videos={featuredVideos} bannerUrl={(profile as any)?.banner_url ?? null} />

      {/* Profile summary bar */}
      <ProfileBar
        profile={{
          name:   profile?.full_name || profile?.username || "You",
          handle: profile?.username ?? "",
          avatar: profile?.avatar_url ?? null,
        }}
        followingCount={followingCount ?? 0}
        savedCount={0}
        playlistCount={playlistCards.length}
      />

      <div className="px-4 sm:px-6 space-y-10 mt-8">
        {/* Schedule — populated when live-streams backend is wired */}
        <DashSchedule channels={[]} dateLabel={dateLabel} />

        {/* Continue Watching — client component, loads own data */}
        <WatchHistorySection />

        {/* Liked videos grouped by channel */}
        <LikedSection groups={likedGroups} />

        {/* Saved / Watch Later — table exists after running dashboard-saves-playlists.sql */}
        <SavedSection groups={[]} />

        {/* My Playlists */}
        <PlaylistsSection playlists={playlistCards} />
      </div>
    </div>
  );
}
