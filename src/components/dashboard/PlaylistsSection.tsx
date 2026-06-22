import Link from "next/link";

export type PlaylistCard = {
  id: string;
  title: string;
  videoCount: number;
  thumbnail: string | null;
};

function PlaylistThumb({ pl }: { pl: PlaylistCard }) {
  return (
    <Link href={`/playlist/${pl.id}`}
      className="group shrink-0 w-40 sm:w-48 overflow-hidden rounded-xl border border-edge/60 bg-surface hover:border-hair transition">
      <div className="relative aspect-video bg-edge/40 overflow-hidden">
        {pl.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pl.thumbnail} alt={pl.title}
            className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#0d2b3e] to-[#0a1622]" />
        )}
        <span className="absolute top-1 right-1 rounded bg-black/80 px-1.5 text-[10px] text-white font-medium">
          {pl.videoCount} video{pl.videoCount !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="px-2 py-1.5 text-[11px] font-semibold text-foam line-clamp-2 leading-snug">
        {pl.title}
      </p>
    </Link>
  );
}

type Props = { playlists?: PlaylistCard[] };

export default function PlaylistsSection({ playlists: items = [] }: Props) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-foam">
          <span>&#9646;</span> My Playlists
        </h2>
        <Link href="/playlists" className="text-xs text-mist hover:text-foam transition">
          See All &rsaquo;
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-mist">Playlists you create will appear here.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {items.map((pl) => <PlaylistThumb key={pl.id} pl={pl} />)}
        </div>
      )}
    </section>
  );
}
