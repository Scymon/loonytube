import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VideoResult, PostResult, PeopleRow, type VideoHit, type PostHit } from "@/components/discovery/ResultCards";
import FollowUserButton from "@/components/discovery/FollowUserButton";
import { nfmt } from "@/lib/format";

export const dynamic = "force-dynamic";

type Prof = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };
const TABS = [["all", "All"], ["videos", "Videos"], ["posts", "Posts"], ["people", "Channels"], ["tags", "Tags"]] as const;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const { q = "", tab = "all" } = await searchParams;
  const term = q.trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // viewer's follow set (to seed Follow buttons)
  let following = new Set<string>();
  if (user) {
    const { data } = await supabase.from("follows").select("followee").eq("follower", user.id);
    following = new Set((data ?? []).map((r) => r.followee as string));
  }

  // ---- sidebar (always shown): trending tags + people you might like ----
  const { data: tagRows } = await supabase.from("post_hashtags").select("tag").limit(500);
  const tally = new Map<string, number>();
  for (const t of tagRows ?? []) tally.set(t.tag, (tally.get(t.tag) ?? 0) + 1);
  const trending = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const { data: suggest } = await supabase
    .from("profiles").select("id, username, full_name, avatar_url")
    .not("id", "in", `(${user?.id ?? "00000000-0000-0000-0000-000000000000"})`)
    .limit(3);

  if (!term) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-lg font-semibold text-foam">Search LoonyTube</p>
        <p className="mt-2 text-sm text-mist">Find videos, posts, people, and hashtags.</p>
      </div>
    );
  }

  const like = `%${term}%`;
  const wantV = tab === "all" || tab === "videos";
  const wantP = tab === "all" || tab === "posts";
  const wantU = tab === "all" || tab === "people";
  const wantT = tab === "all" || tab === "tags";

  // ---- videos ----
  let videos: VideoHit[] = [];
  if (wantV) {
    const { data } = await supabase
      .from("videos").select("id, title, description, thumbnail, views, duration, created_at, owner")
      .eq("status", "ready").eq("visibility", "public").or(`title.ilike.${like},description.ilike.${like}`)
      .order("views", { ascending: false }).limit(tab === "videos" ? 20 : 3);
    const owners = [...new Set((data ?? []).map((v) => v.owner))];
    const who = new Map<string, Prof>();
    if (owners.length) {
      const { data: ps } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", owners);
      for (const p of (ps ?? []) as Prof[]) who.set(p.id, p);
    }
    videos = (data ?? []).map((v) => ({
      ...v, channel: who.get(v.owner)?.full_name || who.get(v.owner)?.username || "Channel",
    }));
  }

  // ---- posts ----
  let posts: PostHit[] = [];
  if (wantP) {
    const { data } = await supabase
      .from("posts").select("id, owner, body, created_at").is("parent_id", null)
      .ilike("body", like).order("created_at", { ascending: false }).limit(tab === "posts" ? 20 : 3);
    const owners = [...new Set((data ?? []).map((p) => p.owner))];
    const who = new Map<string, Prof>();
    if (owners.length) {
      const { data: ps } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", owners);
      for (const p of (ps ?? []) as Prof[]) who.set(p.id, p);
    }
    const ids = (data ?? []).map((p) => p.id);
    const likeC = new Map<string, number>(), repC = new Map<string, number>();
    if (ids.length) {
      const [{ data: pl }, { data: rp }] = await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id", ids),
        supabase.from("posts").select("parent_id").in("parent_id", ids),
      ]);
      for (const r of pl ?? []) likeC.set(r.post_id, (likeC.get(r.post_id) ?? 0) + 1);
      for (const r of rp ?? []) if (r.parent_id) repC.set(r.parent_id, (repC.get(r.parent_id) ?? 0) + 1);
    }
    posts = (data ?? []).map((p) => {
      const a = who.get(p.owner);
      return {
        id: p.id, body: p.body, created_at: p.created_at,
        author: a?.full_name || a?.username || "someone", handle: a?.username || "user", avatar: a?.avatar_url ?? null,
        likes: likeC.get(p.id) ?? 0, replies: repC.get(p.id) ?? 0,
      };
    });
  }

  // ---- people ----
  let people: Prof[] = [];
  if (wantU) {
    const { data } = await supabase
      .from("profiles").select("id, username, full_name, avatar_url")
      .or(`username.ilike.${like},full_name.ilike.${like}`).limit(tab === "people" ? 20 : 3);
    people = (data ?? []) as Prof[];
  }

  // ---- tags ----
  let tags: { tag: string; n: number }[] = [];
  if (wantT) {
    const { data } = await supabase.from("hashtags").select("tag").ilike("tag", like).limit(tab === "tags" ? 30 : 6);
    tags = (data ?? []).map((t) => ({ tag: t.tag, n: tally.get(t.tag) ?? 0 }));
  }

  const total = videos.length + posts.length + people.length + tags.length;

  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[1.6fr,1fr]">
      <div>
        <p className="text-sm text-mist">{nfmt(total)} results for <b className="text-foam">{term}</b></p>

        <div className="mt-4 flex gap-2">
          {TABS.map(([key, label]) => (
            <Link key={key} href={`/search?q=${encodeURIComponent(term)}&tab=${key}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                tab === key ? "bg-teal text-ink" : "border border-edge text-mist hover:text-foam"}`}>
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {videos.length > 0 && (
            <section className="space-y-5">
              {tab === "all" && <h2 className="text-xs font-bold uppercase tracking-wide text-mist">Videos</h2>}
              {videos.map((v) => <VideoResult key={v.id} v={v} />)}
            </section>
          )}
          {posts.length > 0 && (
            <section className="space-y-3">
              {tab === "all" && <h2 className="text-xs font-bold uppercase tracking-wide text-mist">Posts</h2>}
              {posts.map((p) => <PostResult key={p.id} p={p} />)}
            </section>
          )}
          {people.length > 0 && (
            <section className="space-y-3">
              {tab === "all" && <h2 className="text-xs font-bold uppercase tracking-wide text-mist">Channels</h2>}
              {people.map((p) => (
                <PeopleRow key={p.id} name={p.full_name || p.username || "user"} handle={p.username || "user"} avatar={p.avatar_url}
                  action={<FollowUserButton targetId={p.id} signedIn={!!user} initialFollowing={following.has(p.id)} variant="solid" />} />
              ))}
            </section>
          )}
          {tags.length > 0 && (
            <section className="space-y-1">
              {tab === "all" && <h2 className="text-xs font-bold uppercase tracking-wide text-mist">Tags</h2>}
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Link key={t.tag} href={`/hashtag/${t.tag}`} className="rounded-full border border-teal/40 bg-teal/10 px-3 py-1.5 text-sm text-teal hover:bg-teal/20">
                    #{t.tag} <span className="text-teal/60">{nfmt(t.n)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {total === 0 && <p className="text-sm text-mist">No results for “{term}”. Try different keywords.</p>}
        </div>
      </div>

      <aside className="space-y-8">
        {trending.length > 0 && (
          <section>
            <h2 className="mb-3 border-l-2 border-teal pl-2 text-[12px] font-bold uppercase tracking-wide text-foam">Trending searches</h2>
            <div className="flex flex-wrap gap-2">
              {trending.map(([tag]) => (
                <Link key={tag} href={`/hashtag/${tag}`} className="rounded-full border border-edge px-3 py-1.5 text-sm text-teal hover:border-teal/50">#{tag}</Link>
              ))}
            </div>
          </section>
        )}
        {(suggest ?? []).length > 0 && (
          <section>
            <h2 className="mb-3 border-l-2 border-teal pl-2 text-[12px] font-bold uppercase tracking-wide text-foam">Channels you might like</h2>
            <div className="space-y-3">
              {(suggest as Prof[]).map((p) => (
                <PeopleRow key={p.id} name={p.full_name || p.username || "user"} handle={p.username || "user"} avatar={p.avatar_url}
                  action={<FollowUserButton targetId={p.id} signedIn={!!user} initialFollowing={following.has(p.id)} />} />
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
