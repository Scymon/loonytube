import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST: add video to playlist
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: pl } = await supabase
    .from("playlists").select("owner").eq("id", id).maybeSingle();
  if (!pl || pl.owner !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { video_id } = await req.json();
  if (!video_id) return NextResponse.json({ error: "video_id required" }, { status: 400 });

  // Next position
  const { count } = await supabase
    .from("playlist_items")
    .select("*", { count: "exact", head: true })
    .eq("playlist_id", id);

  const { error } = await supabase
    .from("playlist_items")
    .insert({ playlist_id: id, video_id, position: count ?? 0 });

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "Already in playlist" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE: remove video from playlist
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { video_id } = await req.json();
  const { error } = await supabase
    .from("playlist_items")
    .delete().eq("playlist_id", id).eq("video_id", video_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
