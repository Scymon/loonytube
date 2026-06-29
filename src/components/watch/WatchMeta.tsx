"use client";
import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import LikeButton from "@/components/LikeButton";
import FollowUserButton from "@/components/discovery/FollowUserButton";

type Props = {
  videoId: string;
  title: string;
  description: string | null;
  views: number;
  createdAt: string;
  owner: string;
  channelUsername: string | null;
  channelName: string | null;
  channelAvatar: string | null;
  signedInUserId: string | null;
  isFollowing: boolean;
};

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function WatchMeta({
  videoId, title, description, views, createdAt,
  owner, channelUsername, channelName, channelAvatar,
  signedInUserId, isFollowing,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const isOwn = signedInUserId === owner;

  const descShort =
    description && description.length > 200
      ? description.slice(0, 200) + "…"
      : description;

  return (
    <div className="mt-4 space-y-4">
      {/* Title */}
      <h1 className="text-lg font-bold leading-snug text-foam sm:text-xl">
        {title}
      </h1>

      {/* Stats row */}
      <p className="text-sm text-mist">
        {fmtViews(views)} views · {relativeDate(createdAt)}
      </p>

      {/* Divider */}
      <div className="border-t border-edge" />

      {/* Channel row + actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Avatar + name */}
        <Link
          href={`/@${channelUsername ?? owner}`}
          className="flex items-center gap-2.5 min-w-0"
        >
          <Avatar
            name={channelName || channelUsername}
            src={channelAvatar}
            size={40}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foam">
              {channelName || channelUsername || "Creator"}
            </p>
            {channelUsername && (
              <p className="text-xs text-mist">@{channelUsername}</p>
            )}
          </div>
        </Link>

        {/* Follow button (hidden if viewer is the owner) */}
        {!isOwn && (
          <FollowUserButton
            targetId={owner}
            signedIn={!!signedInUserId}
            initialFollowing={isFollowing}
            variant="solid"
          />
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LikeButton videoId={videoId} />
          <button
            type="button"
            title="Share"
            onClick={() =>
              navigator.clipboard
                ?.writeText(window.location.href)
                .catch(() => {})
            }
            className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-sm text-mist transition hover:border-foam/40 hover:text-foam"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="rounded-xl border border-edge bg-panel/60 px-4 py-3 text-sm text-mist">
          <p className="whitespace-pre-wrap leading-relaxed">
            {expanded ? description : descShort}
          </p>
          {description.length > 200 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 text-xs font-semibold text-sky hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
