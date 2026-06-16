import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeroFeature, { type HeroVideo } from "@/components/home/HeroFeature";
import VideoRow, { type FeedVideo } from "@/components/home/VideoRow";
import PostCard, { type CardPost } from "@/components/home/PostCard";
import LiveNowRail from "@/components/home/LiveNowRail";
import ScheduleToday from "@/components/home/ScheduleToday";
import CategoryShelf from "@/components/home/CategoryShelf";
import { samplePost, liveNow, schedule, shelves } from "@/components/home/placeholders";

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
    .order("views", { ascending: false })
    .limit(1);
  const heroRow = (heroRows ?? [])[0] as Row | undefined;

  // Feed = newest ready videos (excluding the hero).
  const { data: feedRows } = await supabase
    .from("videos")
    .select("id, title, thumbnail, duration, views, created_at, owner")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(12);
  const feed = ((feedRows ?? []) as Row[]).filter((v) => v.id !== heroRow?.id);

  // Batch-resolve creator names/avatars (decoupled query — avoids the FK-embed bug).
  const ids = [...new Set([heroRow?.owner, ...feed.map((v) => v.owner)].filter(Boolean) as string[])];
  const who = new Map<string, { name: string; avatar: string | null }>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids);
    for (const p of profs ?? [])
      who.set(p.id, { name: p.full_name || p.username || "someone", avatar: p.avatar_url ?? null });
  }
  const chan = (owner: string) => who.get(owner) ?? { name: "someone", avatar: null };

  const hero: HeroVideo | null = heroRow
    ? { ...heroRow, channel: chan(heroRow.owner).name, avatar: chan(heroRow.owner).avatar }
    : null;
  const feedVideos: FeedVideo[] = feed.map((v) => ({
    ...v,
    channel: chan(v.owner).name,
    avatar: chan(v.owner).avatar,
  }));

  // Latest top-level Loon Post (real). Falls back to the labeled sample if none exist.
  const { data: latestPost } = await supabase
    .from("posts")
    .select("id, owner, body, created_at")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let postCard: CardPost = samplePost;
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
      comments: preplies ?? 0,
      reposts: 0,
      likes: plikes ?? 0,
    };
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      {hero ? (
        <HeroFeature video={hero} />
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
          <PostCard post={postCard} />
          {feedVideos.slice(1).map((v) => (
            <VideoRow key={v.id} video={v} />
          ))}
        </div>

        {/* sidebar (placeholder sections until their backends ship) */}
        <aside className="space-y-8">
          <LiveNowRail channels={liveNow} />
          <ScheduleToday items={schedule} />
          {shelves.map((s) => (
            <CategoryShelf key={s.title} shelf={s} />
          ))}
        </aside>
      </div>
    </div>
  );
}
