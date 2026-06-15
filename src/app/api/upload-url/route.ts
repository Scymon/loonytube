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

  const { title, description } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  // 1. Ask Cloudflare for a one-time direct-upload URL.
  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: 3600,
        requireSignedURLs: false,
        meta: { name: title },
      }),
    }
  );

  const cf = await cfRes.json();
  if (!cf.success) {
    console.error("Cloudflare direct_upload error", cf.errors);
    return NextResponse.json({ error: "Stream upload init failed" }, { status: 502 });
  }

  const { uploadURL, uid } = cf.result as { uploadURL: string; uid: string };

  // 2. Create the DB row immediately (status: uploading). id == Stream uid.
  const { error } = await supabase.from("videos").insert({
    id: uid,
    owner: user.id,
    title,
    description: description ?? null,
    status: "uploading",
  });

  if (error) {
    console.error("Insert video row failed", error);
    return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
  }

  // 3. Hand the client the upload URL + the video id (for redirect after upload).
  return NextResponse.json({ uploadURL, videoId: uid });
}
