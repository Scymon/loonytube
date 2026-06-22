"use client";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import type { ExploreArticle } from "@/components/explore/ExploreShell";

export default function ExploreArticles({ articles }: { articles: ExploreArticle[] }) {
  if (!articles.length) {
    return (
      <div className="rounded-2xl border border-edge bg-surface py-16 text-center">
        <p className="text-foam">No articles yet</p>
        <p className="mt-1 text-sm text-mist">Long-form articles from creators you follow will appear here.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {articles.map(a => (
        <Link key={a.id} href={`/article/${a.id}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-edge bg-surface transition hover:border-teal/40">
          {a.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.cover_url} alt="" className="aspect-[16/7] w-full object-cover transition group-hover:scale-[1.02]" />
          )}
          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-teal">Article</p>
              <h3 className="line-clamp-2 text-base font-bold leading-snug text-foam group-hover:text-sky">{a.title}</h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Avatar name={a.author} src={a.avatar} size={22} />
              <span className="text-xs text-mist">{a.author} · {a.agoLabel} · {a.readMinutes} min read</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
