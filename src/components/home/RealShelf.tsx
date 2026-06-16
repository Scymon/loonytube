import Link from "next/link";
import { dur } from "@/lib/format";

export type ShelfVideo = { id: string; title: string; thumbnail: string | null; duration: number | null };

export default function RealShelf({ title, videos }: { title: string; videos: ShelfVideo[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-foam">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {videos.map((v) => (
          <Link key={v.id} href={`/watch/${v.id}`} className="group">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-edge bg-black">
              {v.thumbnail
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                : <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
              {v.duration ? <span className="absolute right-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-foam">{dur(v.duration)}</span> : null}
            </div>
            <p className="mt-1.5 truncate text-sm font-semibold text-foam group-hover:text-sky">{v.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
