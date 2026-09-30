import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Records one view for a video. Called by the player once real playback passes
// the watch threshold -- never on page load, so link-preview crawlers and page
// refreshes never inflate the count.
//
// Dedupe, owner-exclusion and the visibility check all happen here; the DB
// enforces one-view-per-viewer-per-day as a primary key, so a client that spams
// this endpoint still only ever counts once.

// Anonymous viewers are identified by a salted hash of IP + user-agent. The UTC
// date is mixed in so the same person is not correlatable across days, and no
// raw IP is ever written. Falls back to the service-role key as salt if no
// dedicated secret is configured.
const SALT = process.env.VIEW_HASH_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function anonKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return "a:" + createHash("sha256").update(`${SALT}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Read through the service-role client so the check does not depend on the
  // caller's RLS view of the row.
  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("id, owner, status, visibility")
    .eq("id", id)
    .maybeSingle();

  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only real, shareable videos accrue views.
  if (video.status !== "ready") return NextResponse.json({ counted: false });
  if (video.visibility !== "public" && video.visibility !== "unlisted") {
    return NextResponse.json({ counted: false });
  }

  // A creator watching their own video does not inflate their own numbers.
  if (user && user.id === video.owner) return NextResponse.json({ counted: false });

  const viewerKey = user ? `u:${user.id}` : anonKey(req);

  const { data: counted, error } = await supabaseAdmin.rpc("record_video_view", {
    p_video_id: id,
    p_viewer_key: viewerKey,
    p_user_id: user?.id ?? null,
  });

  if (error) {
    console.error("record_video_view failed", id, error);
    return NextResponse.json({ error: "Could not record view" }, { status: 500 });
  }

  return NextResponse.json({ counted: !!counted });
}
