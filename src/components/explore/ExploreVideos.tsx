"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ChannelGuidePlaceholder from "@/components/explore/ChannelGuidePlaceholder";
import { dur, nfmt, ago } from "@/lib/format";
import type { ExploreVideo } from "@/components/explore/ExploreShell";

const CATEGORIES = ["All", "Gaming", "Tech", "Music", "Sports", "Design", "Nature", "News"] as const;
type Cat = typeof CATEGORIES[number];
const CAT_EMOJI: Partial<Record<Cat, string>> = { Gaming: "🎮", Tech: "💻", Music: "🎵", Sports: "⚡", Design: "🎨" };

export default function ExploreVideos({ videos }: { videos: ExploreVideo[] }) {
  const [cat, setCat] = useState<Cat>("All");
  const filtered = cat === "All" ? videos : videos.filter(v => v.category?.toLowerCase() === cat.toLowerCase());

  return (
    <div className="space-y-8">
      <ChannelGuidePlaceholder />

      {/* Category filter rail */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              cat === c ? "bg-teal text-ink" : "border border-edge text-mist hover:border-teal/40 hover:text-foam"
            }`}>
            {CAT_EMOJI[c] ? `${c} ${CAT_EMOJI[c]}` : c}
          </button>
        ))}
      </div>

      {/* Video grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(v => (
            <article key={v.id}>
              <Link href={`/watch/${v.id}`} className="group block">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-edge bg-black">
                  {v.thumbnail
                    ? <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                    : <div className="grid h-full w-full place-items-center" style={{ backgroundImage: "linear-gradient(180deg,#141a24,#0b0f15)" }}>
                        <span className="text-xs text-mist">processing…</span>
                      </div>}
                  {v.duration && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-foam">{dur(v.duration)}</span>
                  )}
                  {v.category && (
                    <span className="absolute left-2 top-2 rounded-md bg-teal/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">{v.category}</span>
                  )}
                </div>
              </Link>
              <div className="mt-3 flex gap-3">
                <Link href={v.channelHandle ? `/@${v.channelHandle}` : "#"}>
                  <Avatar name={v.channel} src={v.avatar} size={34} />
                </Link>
                <div className="min-w-0">
                  <Link href={`/watch/${v.id}`}>
                    <p className="line-clamp-2 text-sm font-semibold text-foam hover:text-sky">{v.title}</p>
                  </Link>
                  <Link href={v.channelHandle ? `/@${v.channelHandle}` : "#"}>
                    <p className="mt-0.5 text-xs text-mist hover:text-foam">{v.channel}</p>
                  </Link>
                  <p className="text-xs text-mist/60">{nfmt(v.views)} views · {ago(v.created_at)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-edge bg-surface py-16 text-center">
          <p className="text-foam">No {cat} videos yet</p>
          <p className="mt-1 text-sm text-mist">Be the first to upload in this category.</p>
        </div>
      )}
    </div>
  );
}
