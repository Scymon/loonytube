"use client";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import FollowUserButton from "@/components/discovery/FollowUserButton";
import { IcoChevron } from "./WatchIcons";

export type SidebarVideo = {
  id: string;
  title: string;
  thumbnail: string | null;
  views: number;
  created_at: string;
  duration: number | null;
};

export type SidebarProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type TrendingTag = {
  tag: string;
  count: number;
};

function fmtDur(s: number | null) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Collapsed thumbnail strip ─────────────────────────────────────────────────
function ThumbStrip({ videos }: { videos: SidebarVideo[] }) {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      {videos.map((v) => (
        <Link key={v.id} href={`/watch/${v.id}`} title={v.title}>
          <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-edge/40">
            {v.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.thumbnail}
                alt={v.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-edge/60" />
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Expanded: More from channel ───────────────────────────────────────────────
function MoreVideos({ videos, channelHandle }: { videos: SidebarVideo[]; channelHandle: string }) {
  if (!videos.length) return null;
  return (
    <div>
      <Link
        href={`/@${channelHandle}`}
        className="mb-2 block text-xs font-semibold uppercase tracking-wider text-mist/60 hover:text-mist"
      >
        More from @{channelHandle}
      </Link>
      <div className="space-y-2">
        {videos.map((v) => (
          <Link key={v.id} href={`/watch/${v.id}`} className="group flex gap-2">
            <div className="relative h-[54px] w-24 shrink-0 overflow-hidden rounded-lg bg-edge/40">
              {v.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="h-full w-full object-cover transition group-hover:brightness-90"
                />
              ) : (
                <div className="h-full w-full bg-edge/60" />
              )}
              {v.duration && (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 text-[10px] font-semibold tabular-nums text-white">
                  {fmtDur(v.duration)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <p className="line-clamp-2 text-xs font-semibold leading-snug text-foam group-hover:text-teal">
                {v.title}
              </p>
              <p className="mt-1 text-[11px] text-mist/70">
                {fmtViews(v.views)} views
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Expanded: Who to Follow ───────────────────────────────────────────────────
function WhoToFollow({
  profiles,
  signedIn,
}: {
  profiles: SidebarProfile[];
  signedIn: boolean;
}) {
  if (!profiles.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist/60">
        Who to Follow
      </p>
      <div className="space-y-2.5">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <Link href={`/@${p.username ?? p.id}`} className="shrink-0">
              <Avatar name={p.full_name || p.username} src={p.avatar_url} size={32} />
            </Link>
            <Link
              href={`/@${p.username ?? p.id}`}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-xs font-semibold text-foam hover:text-teal">
                {p.full_name || p.username || "Creator"}
              </p>
              {p.username && (
                <p className="text-[11px] text-mist/60">@{p.username}</p>
              )}
            </Link>
            <FollowUserButton
              targetId={p.id}
              signedIn={signedIn}
              initialFollowing={false}
              variant="link"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Expanded: Trending ────────────────────────────────────────────────────────
function Trending({ tags }: { tags: TrendingTag[] }) {
  if (!tags.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist/60">
        Trending
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(({ tag, count }) => (
          <Link
            key={tag}
            href={`/hashtag/${encodeURIComponent(tag)}`}
            className="rounded-full border border-edge bg-panel px-3 py-1 text-xs font-medium text-mist transition hover:border-teal/50 hover:text-teal"
          >
            #{tag}
            <span className="ml-1 text-mist/40">{fmtViews(count)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function WatchSidebar({
  channelHandle,
  relatedVideos,
  suggestedProfiles,
  trendingTags,
  signedIn,
  open,
  onOpenChange,
}: {
  channelHandle: string;
  relatedVideos: SidebarVideo[];
  suggestedProfiles: SidebarProfile[];
  trendingTags: TrendingTag[];
  signedIn: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-l border-edge bg-panel/40 transition-all duration-200 ${
        open ? "w-[300px]" : "w-[80px]"
      }`}
    >
      {/* Toggle tab */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        title={open ? "Collapse sidebar" : "Expand sidebar"}
        className="absolute -left-3.5 top-6 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-edge bg-panel text-mist shadow-md transition hover:bg-edge/80 hover:text-foam"
      >
        <IcoChevron dir={open ? "right" : "left"} />
      </button>

      <div className="overflow-y-auto px-3 py-4">
        {open ? (
          /* Expanded view */
          <div className="space-y-6">
            <MoreVideos videos={relatedVideos} channelHandle={channelHandle} />
            {!!suggestedProfiles.length && !!relatedVideos.length && (
              <div className="border-t border-edge" />
            )}
            <WhoToFollow profiles={suggestedProfiles} signedIn={signedIn} />
            {!!trendingTags.length && (!!suggestedProfiles.length || !!relatedVideos.length) && (
              <div className="border-t border-edge" />
            )}
            <Trending tags={trendingTags} />
          </div>
        ) : (
          /* Collapsed: thumbnail icon rail */
          <ThumbStrip videos={relatedVideos} />
        )}
      </div>
    </aside>
  );
}
