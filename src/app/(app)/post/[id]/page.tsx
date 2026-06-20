import PostImages from "@/components/post/PostImages";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import PostActions from "@/components/post/PostActions";
import ReplyBox from "@/components/post/ReplyBox";
import { nfmt, ago } from "@/lib/format";

export const dynamic = "force-dynamic";

// Render body text with #hashtags highlighted (links land once /hashtag ships).
function Body({ text }: { text: string }) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g);
  return (
    <p className="whitespace-pre-wrap text-[17px] leading-relaxed text-foam/90">
      {parts.map((p, i) =>
        p.startsWith("#") ? <Link key={i} href={`/hashtag/${p.slice(1).toLowerCase()}`} className="text-teal hover:underline">{p}</Link> : <span key={i}>{p}</span>
      )}
    </p>
  );
}

type Prof = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("id, owner, parent_id, body, images, video_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    return <p className="py-20 text-center text-mist">This post couldn&apos;t be found.</p>;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // author + counts
  const { data: author } = await supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", post.owner).maybeSingle();
  const aName = author?.full_name || author?.username || "someone";

  const [{ count: likes }, { count: replyCount }, { count: bookmarks }] = await Promise.all([
    supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("parent_id", id),
    supabase.from("bookmarks").select("*", { count: "exact", head: true }).eq("post_id", id),
  ]);

  let liked = false, bookmarked = false;
  if (user) {
    const [{ data: l }, { data: b }] = await Promise.all([
      supabase.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
      supabase.from("bookmarks").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
    ]);
    liked = !!l; bookmarked = !!b;
  }

  // replies + their authors + like tallies
  const { data: replyRows } = await supabase
    .from("posts").select("id, owner, body, created_at").eq("parent_id", id).order("created_at", { ascending: true }).limit(50);
  const replies = replyRows ?? [];
  const replyIds = replies.map((r) => r.id);
  const likeTally = new Map<string, number>();
  if (replyIds.length) {
    const { data: rl } = await supabase.from("post_likes").select("post_id").in("post_id", replyIds);
    for (const row of rl ?? []) likeTally.set(row.post_id, (likeTally.get(row.post_id) ?? 0) + 1);
  }

  // attached video (optional)
  const { data: vid } = post.video_id
    ? await supabase.from("videos").select("id, title, thumbnail").eq("id", post.video_id).maybeSingle()
    : { data: null as any };

  // sidebar: author's videos, who-to-follow, trending tags
  const { data: moreVideos } = await supabase
    .from("videos").select("id, title, thumbnail, views, created_at").eq("owner", post.owner).eq("status", "ready").eq("visibility", "public")
    .order("created_at", { ascending: false }).limit(3);

  const { data: suggest } = await supabase
    .from("profiles").select("id, username, full_name, avatar_url")
    .not("id", "in", `(${[post.owner, user?.id].filter(Boolean).join(",") || "00000000-0000-0000-0000-000000000000"})`)
    .limit(3);

  const { data: tagRows } = await supabase.from("post_hashtags").select("tag").limit(500);
  const tagTally = new Map<string, number>();
  for (const t of tagRows ?? []) tagTally.set(t.tag, (tagTally.get(t.tag) ?? 0) + 1);
  const trending = [...tagTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // batch reply author profiles
  const rAuthorIds = [...new Set(replies.map((r) => r.owner))];
  const rWho = new Map<string, Prof>();
  if (rAuthorIds.length) {
    const { data } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", rAuthorIds);
    for (const p of (data ?? []) as Prof[]) rWho.set(p.id, p);
  }

  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[1.5fr,1fr]">
      {/* main */}
      <div>
        {post.parent_id && (
          <Link href={`/post/${post.parent_id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-mist hover:text-foam">
            ↑ View parent thread
          </Link>
        )}
        <div className="flex items-center gap-3">
          <Avatar name={aName} src={author?.avatar_url} size={44} />
          <div>
            <p className="font-bold text-foam">{aName}</p>
            <p className="text-sm text-mist">@{author?.username ?? "user"} · {ago(post.created_at)}</p>
          </div>
        </div>

        <div className="mt-4"><Body text={post.body} /></div>
        <PostImages images={post.images as string[] | null} />

        {vid && (
          <Link href={`/watch/${vid.id}`} className="group mt-4 block">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-edge bg-black">
              {vid.thumbnail
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={vid.thumbnail} alt={vid.title} className="h-full w-full object-cover" />
                : <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-black/50 text-foam backdrop-blur">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </span>
            </div>
          </Link>
        )}

        <div className="mt-5">
          <PostActions
            postId={id}
            signedIn={!!user}
            initialLikes={likes ?? 0}
            initialLiked={liked}
            initialBookmarks={bookmarks ?? 0}
            initialBookmarked={bookmarked}
            replies={replyCount ?? 0}
          />
        </div>

        <ReplyBox parentId={id} signedIn={!!user} />

        <div className="mt-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-mist">
            Comments{(replyCount ?? 0) > 0 ? ` · ${nfmt(replyCount ?? 0)}` : ""}
          </h2>
          <div className="space-y-5">
            {replies.map((r) => {
              const a = rWho.get(r.owner);
              const an = a?.full_name || a?.username || "someone";
              return (
                <div key={r.id} className="flex gap-3">
                  <Avatar name={an} src={a?.avatar_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foam">{an} <span className="font-normal text-mist">· {ago(r.created_at)}</span></p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[15px] text-foam/90">{r.body}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-mist">
                      <span>{nfmt(likeTally.get(r.id) ?? 0)} Likes</span>
                      <Link href={`/post/${r.id}`} className="font-semibold text-teal hover:underline">View thread →</Link>
                    </div>
                  </div>
                </div>
              );
            })}
            {replies.length === 0 && <p className="text-sm text-mist">No comments yet — start the conversation.</p>}
          </div>
        </div>
      </div>

      {/* sidebar */}
      <aside className="space-y-8">
        {(moreVideos ?? []).length > 0 && (
          <section>
            <h2 className="mb-3 border-l-2 border-teal pl-2 text-[12px] font-bold uppercase tracking-wide text-foam">More from @{author?.username ?? "user"}</h2>
            <div className="space-y-3">
              {(moreVideos ?? []).map((v) => (
                <Link key={v.id} href={`/watch/${v.id}`} className="flex gap-3 group">
                  <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-lg border border-edge bg-black">
                    {v.thumbnail
                      ? // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                      : <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-foam group-hover:text-sky">{v.title}</p>
                    <p className="mt-1 text-xs text-mist">{nfmt(v.views)} views · {ago(v.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(suggest ?? []).length > 0 && (
          <section>
            <h2 className="mb-3 border-l-2 border-teal pl-2 text-[12px] font-bold uppercase tracking-wide text-foam">Who to follow</h2>
            <div className="space-y-3">
              {(suggest as Prof[]).map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.full_name || p.username} src={p.avatar_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foam">{p.full_name || p.username}</p>
                    <p className="truncate text-xs text-mist">@{p.username ?? "user"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {trending.length > 0 && (
          <section>
            <h2 className="mb-3 border-l-2 border-teal pl-2 text-[12px] font-bold uppercase tracking-wide text-foam">Trending tags</h2>
            <div className="space-y-2.5">
              {trending.map(([tag, n]) => (
                <div key={tag}>
                  <p className="font-semibold text-foam">#{tag}</p>
                  <p className="text-xs text-mist">{nfmt(n)} {n === 1 ? "post" : "posts"}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
