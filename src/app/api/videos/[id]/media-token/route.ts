import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cfStreamToken } from "@/lib/cloudflare";

// Mints a short-lived Cloudflare token so the OWNER can load frames from their
// own private video (Studio thumbnail picker / scrubber). Private media is
// behind requireSignedURLs, so the unsigned videodelivery.net URL is a 401.
//
// Owner-only on purpose: this token grants playback, so it must never be handed
// to a viewer who is not the owner of a private video.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: video } = await supabase
    .from("videos")
    .select("id, owner, visibility")
    .eq("id", id)
    .maybeSingle();

  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (video.owner !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Public and unlisted media is unsigned -- the plain uid already works.
  if (video.visibility !== "private") return NextResponse.json({ token: null });

  const token = await cfStreamToken(id);
  if (!token) {
    return NextResponse.json({ error: "Could not mint playback token" }, { status: 502 });
  }

  return NextResponse.json({ token });
}
