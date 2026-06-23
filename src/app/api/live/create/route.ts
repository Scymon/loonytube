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
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // 1. Create a new Live Input via Cloudflare Stream API
  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meta: { name: title.trim() },
        recording: {
          mode: "automatic", // Automatically creates a VOD recording after the stream ends
        },
      }),
    }
  );

  const cf = await cfRes.json();

  if (!cf.success) {
    console.error("Cloudflare live input creation failed:", cf.errors);
    return NextResponse.json(
      { error: "Failed to create live input on Cloudflare" },
      { status: 502 }
    );
  }

  const { uid, rtmps, webRTC } = cf.result as {
    uid: string;
    rtmps: { url: string; streamKey: string };
    webRTC?: { url: string };
  };

  // 2. Save the live stream record in Supabase
  const { error: dbError } = await supabase.from("live_streams").insert({
    id: uid,
    owner: user.id,
    title: title.trim(),
    description: description?.trim() || null,
    status: "created",
    rtmp_url: rtmps.url,
    whip_url: webRTC?.url ?? null,
  });

  if (dbError) {
    console.error("Failed to insert live_streams row:", dbError);
    return NextResponse.json(
      { error: "Database error while saving live stream" },
      { status: 500 }
    );
  }

  // 3. Return everything the frontend needs (including WHIP URL)
  return NextResponse.json({
    liveId: uid,
    rtmpUrl: rtmps.url,
    streamKey: rtmps.streamKey,
    whipUrl: webRTC?.url ?? null,
    title: title.trim(),
  });
}