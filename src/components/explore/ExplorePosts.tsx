"use client";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { nfmt } from "@/lib/format";
import type { ExplorePost } from "@/components/explore/ExploreShell";

function Body({ text }: { text: string }) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g);
  return (
    <p className="mt-2.5 text-[15px] leading-relaxed text-foam/90">
      {parts.map((p, i) => p.startsWith("#") ? <span key={i} className="text-teal">{p}</span> : <span key={i}>{p}</span>)}
    </p>
  );
}

export default function ExplorePosts({ posts }: { posts: ExplorePost[] }) {
  if (!posts.length) {
    return (
      <div className="rounded-2xl border border-edge bg-surface py-16 text-center">
        <p className="text-foam">No posts yet</p>
        <p className="mt-1 text-sm text-mist">Follow some channels to see their posts here.</p>
      </div>
    );
  }
  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
      {posts.map(p => (
        <article key={p.id} className="mb-5 break-inside-avoid rounded-2xl border border-edge bg-surface p-5 transition hover:border-hair">
          <div className="flex items-center gap-3">
            <Link href={`/@${p.handle}`}>
              <Avatar name={p.author} src={p.avatar} size={38} />
            </Link>
            <div className="min-w-0">
              <Link href={`/@${p.handle}`} className="text-sm font-semibold text-foam hover:text-sky">{p.author}</Link>
              <p className="text-xs text-mist">@{p.handle} · {p.agoLabel}</p>
            </div>
          </div>
          <Link href={`/post/${p.id}`}><Body text={p.body} /></Link>
          {p.images && p.images.length > 0 && (
            <div className={`mt-3 grid gap-1.5 ${p.images.length === 1 ? "" : "grid-cols-2"}`}>
              {p.images.slice(0, 4).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} alt="" className="w-full rounded-lg object-cover" style={{ maxHeight: 240 }} />
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-6 text-xs text-mist">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z"/></svg>
              {nfmt(p.replies)}
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg>
              {nfmt(p.reposts)}
            </span>
            <span className="flex items-center gap-1.5 text-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.6-9.5-9A5 5 0 0112 5a5 5 0 019.5 7c-2.5 4.4-9.5 9-9.5 9z"/></svg>
              {nfmt(p.likes)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
