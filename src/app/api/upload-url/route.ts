import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UPLOAD_LIMITS } from "@/lib/upload-limits";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Not signed in", 401);

  // ── Uploads kill switch ────────────────────────────────────────────────────
  const { data: settings } = await supabase
    .from("app_settings")
    .select("uploads_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (settings && settings.uploads_enabled === false) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return err("Uploads are temporarily disabled.", 403);
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  const { title, description, size, type, category, visibility, madeForKids, thumbnail } = body;

  // ── Title ──────────────────────────────────────────────────────────────────
  if (!title || typeof title !== "string" || !title.trim()) {
    return err("Title is required", 400);
  }
  if (title.length > UPLOAD_LIMITS.TITLE_MAX) {
    return err(`Title must be ${UPLOAD_LIMITS.TITLE_MAX} characters or fewer`, 400);
  }

  // ── Description ────────────────────────────────────────────────────────────
  if (description != null) {
    if (typeof description !== "string") return err("Description must be a string", 400);
    if (description.length > UPLOAD_LIMITS.DESCRIPTION_MAX) {
      return err(`Description must be ${UPLOAD_LIMITS.DESCRIPTION_MAX.toLocaleString()} characters or fewer`, 400);
    }
  }

  // ── File size ──────────────────────────────────────────────────────────────
  if (size == null || typeof size !== "number" || size <= 0) {
    return err("File size required", 400);
  }
  if (size > UPLOAD_LIMITS.VIDEO_MAX_BYTES) {
    const gb = (UPLOAD_LIMITS.VIDEO_MAX_BYTES / 1024 ** 3).toFixed(0);
    return err(`File exceeds the ${gb} GB limit`, 400);
  }

  // ── Media type ─────────────────────────────────────────────────────────────
  if (type != null) {
    if (
      typeof type !== "string" ||
      !(UPLOAD_LIMITS.ALLOWED_VIDEO_TYPES as readonly string[]).includes(type)
    ) {
      return err(
        `Unsupported video format. Accepted: MP4, MOV, AVI, MKV, WebM and common variants.`,
        415,
      );
    }
  }

  // ── Thumbnail URL ──────────────────────────────────────────────────────────
  // Must originate from our own Supabase Storage bucket to prevent open-redirect
  // / stored-XSS via arbitrary thumbnail URLs.
  const thumbStr = typeof thumbnail === "string" && thumbnail ? thumbnail : null;
  if (thumbStr) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const expectedPrefix = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/media/`
      : null;
    if (expectedPrefix && !thumbStr.startsWith(expectedPrefix)) {
      return err("Thumbnail must be uploaded to our media storage", 400);
    }
  }

  // ── Per-user rate limit & daily quota ─────────────────────────────────────
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const startOfDayUtc = new Date(now);
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
    supabase
      .from("videos")
      .select("*", { count: "exact", head: true })
      .eq("owner", user.id)
      .gte("created_at", oneHourAgo),
    supabase
      .from("videos")
      .select("*", { count: "exact", head: true })
      .eq("owner", user.id)
      .gte("created_at", startOfDayUtc.toISOString()),
  ]);

  if ((hourCount ?? 0) >= UPLOAD_LIMITS.RATE_LIMIT_PER_HOUR) {
    return err(
      `Upload limit reached: ${UPLOAD_LIMITS.RATE_LIMIT_PER_HOUR} uploads per hour. Try again shortly.`,
      429,
    );
  }
  if ((dayCount ?? 0) >= UPLOAD_LIMITS.DAILY_QUOTA) {
    return err(
      `Daily upload limit reached (${UPLOAD_LIMITS.DAILY_QUOTA} per day). Resets at midnight UTC.`,
      429,
    );
  }

  // ── Initiate Cloudflare TUS upload ─────────────────────────────────────────
  const vis = ["public", "unlisted", "private"].includes(visibility as string)
    ? (visibility as string)
    : "public";

  let meta = `name ${Buffer.from(title.trim(), "utf8").toString("base64")}`;
  if (vis === "private") meta += `,requiresignedurls`;

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(size),
        "Upload-Metadata": meta,
      },
    },
  );

  if (cfRes.status !== 201) {
    const text = await cfRes.text().catch(() => "");
    console.error("Cloudflare TUS create failed", cfRes.status, text);
    return err("Stream upload init failed", 502);
  }

  const uploadUrl = cfRes.headers.get("Location");
  const uid = cfRes.headers.get("stream-media-id");
  if (!uploadUrl || !uid) {
    console.error("Missing Location / stream-media-id", { uploadUrl, uid });
    return err("Stream did not return an upload URL", 502);
  }

  // ── Persist video metadata ─────────────────────────────────────────────────
  const baseRow = {
    id: uid,
    owner: user.id,
    title: title.trim(),
    description: typeof description === "string" && description ? description : null,
    status: "uploading",
    thumbnail: thumbStr,
  };

  let { error } = await supabase.from("videos").insert({
    ...baseRow,
    category: category ?? null,
    visibility: vis,
    made_for_kids: !!madeForKids,
  });
  if (error) {
    ({ error } = await supabase.from("videos").insert(baseRow));
  }
  if (error) {
    console.error("Insert video row failed", error);
    return err("DB insert failed", 500);
  }

  return NextResponse.json({ uploadUrl, videoId: uid });
}
