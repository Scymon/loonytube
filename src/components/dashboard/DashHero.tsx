"use client";

import Avatar from "@/components/Avatar";
import Link from "next/link";

export type FeaturedVideo = {
  id: string;
  title: string;
  thumbnail: string | null;
  channelName: string;
  channelHandle: string;
  channelAvatar: string | null;
  isLive?: boolean;
};

type Props = {
  featuredVideo: FeaturedVideo | null;
  bannerUrl?: string | null;
};

/**
 * Cloudflare Stream in "background player" mode.
 * The iframe is oversized + centered so the 16:9 video always fills the
 * wider-than-16:9 hero container — same visual effect as object-cover.
 */
function BgPlayer({ id, poster }: { id: string; poster?: string }) {
  const src = [
    `https://iframe.cloudflarestream.com/${id}`,
    `?autoplay=true&muted=true&loop=true&controls=false&preload=auto`,
    poster ? `&poster=${encodeURIComponent(poster)}` : "",
  ].join("");

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <iframe
        src={src}
        allow="autoplay; fullscreen; picture-in-picture"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          /* Always wider/taller than the container to simulate object-cover */
          width: "100%",
          height: "56.25vw",   /* 16:9 at viewport width */
          minWidth: "177.78vh", /* 16:9 at viewport height */
          minHeight: "100%",
          border: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default function DashHero({ featuredVideo, bannerUrl }: Props) {
  /* ── Empty state ── */
  if (!featuredVideo) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-b-2xl"
        style={{ aspectRatio: "16/5", minHeight: 200 }}
      >
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a2c] via-[#0d2b3e] to-[#0a1622]" />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="text-lg font-semibold text-foam/80">Nothing queued up yet</p>
          <p className="text-sm text-mist">Follow channels or like videos to fill this space</p>
        </div>
      </div>
    );
  }

  /* ── Playing state ── */
  return (
    <div
      className="group relative w-full overflow-hidden rounded-b-2xl"
      style={{ aspectRatio: "16/5", minHeight: 200 }}
    >
      {/* Muted background video */}
      <BgPlayer
        id={featuredVideo.id}
        poster={featuredVideo.thumbnail ?? undefined}
      />

      {/* Slight darkening overlay — gradient bottom-to-top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none" />

      {/* Top-left: NOW PLAYING pill */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <span className="rounded-full bg-teal/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
          Now Playing
        </span>
        {featuredVideo.isLive && (
          <span className="ml-2 rounded px-2 py-1 text-[11px] font-bold bg-loonred text-white">
            LIVE
          </span>
        )}
      </div>

      {/* Bottom: title + channel — clicking navigates to the video */}
      <Link
        href={`/watch/${featuredVideo.id}`}
        className="absolute bottom-0 left-0 right-0 px-4 pb-4 hover:brightness-110 transition"
      >
        <p className="text-xl font-bold text-white drop-shadow line-clamp-1">
          {featuredVideo.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Avatar name={featuredVideo.channelName} src={featuredVideo.channelAvatar} size={20} />
          <span className="text-sm font-semibold text-foam/90">{featuredVideo.channelName}</span>
        </div>
      </Link>
    </div>
  );
}
