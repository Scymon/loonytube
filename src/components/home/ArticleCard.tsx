import Link from "next/link";
import Avatar from "@/components/Avatar";
import { ago } from "@/lib/format";

export type CardArticle = {
  id: string;
  title: string;
  cover_url: string | null;
  author: string;
  handle: string;
  avatar: string | null;
  agoLabel: string;
  readMinutes: number;
};

export default function ArticleCard({ article }: { article: CardArticle }) {
  return (
    <Link
      href={`/article/${article.id}`}
      className="group flex gap-4 rounded-2xl border border-edge bg-surface p-4 transition hover:border-teal/40 hover:bg-surface/80"
    >
      {article.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover_url}
          alt=""
          className="h-24 w-36 flex-shrink-0 rounded-xl border border-edge object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-teal">Article</p>
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-foam group-hover:text-teal">
            {article.title}
          </h3>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Avatar name={article.author} src={article.avatar} size={20} />
          <span className="text-xs text-mist">
            {article.author} · {article.agoLabel} · {article.readMinutes} min read
          </span>
        </div>
      </div>
    </Link>
  );
}
