import { createClient } from "@/lib/supabase/server";
import { cfDisplayThumbnail } from "@/lib/cloudflare";
import StudioUploadsShell from "@/components/studio/StudioUploadsShell";
import { type Row } from "@/components/studio/ContentTable";

export const dynamic = "force-dynamic";

export default async function StudioContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, description, thumbnail, status, visibility, views, created_at, scheduled_at, duration")
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

  // Private videos sit behind Cloudflare signed URLs, so a stored
  // videodelivery.net thumbnail 401s until its uid is swapped for a token.
  // Only private rows with a Cloudflare thumbnail cost a round-trip.
  const rows: Row[] = await Promise.all(
    list.map(async (v) => {
      const visibility = (v as { visibility?: string }).visibility ?? "public";
      return {
        id: v.id,
        title: v.title,
        description: v.description,
        thumbnail: await cfDisplayThumbnail(v.id, v.thumbnail, visibility),
        status: v.status,
        visibility,
        views: Number(v.views ?? 0),
        comments: cCount.get(v.id) ?? 0,
        likes: lCount.get(v.id) ?? 0,
        created_at: v.created_at,
        scheduled_at: (v as { scheduled_at?: string | null }).scheduled_at ?? null,
        duration: (v as { duration?: number | null }).duration ?? null,
      };
    }),
  );

  return <StudioUploadsShell initial={rows} />;
}
