import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cfSetRequireSignedURLs } from "@/lib/cloudflare";

// Changes a video's visibility AND keeps Cloudflare in sync: private videos get
// requireSignedURLs=true (signed playback), public/unlisted get it false.
// Cloudflare is updated FIRST so we never mark a row private while its media is
// still streamable, or vice-versa.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, visibility } = await req.json().catch(() => ({}));
  if (!id || !["public", "unlisted", "private"].includes(visibility)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { data: v } = await supabase
    .from("videos")
    .select("owner, visibility")
    .eq("id", id)
    .maybeSingle();
  if (!v || v.owner !== user.id) {
    return NextResponse.json({ error: "Not your video" }, { status: 403 });
  }

  const cf = await cfSetRequireSignedURLs(id, visibility === "private");
  if (!cf.ok) {
    return NextResponse.json(
      { error: `Cloudflare update failed: ${cf.error ?? "unknown error"}` },
      { status: 502 },
    );
  }

  // .select() so we can tell an RLS no-op (0 rows, no error) from a real write.
  const { data: updated, error } = await supabase
    .from("videos")
    .update({ visibility })
    .eq("id", id)
    .eq("owner", user.id)
    .select("id, visibility");

  if (error) {
    console.error("visibility DB update failed", id, error);
    return NextResponse.json({ error: `DB update failed: ${error.message}` }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    // Cloudflare is already switched, so roll it back rather than leaving the
    // media and the row disagreeing about how private this video is.
    await cfSetRequireSignedURLs(id, v.visibility === "private");
    console.error("visibility update affected 0 rows (RLS?)", id);
    return NextResponse.json(
      { error: "Visibility was not saved — the update was blocked by row-level security." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, visibility: updated[0].visibility });
}
