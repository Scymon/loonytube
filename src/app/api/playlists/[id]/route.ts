import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET: playlist details + video items
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: playlist, error } = await supabase
    .from("playlists")
    .select("id, title, visibility, created_at, owner")
    .eq("id", id).maybeSingle();

  if (error || !playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: items } = await supabase
    .from("playlist_items")
    .select("id, video_id, position, added_at")
    .eq("playlist_id", id)
    .order("position", { ascending: true });

  const videoIds = (items ?? []).map((i: { video_id: string }) => i.video_id);
  const vidMap: Record<string, Record<string, unknown>> = {};

  if (videoIds.length) {
    const { data: vids } = await supabase
      .from("videos").select("id, title, thumbnail, duration, views, owner")
      .in("id", videoIds);

    for (const v of vids ?? []) vidMap[v.id] = { ...v };

    const ownerIds = [...new Set((vids ?? []).map((v: { owner: string }) => v.owner))];
    if (ownerIds.length) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, username, avatar_url")
        .in("id", ownerIds);
      const ownerMap = new Map(
        (profiles ?? []).map((p: { id: string; full_name: string | null; username: string | null; avatar_url: string | null }) =>
          [p.id, { channel: p.full_name || p.username || "someone", avatar: p.avatar_url ?? null, handle: p.username ?? "" }]
        )
      );
      for (const vid of Object.values(vidMap)) {
        Object.assign(vid, ownerMap.get(vid.owner as string) ?? {});
      }
    }
  }

  const enrichedItems = (items ?? []).map((item: { video_id: string; [k: string]: unknown }) => ({
    ...item, ...(vidMap[item.video_id] ?? {}),
  }));

  return NextResponse.json({ playlist, items: enrichedItems });
}

// PUT: update title/visibility
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, string> = {};
  if (body.title?.trim()) updates.title = body.title.trim();
  if (body.visibility) updates.visibility = body.visibility;

  const { error } = await supabase
    .from("playlists").update(updates).eq("id", id).eq("owner", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: delete playlist
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("playlists").delete().eq("id", id).eq("owner", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
