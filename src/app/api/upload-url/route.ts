import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { title, description, size, category, visibility, madeForKids } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  if (!size || typeof size !== "number" || size <= 0) {
    return NextResponse.json({ error: "File size required" }, { status: 400 });
  }

  const vis = ["public", "unlisted", "private"].includes(visibility) ? visibility : "public";

  // Initiate a resumable TUS upload, server-side. `direct_user=true` makes Cloudflare
  // return an upload URL the browser can use WITHOUT our API token.
  const meta = `name ${Buffer.from(title, "utf8").toString("base64")}`;
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
    }
  );

  if (cfRes.status !== 201) {
    const text = await cfRes.text().catch(() => "");
    console.error("Cloudflare TUS create failed", cfRes.status, text);
    return NextResponse.json({ error: "Stream upload init failed" }, { status: 502 });
  }

  const uploadUrl = cfRes.headers.get("Location");
  const uid = cfRes.headers.get("stream-media-id");
  if (!uploadUrl || !uid) {
    console.error("Missing Location / stream-media-id", { uploadUrl, uid });
    return NextResponse.json({ error: "Stream did not return an upload URL" }, { status: 502 });
  }

  const baseRow = {
    id: uid,
    owner: user.id,
    title,
    description: description ?? null,
    status: "uploading",
  };

  // Try to store the new content metadata. If those columns don't exist yet
  // (posts.sql not applied), fall back to the base row so uploads still work.
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
    return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
  }

  return NextResponse.json({ uploadUrl, videoId: uid });
}
