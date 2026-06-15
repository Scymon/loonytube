import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Cloudflare Stream calls this when encoding finishes.
// Configure it at: Cloudflare Dashboard > Stream > Settings > Webhooks
//   URL: https://<your-app>/api/stream-webhook
// For local testing, expose your dev server with `cloudflared tunnel` or ngrok.
//
// NOTE: For production, verify the `Webhook-Signature` header (HMAC) before trusting
// the payload. Left as a TODO to keep the MVP moving — see Cloudflare Stream docs.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const uid: string | undefined = body?.uid;
  if (!uid) {
    return NextResponse.json({ error: "No uid" }, { status: 400 });
  }

  const ready = body?.readyToStream === true;
  const state = body?.status?.state as string | undefined;

  const status =
    ready ? "ready" : state === "error" ? "failed" : "processing";

  const { error } = await supabaseAdmin
    .from("videos")
    .update({
      status,
      duration: typeof body?.duration === "number" ? body.duration : null,
      thumbnail: body?.thumbnail ?? null,
    })
    .eq("id", uid);

  if (error) {
    console.error("Webhook DB update failed", error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
