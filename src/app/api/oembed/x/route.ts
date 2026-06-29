import { NextResponse } from "next/server";

// Proxy for Twitter/X oEmbed so the client never makes a cross-origin request.
// Brave Shields and other mobile ad-blockers block direct fetches to
// publish.twitter.com; routing through our own origin sidesteps that.

const ALLOWED_HOSTS = ["twitter.com", "x.com", "www.twitter.com", "www.x.com"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url param required" }, { status: 400 });
  }

  // Validate that the URL is actually a Twitter/X URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: "only twitter/x urls allowed" }, { status: 400 });
  }

  const oembedUrl =
    `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&dnt=true&theme=dark&omit_script=false`;

  try {
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "LoonyTube/1.0 (+https://loonytube.tv)" },
      next: { revalidate: 3600 }, // cache for 1 hour on the edge
    });

    if (!res.ok) {
      return NextResponse.json({ error: "oembed fetch failed" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (e) {
    console.error("oembed proxy error", e);
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
