"use client";

import { useState } from "react";
import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { createClient } from "@/lib/supabase/client";
import { nfmt, ago } from "@/lib/format";

type Post    = { id: string; body: string; images: string[]; comments: number; likes: number; created_at: string };
type Article = { id: string; title: string; cover_url: string | null; created_at: string };
type Comment = { id: string; body: string; parent_id: string; created_at: string };
type Tab = "all" | "posts" | "articles" | "comments";

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );
}

function StatPill({ icon, val }: { icon: string; val: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-mist/60">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={icon} />
      </svg>
      {nfmt(val)}
    </span>
  );
}

const COMMENT_ICON = "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z";
const HEART_ICON   = "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z";
const REPLY_ICON   = "M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v5M17 21l-5-5 5-5";

export default function ContentStudioShell({
  posts, articles, comments,
}: { posts: Post[]; articles: Article[]; comments: Comment[] }) {
  const supabase = createClient();
  const [tab,      setTab]      = useState<Tab>("all");
  const [postList, setPostList] = useState(posts);
  const [artList,  setArtList]  = useState(articles);
  const [cmtList,  setCmtList]  = useState(comments);

  async function deletePost(id: string) {
    if (!confirm("Delete this post and all its replies?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (!error) setPostList(l => l.filter(r => r.id !== id));
  }
  async function deleteArticle(id: string) {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (!error) setArtList(l => l.filter(r => r.id !== id));
  }
  async function deleteComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (!error) setCmtList(l => l.filter(r => r.id !== id));
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: postList.length + artList.length + cmtList.length },
    { key: "posts",    label: "Posts",    count: postList.length },
    { key: "articles", label: "Articles", count: artList.length },
    { key: "comments", label: "Comments", count: cmtList.length },
  ];

  const showPosts    = tab === "all" || tab === "posts";
  const showArticles = tab === "all" || tab === "articles";
  const showComments = tab === "all" || tab === "comments";

  const total = postList.length + artList.length + cmtList.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foam">Content</h1>
      <p className="mt-1 text-sm text-mist">All your published posts, articles, and comments in one place.</p>

      {/* Tab bar */}
      <div className="mt-5 flex gap-1 border-b border-edge pb-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key ? "text-teal" : "text-mist hover:text-foam"
            }`}>
            {t.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              tab === t.key ? "bg-teal/15 text-teal" : "bg-edge text-mist"
            }`}>{t.count}</span>
            {tab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-teal" />
            )}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="mt-8 rounded-2xl border border-edge bg-surface py-16 text-center">
          <p className="text-foam">Nothing here yet</p>
          <p className="mt-1 text-sm text-mist">
            <Link href="/create" className="text-teal hover:underline">Create something</Link> to get started.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">

          {/* ── Posts ──────────────────────────────────────────────────────── */}
          {showPosts && postList.map(p => (
            <div key={p.id} className="flex items-start gap-4 rounded-xl border border-edge bg-surface p-4
              hover:border-edge/80 transition-colors">
              {/* Image thumbnail if any */}
              {p.images?.[0] && (
                <div className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-edge sm:block">
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge label="Post" color="bg-sky/10 text-sky" />
                  <span className="text-xs text-mist/50">{ago(p.created_at)}</span>
                </div>
                <p className="line-clamp-2 text-sm text-foam">{p.body}</p>
                <div className="mt-2 flex items-center gap-4">
                  <StatPill icon={COMMENT_ICON} val={p.comments} />
                  <StatPill icon={HEART_ICON}   val={p.likes} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <Link href={`/post/${p.id}`}
                  className="text-xs font-semibold text-teal hover:underline">View</Link>
                <button onClick={() => deletePost(p.id)}
                  className="text-xs text-mist/50 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
          ))}

          {/* ── Articles ───────────────────────────────────────────────────── */}
          {showArticles && artList.map(a => (
            <div key={a.id} className="flex items-start gap-4 rounded-xl border border-edge bg-surface p-4
              hover:border-edge/80 transition-colors">
              {a.cover_url && (
                <div className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-edge sm:block">
                  <img src={a.cover_url} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge label="Article" color="bg-amber-500/10 text-amber-400" />
                  <span className="text-xs text-mist/50">{ago(a.created_at)}</span>
                </div>
                <p className="truncate text-sm font-semibold text-foam">{a.title}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <Link href={`/article/${a.id}`}
                  className="text-xs font-semibold text-teal hover:underline">View</Link>
                <button onClick={() => deleteArticle(a.id)}
                  className="text-xs text-mist/50 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
          ))}

          {/* ── Comments ───────────────────────────────────────────────────── */}
          {showComments && cmtList.map(c => (
            <div key={c.id} className="flex items-start gap-4 rounded-xl border border-edge bg-surface p-4
              hover:border-edge/80 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge label="Comment" color="bg-teal/10 text-teal" />
                  <span className="text-xs text-mist/50">{ago(c.created_at)}</span>
                </div>
                <p className="line-clamp-2 text-sm text-mist">{c.body}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <Link href={`/post/${c.parent_id}`}
                  className="text-xs font-semibold text-teal hover:underline">View thread</Link>
                <button onClick={() => deleteComment(c.id)}
                  className="text-xs text-mist/50 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
          ))}

          {/* Empty state for filtered tab */}
          {tab !== "all" && (
            (tab === "posts"    && postList.length === 0) ||
            (tab === "articles" && artList.length  === 0) ||
            (tab === "comments" && cmtList.length  === 0)
          ) && (
            <p className="py-12 text-center text-sm text-mist">
              No {tab} yet.{" "}
              {tab !== "comments" && <Link href="/create" className="text-teal hover:underline">Create one</Link>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
