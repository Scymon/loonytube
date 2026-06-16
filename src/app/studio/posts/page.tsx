import { createClient } from "@/lib/supabase/server";
import PostsTable, { type ThreadRow } from "@/components/studio/PostsTable";

export const dynamic = "force-dynamic";

export default async function StudioThreads() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  // Threads = the user's root nodes (parent_id null). Each row IS a thread.
  const { data: mine } = await supabase
    .from("posts").select("id, body, created_at").eq("owner", uid).is("parent_id", null)
    .order("created_at", { ascending: false });
  const roots = mine ?? [];
  const rootIds = roots.map((p) => p.id);

  // comment + like tallies
  const commentC = new Map<string, number>(), likeC = new Map<string, number>();
  if (rootIds.length) {
    const [{ data: cm }, { data: lk }] = await Promise.all([
      supabase.from("posts").select("parent_id").in("parent_id", rootIds),
      supabase.from("post_likes").select("post_id").in("post_id", rootIds),
    ]);
    for (const c of cm ?? []) if (c.parent_id) commentC.set(c.parent_id, (commentC.get(c.parent_id) ?? 0) + 1);
    for (const l of lk ?? []) likeC.set(l.post_id, (likeC.get(l.post_id) ?? 0) + 1);
  }

  const rows: ThreadRow[] = roots.map((p) => ({
    id: p.id, body: p.body,
    comments: commentC.get(p.id) ?? 0, likes: likeC.get(p.id) ?? 0, created_at: p.created_at,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Threads</h1>
      <p className="mt-1 text-sm text-mist">Each thread is one of your posts. The comment count is the conversation under it.</p>
      <div className="mt-6"><PostsTable initial={rows} /></div>
    </div>
  );
}
