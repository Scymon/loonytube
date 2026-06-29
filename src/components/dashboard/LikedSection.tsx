import Link from "next/link";
import Avatar from "@/components/Avatar";
import { dur } from "@/lib/format";

export type LikedVideo = {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
};

export type LikedGroup = {
  channelName: string;
  channelHandle: string;
  channelAvatar: string | null;
  videos: LikedVideo[];
};

function VideoThumb({ video }: { video: LikedVideo }) {
  return (
    <Link href={`/watch/${video.id}`}
      className="group shrink-0 w-40 sm:w-48 overflow-hidden rounded-xl border border-edge/60 bg-surface hover:border-hair transition">
      <div className="relative aspect-video bg-edge/40 overflow-hidden">
        {video.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail} alt={video.title}
            className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-edge/60 to-edge/20" />
        )}
        {video.duration != null && (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-mono text-white">
            {dur(video.duration)}
          </span>
        )}
      </div>
      <p className="px-2 py-1.5 text-[11px] font-medium text-foam line-clamp-2 leading-snug">
        {video.title}
      </p>
    </Link>
  );
}

type Props = { groups: LikedGroup[] };

export default function LikedSection({ groups }: Props) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-foam">
          <span>&#10084;&#65039;</span> Liked Videos
        </h2>
        <Link href="/liked" className="text-xs text-mist hover:text-foam transition">
          See All &rsaquo;
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-mist">Videos you like will appear here.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.channelHandle || g.channelName}>
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={g.channelName} src={g.channelAvatar} size={20} />
                <Link href={`/@${g.channelHandle}`}
                  className="text-xs font-semibold text-teal hover:underline">
                  {g.channelName}
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {g.videos.map((v) => <VideoThumb key={v.id} video={v} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
