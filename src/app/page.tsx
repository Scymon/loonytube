import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  thumbnail: string | null;
  views: number;
  created_at: string;
  owner: string;
};

export default async function Feed() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("videos")
    .select("id, title, thumbnail, views, created_at, owner")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(48);

  if (error) console.error("feed query error:", error);

  const videos = (data ?? []) as Row[];

  // Look up uploader usernames in one batched query, then map id -> username.
  const ownerIds = [...new Set(videos.map((v) => v.owner))];
  const names = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", ownerIds);
    for (const p of profs ?? []) names.set(p.id, p.username ?? "someone");
  }

  if (videos.length === 0) {
    return (
      <div className="py-24 text-center text-gray-400">
        <p className="text-xl">The lake is quiet.</p>
        <p className="mt-2 text-sm">No videos yet — be the first to upload.</p>
        <Link href="/upload" className="mt-4 inline-block text-loon hover:underline">
          Upload a video →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <Link key={v.id} href={`/watch/${v.id}`} className="group">
          <div className="aspect-video overflow-hidden rounded-lg border border-edge bg-black">
            {v.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.thumbnail}
                alt={v.title}
                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-600">no thumbnail</div>
            )}
          </div>
          <div className="mt-2">
            <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-loon">
              {v.title}
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              {names.get(v.owner) ?? "someone"} · {v.views} views
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}