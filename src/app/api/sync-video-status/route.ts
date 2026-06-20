import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let videoId: string | undefined;
  try {
    ({ videoId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!videoId || typeof videoId !== "string") {
    return NextResponse.json({ error: "videoId required" }, { status: 400 });
  }

  // Verify ownership before touching Cloudflare
  const { data: row } = await supabaseAdmin
    .from("videos")
    .select("id, owner, status")
    .eq("id", videoId)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  if (row.owner !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (row.status === "ready") return NextResponse.json({ status: "ready" });

  // Fetch live status from Cloudflare Stream
  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,
      },
    },
  );

  if (!cfRes.ok) {
    const text = await cfRes.text().catch(() => "");
    console.error("Cloudflare status fetch failed", cfRes.status, text);
    return NextResponse.json({ error: "Cloudflare fetch failed" }, { status: 502 });
  }

  const { result } = await cfRes.json() as { result: {
    uid: string;
    readyToStream: boolean;
    status?: { state?: string };
    duration?: number;
    thumbnail?: string;
  }};

  const ready = result.readyToStream === true;
  const state = result.status?.state;
  const status = ready ? "ready" : state === "error" ? "failed" : "processing";

  const updates: Record<string, unknown> = { status };
  if (typeof result.duration === "number") updates.duration = result.duration;

  await supabaseAdmin.from("videos").update(updates).eq("id", videoId);

  // Fill thumbnail only if not already set
  if (result.thumbnail) {
    await supabaseAdmin
      .from("videos")
      .update({ thumbnail: result.thumbnail })
      .eq("id", videoId)
      .is("thumbnail", null);
  }

  return NextResponse.json({ status, duration: result.duration ?? null });
}
