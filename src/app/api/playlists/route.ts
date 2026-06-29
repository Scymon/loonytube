import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET: list user's playlists with video count + first thumbnail
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: playlists, error } = await supabase
    .from("playlists")
    .select("id, title, visibility, created_at")
    .eq("owner", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all((playlists ?? []).map(async (p) => {
    const { count } = await supabase
      .from("playlist_items")
      .select("*", { count: "exact", head: true })
      .eq("playlist_id", p.id);

    const { data: firstItem } = await supabase
      .from("playlist_items").select("video_id")
      .eq("playlist_id", p.id)
      .order("position", { ascending: true }).limit(1);

    let thumbnail: string | null = null;
    if (firstItem?.[0]?.video_id) {
      const { data: vid } = await supabase
        .from("videos").select("thumbnail")
        .eq("id", firstItem[0].video_id).maybeSingle();
      thumbnail = vid?.thumbnail ?? null;
    }

    return { ...p, count: count ?? 0, thumbnail };
  }));

  return NextResponse.json({ playlists: enriched });
}

// POST: create new playlist
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, visibility = "private" } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const { data, error } = await supabase
    .from("playlists")
    .insert({ owner: user.id, title: title.trim(), visibility })
    .select("id, title, visibility, created_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: { ...data, count: 0, thumbnail: null } }, { status: 201 });
}
