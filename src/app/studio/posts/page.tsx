import { createClient } from "@/lib/supabase/server";
import ContentStudioShell from "@/components/studio/ContentStudioShell";

export const dynamic = "force-dynamic";

export default async function StudioThreads() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  // ── Posts (root threads only) ──────────────────────────────────────────────
  const { data: postRows } = await supabase
    .from("posts").select("id, body, images, created_at")
    .eq("owner", uid).is("parent_id", null)
    .order("created_at", { ascending: false });
  const postIds = (postRows ?? []).map(p => p.id);
  const commentC = new Map<string, number>(), likeC = new Map<string, number>();
  if (postIds.length) {
    const [{ data: cm }, { data: lk }] = await Promise.all([
      supabase.from("posts").select("parent_id").in("parent_id", postIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
    ]);
    for (const c of cm ?? []) if (c.parent_id) commentC.set(c.parent_id, (commentC.get(c.parent_id) ?? 0) + 1);
    for (const l of lk ?? []) likeC.set(l.post_id, (likeC.get(l.post_id) ?? 0) + 1);
  }

  // ── Articles ──────────────────────────────────────────────────────────────
  const { data: artRows } = await supabase
    .from("articles").select("id, title, cover_url, created_at")
    .eq("owner", uid).order("created_at", { ascending: false });

  // ── Comments (replies the user wrote on others' posts) ────────────────────
  const { data: replyRows } = await supabase
    .from("posts").select("id, body, parent_id, created_at")
    .eq("owner", uid).not("parent_id", "is", null)
    .order("created_at", { ascending: false }).limit(50);

  return (
    <ContentStudioShell
      posts={(postRows ?? []).map(p => ({
        id: p.id, body: p.body, images: (p.images ?? []) as string[],
        comments: commentC.get(p.id) ?? 0,
        likes:    likeC.get(p.id)    ?? 0,
        created_at: p.created_at,
      }))}
      articles={(artRows ?? []).map(a => ({
        id: a.id, title: a.title, cover_url: a.cover_url ?? null, created_at: a.created_at,
      }))}
      comments={(replyRows ?? []).map(r => ({
        id: r.id, body: r.body, parent_id: r.parent_id as string, created_at: r.created_at,
      }))}
    />
  );
}
