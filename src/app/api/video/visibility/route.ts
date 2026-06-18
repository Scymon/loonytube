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

  const { data: v } = await supabase.from("videos").select("owner").eq("id", id).maybeSingle();
  if (!v || v.owner !== user.id) {
    return NextResponse.json({ error: "Not your video" }, { status: 403 });
  }

  const ok = await cfSetRequireSignedURLs(id, visibility === "private");
  if (!ok) return NextResponse.json({ error: "Cloudflare update failed" }, { status: 502 });

  const { error } = await supabase.from("videos").update({ visibility }).eq("id", id);
  if (error) return NextResponse.json({ error: "DB update failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
