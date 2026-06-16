import Link from "next/link";
import Avatar from "@/components/Avatar";
import { nfmt, ago } from "@/lib/format";

export type HeroVideo = {
  id: string;
  title: string;
  thumbnail: string | null;
  views: number;
  created_at: string;
  channel: string;
  avatar: string | null;
};

export default function HeroFeature({ video }: { video: HeroVideo | null }) {
  if (!video) return null;
  return (
    <section>
      <Link href={`/watch/${video.id}`} className="group block">
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-2xl border border-edge bg-black">
          {video.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
          ) : (
            <div className="h-full w-full" style={{ backgroundImage: "radial-gradient(120% 100% at 50% 0%, rgba(45,212,180,0.18), transparent 60%), linear-gradient(180deg,#0c1a24,#070b10)" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <span className="absolute left-5 top-5 rounded-full bg-teal px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
            Now Trending
          </span>
          <div className="absolute right-5 top-5 flex gap-2">
            {["M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4", "M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5"].map((d, i) => (
              <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-black/40 text-foam/90 backdrop-blur">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={d} />
                </svg>
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="mt-4">
        <Link href={`/watch/${video.id}`}>
          <h1 className="text-2xl font-extrabold tracking-tight text-foam hover:text-sky">{video.title}</h1>
        </Link>
        <div className="mt-2 flex items-center gap-2.5 border-b border-edge pb-3">
          <Avatar name={video.channel} src={video.avatar} size={26} />
          <span className="text-sm font-semibold text-foam">{video.channel}</span>
          <span className="text-sm text-mist">· {nfmt(video.views)} views · {ago(video.created_at)}</span>
        </div>
      </div>
    </section>
  );
}
