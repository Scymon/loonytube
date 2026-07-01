import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Tell Vercel to allow up to 60 s. On hobby plans (hard-limited to 10 s) the
// POST fast-path (<8 s) covers most cases; clients then poll via GET which is
// always a single, sub-second CF fetch.
export const maxDuration = 60;

const ACCT  = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;

const cfBase = (id: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${ACCT}/stream/${id}/downloads`;
const cfHeaders = () => ({ Authorization: `Bearer ${TOKEN}` });

/** Verify the caller owns this video. Returns an error payload or the video row. */
async function verifyOwnership(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  const { data: video } = await supabase
    .from("videos")
    .select("id, owner, status")
    .eq("id", id)
    .maybeSingle();
  if (!video)                  return { error: "Not found",      status: 404 as const };
  if (video.owner !== user.id) return { error: "Forbidden",      status: 403 as const };
  if (video.status !== "ready") return { error: "Video not ready", status: 409 as const };
  return { video };
}

/** Single CF status check — no polling. Returns download URL or null. */
async function cfCheckReady(id: string): Promise<string | null> {
  const res = await fetch(cfBase(id), { headers: cfHeaders() });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const dflt = json?.result?.default;
  return dflt?.status === "ready" && dflt?.url ? (dflt.url as string) : null;
}

/**
 * POST — trigger CF MP4 generation, poll up to 8 s (safely within Vercel's
 * 10 s default limit), return { url } if ready or { status: "generating" } / 202
 * so the client can poll via GET.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const check = await verifyOwnership(id);
  if ("error" in check)
    return NextResponse.json({ error: check.error }, { status: check.status });

  // Trigger MP4 generation (idempotent — safe to call even if already running)
  const triggerRes = await fetch(cfBase(id), {
    method:  "POST",
    headers: { ...cfHeaders(), "Content-Type": "application/json" },
  });
  if (!triggerRes.ok) {
    const body = await triggerRes.text().catch(() => "");
    return NextResponse.json({ error: "Cloudflare error", detail: body }, { status: 502 });
  }

  // Fast-path poll: most short videos are ready within a few seconds
  const TIMEOUT_MS = 8_000;
  const POLL_MS    = 2_000;
  const deadline   = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const url = await cfCheckReady(id);
    if (url) return NextResponse.json({ url });
    await new Promise(r => setTimeout(r, POLL_MS));
  }

  // Not ready yet — tell the client to poll via GET
  return NextResponse.json(
    { status: "generating", message: "Download is being prepared." },
    { status: 202 },
  );
}

/**
 * GET — lightweight single-fetch status check for client polling.
 * Returns { url } when ready, or { status: "generating" } (200) when still processing.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const check = await verifyOwnership(id);
  if ("error" in check)
    return NextResponse.json({ error: check.error }, { status: check.status });

  const url = await cfCheckReady(id);
  if (url) return NextResponse.json({ url });
  return NextResponse.json({ status: "generating" });
}
