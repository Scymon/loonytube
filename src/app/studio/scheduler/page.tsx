import { createClient } from "@/lib/supabase/server";
import Scheduler, { type SchedRow } from "@/components/studio/Scheduler";
import { cfDisplayThumbnail } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export default async function StudioScheduler() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const { data: videos } = await supabase
    .from("videos").select("id, title, thumbnail, status, scheduled_at, visibility")
    .eq("owner", uid).order("created_at", { ascending: false });

  const rows: SchedRow[] = await Promise.all(
    (videos ?? []).map(async (v) => ({
      id: v.id, title: v.title, status: v.status,
      // Private media needs a signed thumbnail URL.
      thumbnail: await cfDisplayThumbnail(
        v.id, v.thumbnail, (v as { visibility?: string }).visibility,
      ),
      scheduled_at: (v as { scheduled_at?: string | null }).scheduled_at ?? null,
    })),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Scheduler</h1>
      <p className="mt-1 text-sm text-mist">Plan your release schedule.</p>
      <div className="mt-6"><Scheduler initial={rows} /></div>
    </div>
  );
}
