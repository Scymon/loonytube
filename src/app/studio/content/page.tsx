import { createClient } from "@/lib/supabase/server";
import ContentTable, { type Row } from "@/components/studio/ContentTable";

export const dynamic = "force-dynamic";

export default async function StudioContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, description, thumbnail, status, visibility, views, created_at, scheduled_at")
    .eq("owner", uid)
    .order("created_at", { ascending: false });
  const list = videos ?? [];
  const ids = list.map((v) => v.id);

  // comment + like tallies per video
  const cCount = new Map<string, number>(), lCount = new Map<string, number>();
  if (ids.length) {
    const [{ data: cs }, { data: ls }] = await Promise.all([
      supabase.from("comments").select("video_id").in("video_id", ids),
      supabase.from("likes").select("video_id").in("video_id", ids),
    ]);
    for (const c of cs ?? []) cCount.set(c.video_id, (cCount.get(c.video_id) ?? 0) + 1);
    for (const l of ls ?? []) lCount.set(l.video_id, (lCount.get(l.video_id) ?? 0) + 1);
  }

  const rows: Row[] = list.map((v) => ({
    id: v.id, title: v.title, description: v.description, thumbnail: v.thumbnail,
    status: v.status, visibility: (v as { visibility?: string }).visibility ?? "public",
    views: Number(v.views ?? 0), comments: cCount.get(v.id) ?? 0, likes: lCount.get(v.id) ?? 0,
    created_at: v.created_at, scheduled_at: (v as { scheduled_at?: string | null }).scheduled_at ?? null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Channel content</h1>
      <p className="mt-1 text-sm text-mist">Edit titles, descriptions, visibility, and release schedule.</p>
      <div className="mt-6"><ContentTable initial={rows} /></div>
    </div>
  );
}
