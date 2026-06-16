import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostResult, VideoResult, PeopleRow, type PostHit, type VideoHit } from "@/components/discovery/ResultCards";
import FollowTagButton from "@/components/discovery/FollowTagButton";
import FollowUserButton from "@/components/discovery/FollowUserButton";
import { nfmt } from "@/lib/format";

export const dynamic = "force-dynamic";

type Prof = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };
const TABS = [["top", "Top"], ["latest", "Latest"], ["videos", "Videos"], ["people", "People"]] as const;

export default async function HashtagPage({
  params, searchParams,
}: { params: Promise<{ tag: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { tag: raw } = await params;
  const { tab = "top" } = await searchParams;
  const tag = decodeURIComponent(raw).toLowerCase();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // every post_id carrying this tag
  const { data: tagged } = await supabase.from("post_hashtags").select("post_id").eq("tag", tag);
  const postIds = (tagged ?? []).map((r) => r.post_id);

  // is the viewer following this tag?
  let followingTag = false;
  if (user) {
    const { data } = await supabase.from("tag_follows").select("tag").eq("user_id", user.id).eq("tag", tag).maybeSingle();
    followingTag = !!data;
  }
  let following = new Set<string>();
  if (user) {
    const { data } = await supabase.from("follows").select("followee").eq("follower", user.id);
    following = new Set((data ?? []).map((r) => r.followee as string));
  }

  // resolve posts for this tag
  const profCache = new Map<string, Prof>();
  async function loadProfiles(ids: string[]) {
    const missing = ids.filter((id) => !profCache.has(id));
    if (missing.length) {
      const { data } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", missing);
      for (const p of (data ?? []) as Prof[]) profCache.set(p.id, p);
    }
  }

  let posts: PostHit[] = [];
  let ownerCounts = new Map<string, number>();
  if (postIds.length) {
    const { data: rows } = await supabase
      .from("posts").select("id, owner, body, created_at").in("id", postIds)
      .order("created_at", { ascending: false }).limit(40);
    const list = rows ?? [];
    await loadProfiles([...new Set(list.map((p) => p.owner))]);

    const likeC = new Map<string, number>(), repC = new Map<string, number>();
    const ids = list.map((p) => p.id);
    if (ids.length) {
      const [{ data: pl }, { data: rp }] = await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id", ids),
        supabase.from("posts").select("parent_id").in("parent_id", ids),
      ]);
      for (const r of pl ?? []) likeC.set(r.post_id, (likeC.get(r.post_id) ?? 0) + 1);
      for (const r of rp ?? []) if (r.parent_id) repC.set(r.parent_id, (repC.get(r.parent_id) ?? 0) + 1);
    }
    for (const p of list) ownerCounts.set(p.owner, (ownerCounts.get(p.owner) ?? 0) + 1);

    posts = list.map((p) => {
      const a = profCache.get(p.owner);
      return {
        id: p.id, body: p.body, created_at: p.created_at,
        author: a?.full_name || a?.username || "someone", handle: a?.username || "user", avatar: a?.avatar_url ?? null,
        likes: likeC.get(p.id) ?? 0, replies: repC.get(p.id) ?? 0,
      };
    });
    // "Top" = most liked; "Latest" = newest (already sorted newest)
    if (tab === "top") posts = [...posts].sort((a, b) => b.likes - a.likes);
  }

  // videos approximately matching the tag word in title
  let videos: VideoHit[] = [];
  if (tab === "videos") {
    const { data } = await supabase
      .from("videos").select("id, title, description, thumbnail, views, duration, created_at, owner")
      .eq("status", "ready").ilike("title", `%${tag}%`).order("views", { ascending: false }).limit(12);
    await loadProfiles([...new Set((data ?? []).map((v) => v.owner))]);
    videos = (data ?? []).map((v) => ({ ...v, channel: profCache.get(v.owner)?.full_name || profCache.get(v.owner)?.username || "Channel" }));
  }

  // top creators in this tag (by tagged-post count)
  const topCreators = [...ownerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  await loadProfiles(topCreators.map(([id]) => id));

  // related hashtags = tags co-occurring on the same posts
  let related: string[] = [];
  if (postIds.length) {
    const { data: co } = await supabase.from("post_hashtags").select("tag").in("post_id", postIds).limit(800);
    const c = new Map<string, number>();
    for (const r of co ?? []) if (r.tag !== tag) c.set(r.tag, (c.get(r.tag) ?? 0) + 1);
    related = [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  }

  return (
    <div className="-mx-4 sm:-mx-6">
      {/* teal hero */}
      <div className="px-6 py-12 text-center" style={{ backgroundImage: "linear-gradient(110deg,#1a8f7e,#1f6f86)" }}>
        <h1 className="text-4xl font-black text-white">#{tag}</h1>
        <p className="mt-2 text-sm font-semibold text-white/80">{nfmt(postIds.length)} {postIds.length === 1 ? "post" : "posts"}</p>
      </div>

      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.6fr,1fr]">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex gap-5">
              {TABS.map(([key, label]) => (
                <Link key={key} href={`/hashtag/${tag}?tab=${key}`}
                  className={`border-b-2 pb-1 text-sm font-semibold transition ${
                    tab === key ? "border-teal text-foam" : "border-transparent text-mist hover:text-foam"}`}>
                  {label}
                </Link>
              ))}
            </div>
            <FollowTagButton tag={tag} signedIn={!!user} initialFollowing={followingTag} />
          </div>

          <div className="mt-6 space-y-4">
            {(tab === "top" || tab === "latest") && (posts.length
              ? posts.map((p) => <PostResult key={p.id} p={p} />)
              : <p className="text-sm text-mist">No posts with #{tag} yet. Be the first — add #{tag} to a post.</p>)}

            {tab === "videos" && (videos.length
              ? <div className="space-y-5">{videos.map((v) => <VideoResult key={v.id} v={v} />)}</div>
              : <p className="text-sm text-mist">No videos matched #{tag}.</p>)}

            {tab === "people" && (topCreators.length
              ? <div className="space-y-3">{topCreators.map(([id, n]) => {
                  const a = profCache.get(id);
                  return <PeopleRow key={id} name={a?.full_name || a?.username || "user"} handle={a?.username || "user"} avatar={a?.avatar_url ?? null}
                    sub={`${nfmt(n)} ${n === 1 ? "post" : "posts"} in #${tag}`}
                    action={<FollowUserButton targetId={id} signedIn={!!user} initialFollowing={following.has(id)} variant="solid" />} />;
                })}</div>
              : <p className="text-sm text-mist">No creators in #{tag} yet.</p>)}
          </div>
        </div>

        <aside className="space-y-8">
          <section>
            <h2 className="mb-3 border-l-2 border-teal pl-2 text-[12px] font-bold uppercase tracking-wide text-foam">Top creators in #{tag}</h2>
            {topCreators.length ? (
              <div className="space-y-3">
                {topCreators.map(([id, n]) => {
                  const a = profCache.get(id);
                  return <PeopleRow key={id} name={a?.full_name || a?.username || "user"} handle={a?.username || "user"} avatar={a?.avatar_url ?? null}
                    sub={`${nfmt(n)} ${n === 1 ? "post" : "posts"}`}
                    action={<FollowUserButton targetId={id} signedIn={!!user} initialFollowing={following.has(id)} />} />;
                })}
              </div>
            ) : <p className="text-sm text-mist">No creators yet.</p>}
          </section>

          {related.length > 0 && (
            <section>
              <h2 className="mb-3 border-l-2 border-teal pl-2 text-[12px] font-bold uppercase tracking-wide text-foam">Related hashtags</h2>
              <div className="flex flex-wrap gap-2">
                {related.map((t) => (
                  <Link key={t} href={`/hashtag/${t}`} className="rounded-full border border-teal/40 bg-teal/10 px-3 py-1.5 text-sm text-teal hover:bg-teal/20">#{t}</Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
