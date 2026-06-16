// Renders a real Loon Post when one exists (links to /post/[id]); falls back to
// the labeled sample in placeholders.ts only when there are no posts yet.
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { nfmt } from "@/lib/format";

export type CardPost = {
  href?: string;
  author: string;
  handle: string;
  avatar?: string | null;
  agoLabel: string;
  body: string;
  comments: number;
  reposts: number;
  likes: number;
};

function Body({ text }: { text: string }) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g);
  return (
    <p className="mt-3 text-[15px] leading-relaxed text-foam/90">
      {parts.map((p, i) => (p.startsWith("#") ? <span key={i} className="text-teal">{p}</span> : <span key={i}>{p}</span>))}
    </p>
  );
}

export default function PostCard({ post }: { post: CardPost }) {
  const inner = (
    <article className="rounded-2xl border border-edge bg-surface p-5 transition hover:border-hair">
      <div className="flex items-center gap-3">
        <Avatar name={post.author} src={post.avatar} size={40} />
        <p className="font-semibold text-foam">
          {post.author} <span className="font-normal text-mist">@{post.handle} · {post.agoLabel}</span>
        </p>
      </div>
      <Body text={post.body} />
      <div className="mt-4 flex items-center gap-8 text-sm text-mist">
        <span className="inline-flex items-center gap-2">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z" /></svg>
          {nfmt(post.comments)}
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" /></svg>
          {nfmt(post.reposts)}
        </span>
        <span className="inline-flex items-center gap-2 text-link">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.6-9.5-9A5 5 0 0112 5a5 5 0 019.5 7c-2.5 4.4-9.5 9-9.5 9z" /></svg>
          {nfmt(post.likes)}
        </span>
      </div>
    </article>
  );
  return post.href ? <Link href={post.href} className="block">{inner}</Link> : inner;
}
