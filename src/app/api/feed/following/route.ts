import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: followRows } = await supabase
    .from("follows")
    .select("followee")
    .eq("follower", user.id);

  const followeeIds = (followRows ?? []).map((f: { followee: string }) => f.followee);
  if (!followeeIds.length) return NextResponse.json({ videos: [] });

  const { data: vids } = await supabase
    .from("videos")
    .select("id, title, thumbnail, duration, views, created_at, owner")
    .eq("status", "ready")
    .eq("visibility", "public")
    .in("owner", followeeIds)
    .order("created_at", { ascending: false })
    .limit(20);

  const ownerIds = [...new Set((vids ?? []).map((v: { owner: string }) => v.owner))];
  const whoMap = new Map<string, { name: string; avatar: string | null }>();
  if (ownerIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ownerIds);
    for (const p of profs ?? [])
      whoMap.set(p.id, { name: p.full_name || p.username || "someone", avatar: p.avatar_url ?? null });
  }

  const videos = (vids ?? []).map((v: { id: string; title: string; thumbnail: string | null; duration: number | null; views: number; created_at: string; owner: string }) => ({
    ...v,
    channel: whoMap.get(v.owner)?.name ?? "someone",
    avatar: whoMap.get(v.owner)?.avatar ?? null,
  }));

  return NextResponse.json({ videos });
}
