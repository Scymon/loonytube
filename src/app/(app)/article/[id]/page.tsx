import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import { ago } from "@/lib/format";

type Block = { type: "text" | "image"; value?: string; url?: string };

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: article } = await supabase
    .from("articles").select("id, owner, title, cover_url, blocks, created_at").eq("id", id).maybeSingle();

  if (!article) return <p className="py-20 text-center text-mist">This article couldn&apos;t be found.</p>;

  const { data: author } = await supabase.from("profiles").select("username, full_name, avatar_url").eq("id", article.owner).maybeSingle();
  const aName = author?.full_name || author?.username || "someone";
  const blocks = (article.blocks ?? []) as Block[];

  return (
    <article className="mx-auto max-w-2xl">
      {article.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.cover_url} alt="" className="mb-6 max-h-80 w-full rounded-2xl border border-edge object-cover" />
      )}
      <h1 className="text-3xl font-bold leading-tight text-foam">{article.title}</h1>
      <div className="mt-4 flex items-center gap-3">
        <Avatar name={aName} src={author?.avatar_url} size={40} />
        <div>
          <p className="font-semibold text-foam">{aName}</p>
          <p className="text-xs text-mist">@{author?.username || "user"} · {ago(article.created_at)}</p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {blocks.map((b, i) =>
          b.type === "image" ? (
            <a key={i} href={b.url} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt="" className="w-full rounded-xl border border-edge object-cover" />
            </a>
          ) : (
            <p key={i} className="whitespace-pre-wrap text-[17px] leading-relaxed text-foam/90">{b.value}</p>
          )
        )}
      </div>

      <div className="mt-12 border-t border-edge pt-6">
        <Link href="/" className="text-sm text-teal hover:underline">← Back to LoonyTube</Link>
      </div>
    </article>
  );
}
