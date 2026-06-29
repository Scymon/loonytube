import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ACCT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: video } = await supabase
    .from("videos")
    .select("id, owner, status")
    .eq("id", id)
    .maybeSingle();

  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (video.owner !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (video.status !== "ready") return NextResponse.json({ error: "Video not ready" }, { status: 409 });

  const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/stream/${id}/downloads`;
  const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

  // Trigger download generation (idempotent — safe to call even if already exists)
  const postRes = await fetch(CF_BASE, { method: "POST", headers });
  if (!postRes.ok) {
    const body = await postRes.text().catch(() => "");
    return NextResponse.json({ error: "Cloudflare error", detail: body }, { status: 502 });
  }

  // Poll until the MP4 is ready (CF generates it async; typically <10 s for short videos)
  const TIMEOUT_MS = 60_000;
  const POLL_MS = 2_000;
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const pollRes = await fetch(CF_BASE, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!pollRes.ok) break;
    const json = await pollRes.json().catch(() => null);
    const dflt = json?.result?.default;
    if (dflt?.status === "ready" && dflt?.url) {
      return NextResponse.json({ url: dflt.url as string });
    }
    // Still processing — wait before next poll
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  return NextResponse.json(
    { error: "Download is being prepared — please try again in a moment." },
    { status: 202 }
  );
}
