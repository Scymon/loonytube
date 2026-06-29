import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashHero, { type FeaturedVideo } from "@/components/dashboard/DashHero";
import VideoRow, { type FeedVideo } from "@/components/home/VideoRow";
import PostCard, { type CardPost } from "@/components/home/PostCard";
import ComingSoon from "@/components/home/ComingSoon";
import RealShelf, { type ShelfVideo } from "@/components/home/RealShelf";
import ArticleCard, { type CardArticle } from "@/components/home/ArticleCard";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  views: number;
  created_at: string;
  owner: string;
};

export default async function Home() {
  const supabase = await createClient();

  // Hero = most-viewed ready video ("Now Trending").
  const { data: heroRows } = await supabase
    .from("videos")
    .select("id, title, thumbnail, duration, views, created_at, owner")
    .eq("status", "ready")
    .eq("visibility", "public")
    .order("views", { ascending: false })
    .limit(5);
  const heroRows5 = (heroRows ?? []) as Row[];
  const heroRow = heroRows5[0] as Row | undefined;

  // Feed = newest ready videos (excluding the hero).
  const { data: feedRows } = await supabase
    .from("videos")
    .select("id, title, thumbnail, duration, views, created_at, owner")
    .eq("status", "ready")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(12);
  const feed = ((feedRows ?? []) as Row[]).filter((v) => v.id !== heroRow?.id);

  // Batch-resolve creator names/avatars (decoupled query — avoids the FK-embed bug).
  const ids = [...new Set([heroRow?.owner, ...feed.map((v) => v.owner)].filter(Boolean) as string[])];
  const who = new Map<string, { name: string; avatar: string | null; handle: string }>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids);
    for (const p of profs ?? [])
      who.set(p.id, { name: p.full_name || p.username || "someone", avatar: p.avatar_url ?? null, handle: p.username ?? "" });
  }
  const chan = (owner: string) => who.get(owner) ?? { name: "someone", avatar: null, handle: "" };

  const featuredVideo: FeaturedVideo | null = heroRow ? {
    id: heroRow.id,
    title: heroRow.title,
    thumbnail: heroRow.thumbnail,
    channelName: chan(heroRow.owner).name,
    channelHandle: chan(heroRow.owner).handle,
    channelAvatar: chan(heroRow.owner).avatar,
    isLive: false,
  } : null;
  const featuredVideos: FeaturedVideo[] = heroRows5.map((v) => ({
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail,
    channelName: chan(v.owner).name,
    channelHandle: chan(v.owner).handle,
    channelAvatar: chan(v.owner).avatar,
    isLive: false,
  }));
  const feedVideos: FeedVideo[] = feed.map((v) => ({
    ...v,
    channel: chan(v.owner).name,
    avatar: chan(v.owner).avatar,
  }));

  // Latest top-level Loon Post (real). No fake fallback — empty shows "coming soon".
  const { data: latestPost } = await supabase
    .from("posts")
    .select("id, owner, body, images, created_at")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let postCard: CardPost | null = null;
  if (latestPost) {
    const [{ data: pa }, { count: plikes }, { count: preplies }] = await Promise.all([
      supabase.from("profiles").select("username, full_name, avatar_url").eq("id", latestPost.owner).maybeSingle(),
      supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", latestPost.id),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("parent_id", latestPost.id),
    ]);
    const secs = Math.max(1, Math.floor((Date.now() - new Date(latestPost.created_at).getTime()) / 1000));
    const agoLabel = secs < 3600 ? `${Math.floor(secs / 60) || 1}m` : secs < 86400 ? `${Math.floor(secs / 3600)}h` : `${Math.floor(secs / 86400)}d`;
    postCard = {
      href: `/post/${latestPost.id}`,
      author: pa?.full_name || pa?.username || "someone",
      handle: pa?.username || "user",
      avatar: pa?.avatar_url ?? null,
      agoLabel,
      body: latestPost.body,
      images: latestPost.images,
      comments: preplies ?? 0,
      reposts: 0,
      likes: plikes ?? 0,
    };
  }

  // Latest published article.
  const { data: latestArticle } = await supabase
    .from("articles")
    .select("id, owner, title, cover_url, blocks, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let articleCard: CardArticle | null = null;
  if (latestArticle) {
    const { data: aa } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", latestArticle.owner)
      .maybeSingle();
    const secs = Math.max(1, Math.floor((Date.now() - new Date(latestArticle.created_at).getTime()) / 1000));
    const agoLabel = secs < 3600 ? `${Math.floor(secs / 60) || 1}m` : secs < 86400 ? `${Math.floor(secs / 3600)}h` : `${Math.floor(secs / 86400)}d`;
    const wordCount = ((latestArticle.blocks ?? []) as { value?: string }[])
      .reduce((n, b) => n + (b.value ?? "").split(/\s+/).filter(Boolean).length, 0);
    articleCard = {
      id: latestArticle.id,
      title: latestArticle.title,
      cover_url: latestArticle.cover_url ?? null,
      author: aa?.full_name || aa?.username || "someone",
      handle: aa?.username || "user",
      avatar: aa?.avatar_url ?? null,
      agoLabel,
      readMinutes: Math.max(1, Math.round(wordCount / 200)),
    };
  }

  // Real category shelves (from videos.category). Empty -> "coming soon".
  const { data: catRows } = await supabase
    .from("videos")
    .select("id, title, thumbnail, duration, category, created_at")
    .eq("status", "ready")
    .eq("visibility", "public")
    .not("category", "is", null)
    .order("created_at", { ascending: false })
    .limit(48);
  const byCat = new Map<string, ShelfVideo[]>();
  for (const v of catRows ?? []) {
    const arr = byCat.get(v.category as string) ?? [];
    if (arr.length < 4) arr.push({ id: v.id, title: v.title, thumbnail: v.thumbnail, duration: v.duration });
    byCat.set(v.category as string, arr);
  }
  const realShelves = [...byCat.entries()].slice(0, 3).map(([title, videos]) => ({ title, videos }));

  return (
    <div>
      {featuredVideo ? (
        <DashHero featuredVideo={featuredVideo} videos={featuredVideos} />
      ) : (
        <div className="rounded-2xl border border-edge bg-surface py-20 text-center">
          <p className="text-xl text-foam">The lake is quiet.</p>
          <p className="mt-2 text-sm text-mist">No videos yet —{" "}
            <Link href="/create" className="text-sky hover:underline">upload the first one</Link>.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr,1fr]">
        {/* main hybrid feed (videos real; post is a labeled placeholder) */}
        <div className="space-y-6">
          {feedVideos[0] && <VideoRow video={feedVideos[0]} />}
          {postCard ? <PostCard post={postCard} /> : <ComingSoon label="No posts yet — start the conversation" />}
          {articleCard && <ArticleCard article={articleCard} />}
          {feedVideos.slice(1).map((v) => (
            <VideoRow key={v.id} video={v} />
          ))}
        </div>

        {/* sidebar — real where it exists, "coming soon" where the backend doesn't */}
        <aside className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-bold text-foam">Live Now</h2>
            <ComingSoon label="No live streams right now" />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold text-foam">Your Schedule Today</h2>
            <ComingSoon label="Nothing scheduled yet" />
          </section>
          {realShelves.length > 0 ? (
            realShelves.map((s) => <RealShelf key={s.title} title={s.title} videos={s.videos} />)
          ) : (
            <section>
              <h2 className="mb-3 text-lg font-bold text-foam">Browse by category</h2>
              <ComingSoon label="No categorized videos yet" />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
