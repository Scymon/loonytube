import { createClient } from "@/lib/supabase/server";
import ExploreShell, { type ExploreVideo, type ExplorePost, type ExploreArticle } from "@/components/explore/ExploreShell";
import type { FeaturedVideo } from "@/components/dashboard/DashHero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explore · LoonyTube" };

type VRow = { id: string; title: string; thumbnail: string | null; duration: number | null; views: number; created_at: string; owner: string; category: string | null };
type Prof = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Role for context-menu gating
  let role: string | null = null;
  if (user) {
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = me?.role ?? null;
  }

  // Trending hero = most-viewed ready public video
  const { data: heroRows } = await supabase
    .from("videos").select("id, title, thumbnail, duration, views, created_at, owner, category")
    .eq("status", "ready").eq("visibility", "public")
    .order("views", { ascending: false }).limit(5);
  const heroRows5 = (heroRows ?? []) as VRow[];
  const heroRow = heroRows5[0] as VRow | undefined;

  // All public ready videos for grid + category shelves (latest 48)
  const { data: vRows } = await supabase
    .from("videos").select("id, title, thumbnail, duration, views, created_at, owner, category")
    .eq("status", "ready").eq("visibility", "public")
    .order("created_at", { ascending: false }).limit(48);
  const allVideos = (vRows ?? []) as VRow[];

  // Resolve owners for hero + grid
  const ownerIds = [...new Set([heroRow?.owner, ...allVideos.map(v => v.owner)].filter(Boolean) as string[])];
  const who = new Map<string, Prof>();
  if (ownerIds.length) {
    const { data: ps } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ownerIds);
    for (const p of (ps ?? []) as Prof[]) who.set(p.id, p);
  }
  const prof = (id: string) => who.get(id);

  const featuredVideo: FeaturedVideo | null = heroRow ? {
    id: heroRow.id, title: heroRow.title, thumbnail: heroRow.thumbnail,
    channelName: prof(heroRow.owner)?.full_name || prof(heroRow.owner)?.username || "Channel",
    channelHandle: prof(heroRow.owner)?.username || "",
    channelAvatar: prof(heroRow.owner)?.avatar_url ?? null,
  } : null;

  const featuredVideos: FeaturedVideo[] = heroRows5.map(v => ({
    id: v.id, title: v.title, thumbnail: v.thumbnail,
    channelName: prof(v.owner)?.full_name || prof(v.owner)?.username || "Channel",
    channelHandle: prof(v.owner)?.username || "",
    channelAvatar: prof(v.owner)?.avatar_url ?? null,
    isLive: false,
  }));
  const exploreVideos: ExploreVideo[] = allVideos
    .filter(v => v.id !== heroRow?.id)
    .map(v => ({
      id: v.id, title: v.title, thumbnail: v.thumbnail, duration: v.duration,
      views: v.views, created_at: v.created_at, category: v.category,
      channel: prof(v.owner)?.full_name || prof(v.owner)?.username || "Channel",
      avatar: prof(v.owner)?.avatar_url ?? null,
      channelHandle: prof(v.owner)?.username || null,
    }));

  // Posts (top-level, newest 16)
  const { data: postRows } = await supabase
    .from("posts").select("id, owner, body, images, created_at")
    .is("parent_id", null).order("created_at", { ascending: false }).limit(16);
  const postOwnerIds = [...new Set((postRows ?? []).map(p => p.owner))];
  const postWho = new Map<string, Prof>();
  if (postOwnerIds.length) {
    const { data: ps } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", postOwnerIds);
    for (const p of (ps ?? []) as Prof[]) postWho.set(p.id, p);
  }
  const postIds = (postRows ?? []).map(p => p.id);
  const likeC = new Map<string, number>(), repC = new Map<string, number>();
  if (postIds.length) {
    const [{ data: pl }, { data: rp }] = await Promise.all([
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("posts").select("parent_id").in("parent_id", postIds),
    ]);
    for (const r of pl ?? []) likeC.set(r.post_id, (likeC.get(r.post_id) ?? 0) + 1);
    for (const r of rp ?? []) if (r.parent_id) repC.set(r.parent_id, (repC.get(r.parent_id) ?? 0) + 1);
  }
  const explorePosts: ExplorePost[] = (postRows ?? []).map(p => {
    const a = postWho.get(p.owner);
    const secs = Math.max(1, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 1000));
    const agoLabel = secs < 3600 ? `${Math.floor(secs/60)||1}m` : secs < 86400 ? `${Math.floor(secs/3600)}h` : `${Math.floor(secs/86400)}d`;
    return { id: p.id, body: p.body, images: p.images, created_at: p.created_at, agoLabel,
      author: a?.full_name || a?.username || "Someone", handle: a?.username || "user",
      avatar: a?.avatar_url ?? null, likes: likeC.get(p.id) ?? 0, replies: repC.get(p.id) ?? 0, reposts: 0 };
  });

  // Articles (newest 12)
  const { data: artRows } = await supabase
    .from("articles").select("id, owner, title, cover_url, blocks, created_at")
    .order("created_at", { ascending: false }).limit(12);
  const artOwnerIds = [...new Set((artRows ?? []).map(a => a.owner))];
  const artWho = new Map<string, Prof>();
  if (artOwnerIds.length) {
    const { data: ps } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", artOwnerIds);
    for (const p of (ps ?? []) as Prof[]) artWho.set(p.id, p);
  }
  const exploreArticles: ExploreArticle[] = (artRows ?? []).map(a => {
    const p = artWho.get(a.owner);
    const secs = Math.max(1, Math.floor((Date.now() - new Date(a.created_at).getTime()) / 1000));
    const agoLabel = secs < 3600 ? `${Math.floor(secs/60)||1}m` : secs < 86400 ? `${Math.floor(secs/3600)}h` : `${Math.floor(secs/86400)}d`;
    const wordCount = ((a.blocks ?? []) as { value?: string }[]).reduce((n, b) => n + (b.value ?? "").split(/\s+/).filter(Boolean).length, 0);
    return { id: a.id, title: a.title, cover_url: a.cover_url ?? null,
      author: p?.full_name || p?.username || "Someone", handle: p?.username || "user",
      avatar: p?.avatar_url ?? null, agoLabel, readMinutes: Math.max(1, Math.round(wordCount / 200)) };
  });

  return (
    <ExploreShell
      featuredVideo={featuredVideo}
      heroVideos={featuredVideos}
      videos={exploreVideos}
      posts={explorePosts}
      articles={exploreArticles}
      role={role}
    />
  );
}
