import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Cloudflare Stream calls this when encoding finishes. It signs every request:
//   Webhook-Signature: time=<unix>,sig1=<hmac-sha256-hex>
// where the signed string is `<time>.<raw body>`, keyed with your webhook secret.
// Set CLOUDFLARE_WEBHOOK_SECRET in .env.local (the `secret` returned when you
// registered the webhook).
export async function POST(req: Request) {
  // 1. Read the RAW body — HMAC must run over the exact bytes Cloudflare signed,
  //    so we cannot use req.json() first (re-serializing changes the bytes).
  const raw = await req.text();

  const secret = process.env.CLOUDFLARE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLOUDFLARE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const sigHeader = req.headers.get("webhook-signature");
  if (!sigHeader) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  // Parse "time=...,sig1=..."
  const parts: Record<string, string> = {};
  for (const p of sigHeader.split(",")) {
    const i = p.indexOf("=");
    if (i !== -1) parts[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  }
  const time = parts["time"];
  const sig1 = parts["sig1"];
  if (!time || !sig1) {
    return NextResponse.json({ error: "Malformed signature" }, { status: 401 });
  }

  // Replay protection: reject stale signatures (10-min tolerance for clock skew).
  const ageSec = Math.floor(Date.now() / 1000) - parseInt(time, 10);
  if (!Number.isFinite(ageSec) || ageSec < -60 || ageSec > 600) {
    return NextResponse.json({ error: "Signature expired" }, { status: 401 });
  }

  // Recompute HMAC over `${time}.${rawBody}` and compare in constant time.
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${time}.${raw}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig1, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Signature is valid — parse and process.
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const uid: string | undefined = body?.uid;
  if (!uid) {
    return NextResponse.json({ error: "No uid" }, { status: 400 });
  }

  const ready = body?.readyToStream === true;
  const state = body?.status?.state as string | undefined;
  const status = ready ? "ready" : state === "error" ? "failed" : "processing";

  // Always advance status + duration.
  const { error } = await supabaseAdmin
    .from("videos")
    .update({
      status,
      duration: typeof body?.duration === "number" ? body.duration : null,
    })
    .eq("id", uid);

  // Fill the Cloudflare-generated thumbnail ONLY if one isn't set yet, so a
  // creator's custom uploaded thumbnail is never overwritten.
  if (body?.thumbnail) {
    await supabaseAdmin
      .from("videos")
      .update({ thumbnail: body.thumbnail })
      .eq("id", uid)
      .is("thumbnail", null);
  }

  if (error) {
    console.error("Webhook DB update failed", error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
