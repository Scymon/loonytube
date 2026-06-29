import Link from "next/link";
import type { ReactNode } from "react";
import Avatar from "@/components/Avatar";
import { nfmt, dur, ago } from "@/lib/format";

// Highlight #hashtags in post bodies. Span-only because these render inside
// card-level <Link>s — nested anchors are invalid. The post-detail page (not a
// link wrapper) renders its own linked version.
export function TagText({ text }: { text: string }) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("#")
          ? <span key={i} className="text-teal">{p}</span>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

export type VideoHit = {
  id: string; title: string; description: string | null; thumbnail: string | null;
  views: number; duration: number | null; created_at: string; channel: string;
};

export function VideoResult({ v }: { v: VideoHit }) {
  return (
    <Link href={`/watch/${v.id}`} className="group flex gap-4">
      <div className="relative aspect-video w-64 shrink-0 overflow-hidden rounded-xl border border-edge bg-black">
        {v.thumbnail
          ? // eslint-disable-next-line @next/next/no-img-element
            <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
          : <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
        {v.duration ? <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-foam">{dur(v.duration)}</span> : null}
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-foam group-hover:text-sky">{v.title}</h3>
        <p className="mt-1 text-sm text-mist">{v.channel} · {nfmt(v.views)} views · {ago(v.created_at)}</p>
        {v.description && <p className="mt-2 line-clamp-2 text-sm text-mist">{v.description}</p>}
      </div>
    </Link>
  );
}

export type PostHit = {
  id: string; body: string; created_at: string;
  author: string; handle: string; avatar: string | null;
  likes: number; replies: number;
};

export function PostResult({ p }: { p: PostHit }) {
  return (
    <Link href={`/post/${p.id}`} className="block rounded-2xl border border-edge bg-surface p-4 transition hover:border-hair">
      <div className="flex items-center gap-2.5">
        <Avatar name={p.author} src={p.avatar} size={32} />
        <p className="text-sm font-semibold text-foam">{p.author} <span className="font-normal text-mist">@{p.handle} · {ago(p.created_at)}</span></p>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[15px] text-foam/90"><TagText text={p.body} /></p>
      <p className="mt-3 text-xs text-mist">{nfmt(p.replies)} Replies · {nfmt(p.likes)} Likes</p>
    </Link>
  );
}

export function PeopleRow({
  name, handle, avatar, sub, action,
}: { name: string; handle: string; avatar: string | null; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Link href={`/${handle}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80 transition-opacity">
        <Avatar name={name} src={avatar} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foam">{name}</p>
          <p className="truncate text-xs text-mist">{sub ?? `@${handle}`}</p>
        </div>
      </Link>
      {action}
    </div>
  );
}
