import Link from "next/link";
import Avatar from "@/components/Avatar";
import { nfmt, dur, ago } from "@/lib/format";

export type FeedVideo = {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  views: number;
  created_at: string;
  channel: string;
  avatar: string | null;
};

export default function VideoRow({ video }: { video: FeedVideo }) {
  const d = dur(video.duration);
  return (
    <article>
      <Link href={`/watch/${video.id}`} className="group block">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-edge bg-black">
          {video.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
          ) : (
            <div className="grid h-full w-full place-items-center text-mist" style={{ backgroundImage: "linear-gradient(180deg,#141a24,#0b0f15)" }}>
              <span className="text-sm">processing…</span>
            </div>
          )}
          {d && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-foam">
              {d}
            </span>
          )}
        </div>
      </Link>
      <div className="mt-3 flex gap-3">
        <Avatar name={video.channel} src={video.avatar} size={36} />
        <div className="min-w-0">
          <Link href={`/watch/${video.id}`}>
            <h3 className="line-clamp-2 font-semibold leading-snug text-foam hover:text-sky">{video.title}</h3>
          </Link>
          <p className="mt-1 text-sm text-mist">{video.channel}</p>
          <p className="text-sm text-mist">{nfmt(video.views)} views · {ago(video.created_at)}</p>
        </div>
      </div>
    </article>
  );
}
