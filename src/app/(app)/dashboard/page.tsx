import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashHero, { type FeaturedVideo } from "@/components/dashboard/DashHero";
import ProfileBar from "@/components/dashboard/ProfileBar";
import DashSchedule from "@/components/dashboard/DashSchedule";
import LikedSection, { type LikedGroup } from "@/components/dashboard/LikedSection";
import SavedSection from "@/components/dashboard/SavedSection";
import PlaylistsSection from "@/components/dashboard/PlaylistsSection";

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

  let featuredVideo: FeaturedVideo | null = null;
  if (followeeIds.length) {
    const { data: heroVideos } = await supabase
      .from("videos")
      .select("id, title, thumbnail, owner")
      .in("owner", followeeIds)
      .eq("status", "ready")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(10);
    if (heroVideos?.length) {
      const pick = (heroVideos as HeroRow[])[
        Math.floor(Math.random() * heroVideos.length)
      ];
      const { data: cp } = await supabase
        .from("profiles").select("id, username, full_name, avatar_url")
        .eq("id", pick.owner).maybeSingle();
      const p = cp as ProfRow | null;
      featuredVideo = {
        id: pick.id, title: pick.title, thumbnail: pick.thumbnail,
        channelName: p?.full_name || p?.username || "Unknown",
        channelHandle: p?.username ?? "",
        channelAvatar: p?.avatar_url ?? null,
        isLive: false,
      };
    }
  }

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

  // Fallback hero: first liked video if no followed-channel content
  if (!featuredVideo && likedGroups.length) {
    const g = likedGroups[0];
    const v = g.videos[0];
    if (v) {
      featuredVideo = {
        id: v.id, title: v.title, thumbnail: v.thumbnail,
        channelName: g.channelName, channelHandle: g.channelHandle,
        channelAvatar: g.channelAvatar, isLive: false,
      };
    }
  }

  // Date label for schedule header
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  return (
    <div className="pb-24">
      {/* Hero — shows live from followed channels; falls back to profile banner */}
      <DashHero featuredVideo={featuredVideo} bannerUrl={(profile as any)?.banner_url ?? null} />

      {/* Profile summary bar */}
      <ProfileBar
        profile={{
          name:   profile?.full_name || profile?.username || "You",
          handle: profile?.username ?? "",
          avatar: profile?.avatar_url ?? null,
        }}
        followingCount={followingCount ?? 0}
        savedCount={0}
        playlistCount={0}
      />

      <div className="px-4 sm:px-6 space-y-10 mt-8">
        {/* Schedule — populated when live-streams backend is wired */}
        <DashSchedule channels={[]} dateLabel={dateLabel} />

        {/* Liked videos grouped by channel */}
        <LikedSection groups={likedGroups} />

        {/* Saved / Watch Later — table exists after running dashboard-saves-playlists.sql */}
        <SavedSection groups={[]} />

        {/* My Playlists */}
        <PlaylistsSection playlists={[]} />
      </div>
    </div>
  );
}
