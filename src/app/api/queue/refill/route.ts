import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const context = req.nextUrl.searchParams.get("context") ?? "explore";
  const excludeParam = req.nextUrl.searchParams.get("exclude") ?? "";
  const exclude = new Set(excludeParam.split(",").filter(Boolean));
  const LIMIT = 20;

  const ids: string[] = [];

  // home: subscriptions first
  if (context === "home" && user) {
    const { data: subs } = await supabase
      .from("follows").select("followee").eq("follower", user.id).limit(50);
    if (subs?.length) {
      const subOwners = subs.map((s: { followee: string }) => s.followee);
      const { data: subVids } = await supabase
        .from("videos").select("id")
        .eq("status", "ready").eq("visibility", "public")
        .in("owner", subOwners)
        .order("created_at", { ascending: false }).limit(30);
      for (const v of subVids ?? []) {
        if (!exclude.has(v.id) && !ids.includes(v.id)) ids.push(v.id);
      }
    }
  }

  // profile: liked videos first
  if (context === "profile" && user) {
    const { data: likedRows } = await supabase
      .from("likes").select("video_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(40);
    for (const r of likedRows ?? []) {
      if (!exclude.has(r.video_id) && !ids.includes(r.video_id)) ids.push(r.video_id);
    }
  }

  // all contexts: fill remainder with shuffled trending
  if (ids.length < LIMIT) {
    const { data: trending } = await supabase
      .from("videos").select("id")
      .eq("status", "ready").eq("visibility", "public")
      .order("views", { ascending: false }).limit(80);
    const pool = (trending ?? [])
      .map((v: { id: string }) => v.id)
      .filter(id => !exclude.has(id) && !ids.includes(id))
      .sort(() => Math.random() - 0.5);
    ids.push(...pool);
  }

  return NextResponse.json({ ids: [...new Set(ids)].slice(0, LIMIT) });
}
