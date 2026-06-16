import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { nfmt, ago } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudioDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const { data: videos } = await supabase
    .from("videos").select("id, title, status, views, created_at, thumbnail")
    .eq("owner", uid).order("created_at", { ascending: false });
  const list = videos ?? [];

  const totalViews = list.reduce((s, v) => s + Number(v.views ?? 0), 0);
  const ready = list.filter((v) => v.status === "ready").length;
  const processing = list.filter((v) => v.status !== "ready").length;

  const [{ count: postCount }, { count: followerCount }] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("owner", uid).is("parent_id", null),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee", uid),
  ]);

  const stats = [
    { label: "Total views", value: nfmt(totalViews) },
    { label: "Published videos", value: nfmt(ready) },
    { label: "Followers", value: nfmt(followerCount ?? 0) },
    { label: "Posts", value: nfmt(postCount ?? 0) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Channel dashboard</h1>
      <p className="mt-1 text-sm text-mist">An overview of your channel{processing > 0 ? ` · ${processing} processing` : ""}.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-edge bg-surface p-4">
            <p className="text-2xl font-black text-foam">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-mist">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold">Recent uploads</h2>
        <Link href="/studio/content" className="text-sm font-semibold text-teal hover:underline">Go to uploads ›</Link>
      </div>

      <div className="mt-3 divide-y divide-edge rounded-xl border border-edge bg-surface">
        {list.slice(0, 5).map((v) => (
          <Link key={v.id} href={`/watch/${v.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-edge/40">
            <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-lg border border-edge bg-black">
              {v.thumbnail
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                : <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foam">{v.title}</p>
              <p className="text-xs text-mist">{v.status === "ready" ? `${nfmt(Number(v.views))} views` : v.status} · {ago(v.created_at)}</p>
            </div>
          </Link>
        ))}
        {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-mist">No uploads yet. <Link href="/create" className="text-teal hover:underline">Upload your first video</Link>.</p>}
      </div>
    </div>
  );
}
