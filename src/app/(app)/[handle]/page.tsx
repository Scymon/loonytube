import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import FollowUserButton from "@/components/discovery/FollowUserButton";
import VideoRow, { type FeedVideo } from "@/components/home/VideoRow";
import { nfmt } from "@/lib/format";

export const dynamic = "force-dynamic";

const BANNER_FALLBACK =
  "linear-gradient(120deg,#0a1a2c 0%,#0d2b3e 40%,#103244 70%,#0a1622 100%)";

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 3h3l-7 8 8 10h-6l-5-6-5 6H1l8-9L1 3h6l4 5 7-5z" />
    </svg>
  );
}
function IgIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function YtIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
      <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function WebIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M2 12h20M12 3c-2.5 3-4 5.7-4 9s1.5 6 4 9M12 3c2.5 3 4 5.7 4 9s-1.5 6-4 9" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-mist transition hover:text-foam"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: rawHandle } = await params;
  // Strip leading @ — URLs are /@handle but the DB stores bare usernames
  const handle = decodeURIComponent(rawHandle).replace(/^@/, "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Profile lookup
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, bio, avatar_url, banner_url, website, location, social_x, social_instagram, social_youtube"
    )
    .eq("username", handle)
    .maybeSingle();

  if (!profile) notFound();

  // Follower count + viewer-follows-channel, in parallel
  const [{ count: followerCount }, followRow] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followee", profile.id),
    user
      ? supabase
          .from("follows")
          .select("follower, notif_level")
          .eq("follower", user.id)
          .eq("followee", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isFollowing = !!followRow.data;
  const notifLevel  = (followRow.data as any)?.notif_level ?? "all";
  const isOwnChannel = user?.id === profile.id;

  // Public ready videos — newest first, max 24
  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, thumbnail, duration, views, created_at")
    .eq("owner", profile.id)
    .eq("status", "ready")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(24);

  const displayName = profile.full_name || profile.username || "Channel";

  const feedVideos: FeedVideo[] = (videos ?? []).map((v) => ({
    ...v,
    channel: displayName,
    avatar: profile.avatar_url,
  }));

  const hasMeta =
    profile.bio ||
    profile.location ||
    profile.website ||
    profile.social_x ||
    profile.social_instagram ||
    profile.social_youtube;

  return (
    <div className="-mt-6">
      {/* Banner */}
      <div
        className="relative -mx-5 h-36 overflow-hidden sm:h-48 lg:-mx-8"
        style={
          profile.banner_url
            ? undefined
            : { background: BANNER_FALLBACK }
        }
      >
        {profile.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Avatar + header row */}
      <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 pb-5">
        <div className="flex items-end gap-4">
          <div
            className="rounded-full"
            style={{ boxShadow: "0 0 0 4px #0d0d0f" }}
          >
            <Avatar name={displayName} src={profile.avatar_url} size={96} />
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-bold text-foam">{displayName}</h1>
            <p className="text-sm text-mist">
              @{profile.username} ·{" "}
              {nfmt(followerCount ?? 0)} followers
            </p>
          </div>
        </div>

        <div className="pb-1">
          {isOwnChannel ? (
            <a
              href="/studio/profile"
              className="inline-flex rounded-full border border-edge px-5 py-2 text-sm font-semibold text-foam transition hover:bg-edge/40"
            >
              Edit channel
            </a>
          ) : (
            <FollowUserButton
              targetId={profile.id}
              signedIn={!!user}
              initialFollowing={isFollowing}
              initialNotifLevel={notifLevel}
              variant="solid"
            />
          )}
        </div>
      </div>

      {/* Bio + social links */}
      {hasMeta && (
        <div className="mb-8 flex flex-col gap-3 border-b border-edge pb-6">
          {profile.bio && (
            <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-mist">
              {profile.bio}
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            {profile.location && (
              <span className="inline-flex items-center gap-1.5 text-sm text-mist">
                <PinIcon /> {profile.location}
              </span>
            )}
            {profile.website && (
              <SocialLink
                href={profile.website}
                label={profile.website.replace(/^https?:\/\//, "")}
                icon={<WebIcon />}
              />
            )}
            {profile.social_x && (
              <SocialLink
                href={`https://x.com/${profile.social_x.replace(/^@/, "")}`}
                label={`@${profile.social_x.replace(/^@/, "")}`}
                icon={<XIcon />}
              />
            )}
            {profile.social_instagram && (
              <SocialLink
                href={`https://instagram.com/${profile.social_instagram.replace(/^@/, "")}`}
                label={`@${profile.social_instagram.replace(/^@/, "")}`}
                icon={<IgIcon />}
              />
            )}
            {profile.social_youtube && (
              <SocialLink
                href={`https://youtube.com/@${profile.social_youtube.replace(/^@/, "")}`}
                label={profile.social_youtube}
                icon={<YtIcon />}
              />
            )}
          </div>
        </div>
      )}

      {/* Videos */}
      {feedVideos.length > 0 ? (
        <>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-mist">
            Videos
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {feedVideos.map((v) => (
              <VideoRow key={v.id} video={v} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-lg font-semibold text-foam">No videos yet</p>
          <p className="text-sm text-mist">
            {isOwnChannel
              ? "Upload your first video to get started."
              : "This channel hasn't uploaded any videos yet."}
          </p>
          {isOwnChannel && (
            <a
              href="/create"
              className="mt-2 rounded-full px-5 py-2 text-sm font-bold text-ink"
              style={{
                backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)",
              }}
            >
              Upload a video
            </a>
          )}
        </div>
      )}
    </div>
  );
}
