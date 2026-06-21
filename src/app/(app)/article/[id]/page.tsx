import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import { ago } from "@/lib/format";

type Block = {
  type: "text" | "h2" | "h3" | "quote" | "code" | "image" | "divider" | "video";
  value?: string;
  url?: string;
  caption?: string;
  videoId?: string;
  videoTitle?: string;
  videoThumb?: string;
};

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: article } = await supabase
    .from("articles")
    .select("id, owner, title, cover_url, blocks, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!article)
    return <p className="py-20 text-center text-mist">This article couldn&apos;t be found.</p>;

  const { data: author } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", article.owner)
    .maybeSingle();

  const aName = author?.full_name || author?.username || "someone";
  const blocks = (article.blocks ?? []) as Block[];

  const wordCount = blocks.reduce(
    (n, b) => n + (b.value ?? "").split(/\s+/).filter(Boolean).length,
    0
  );
  const readMin = Math.max(1, Math.round(wordCount / 200));

  return (
    <article className="mx-auto max-w-2xl pb-16">
      {article.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.cover_url}
          alt=""
          className="mb-8 max-h-80 w-full rounded-2xl border border-edge object-cover"
        />
      )}

      <h1 className="text-3xl font-bold leading-tight text-foam">{article.title}</h1>

      <div className="mt-4 flex items-center gap-3 border-b border-edge pb-6">
        <Avatar name={aName} src={author?.avatar_url} size={40} />
        <div>
          <p className="font-semibold text-foam">{aName}</p>
          <p className="text-xs text-mist">
            @{author?.username || "user"} · {ago(article.created_at)} · {readMin} min read
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {blocks.map((b, i) => {
          switch (b.type) {
            case "h2":
              return (
                <h2 key={i} className="text-2xl font-bold leading-snug text-foam">
                  {b.value}
                </h2>
              );
            case "h3":
              return (
                <h3 key={i} className="text-xl font-semibold leading-snug text-foam">
                  {b.value}
                </h3>
              );
            case "quote":
              return (
                <blockquote
                  key={i}
                  className="border-l-4 border-teal/50 pl-4 italic text-foam/70"
                >
                  {b.value}
                </blockquote>
              );
            case "code":
              return (
                <pre
                  key={i}
                  className="overflow-x-auto rounded-xl border border-edge bg-black/30 p-4 text-sm text-foam/80"
                >
                  <code>{b.value}</code>
                </pre>
              );
            case "image":
              return (
                <figure key={i} className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.url}
                    alt={b.caption ?? ""}
                    className="w-full rounded-xl border border-edge object-cover"
                  />
                  {b.caption && (
                    <figcaption className="text-center text-xs text-mist">{b.caption}</figcaption>
                  )}
                </figure>
              );
            case "divider":
              return <hr key={i} className="border-edge" />;
            case "video":
              return (
                <figure key={i} className="space-y-2">
                  {b.videoId ? (
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-edge bg-black">
                      <iframe
                        src={`https://iframe.cloudflarestream.com/${b.videoId}`}
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded-xl border border-edge bg-surface text-mist">
                      Video unavailable
                    </div>
                  )}
                  {b.videoTitle && (
                    <figcaption className="text-center text-xs text-mist">{b.videoTitle}</figcaption>
                  )}
                </figure>
              );
            default:
              return b.value ? (
                <p key={i} className="whitespace-pre-wrap text-[17px] leading-relaxed text-foam/90">
                  {b.value}
                </p>
              ) : null;
          }
        })}
      </div>

      <div className="mt-12 border-t border-edge pt-6">
        <Link href="/" className="text-sm text-teal hover:underline">
          ← Back to LoonyTube
        </Link>
      </div>
    </article>
  );
}
