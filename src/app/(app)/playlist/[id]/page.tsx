import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PlaylistClient from "./PlaylistClient";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("playlists").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ? `${data.title} · LoonyTube` : "Playlist · LoonyTube" };
}

export default async function PlaylistPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: playlist } = await supabase
    .from("playlists")
    .select("id, title, visibility, created_at, owner")
    .eq("id", id).maybeSingle();

  if (!playlist) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === playlist.owner;

  const { data: items } = await supabase
    .from("playlist_items")
    .select("id, video_id, position, added_at")
    .eq("playlist_id", id)
    .order("position", { ascending: true });

  const videoIds = (items ?? []).map((i: { video_id: string }) => i.video_id);
  const vidMap: Record<string, Record<string, unknown>> = {};

  if (videoIds.length) {
    const { data: vids } = await supabase
      .from("videos").select("id, title, thumbnail, duration, views, owner")
      .in("id", videoIds);

    for (const v of vids ?? []) vidMap[v.id] = { ...v };

    const ownerIds = [...new Set((vids ?? []).map((v: { owner: string }) => v.owner))];
    if (ownerIds.length) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, username, avatar_url")
        .in("id", ownerIds);
      const ownerMap = new Map(
        (profiles ?? []).map((p: { id: string; full_name: string | null; username: string | null; avatar_url: string | null }) =>
          [p.id, { channel: p.full_name || p.username || "someone", avatar: p.avatar_url ?? null, handle: p.username ?? "" }]
        )
      );
      for (const vid of Object.values(vidMap)) {
        Object.assign(vid, ownerMap.get(vid.owner as string) ?? {});
      }
    }
  }

  const enriched = (items ?? []).map((item: { id: string; video_id: string; position: number; added_at: string }) => ({
    ...item, ...(vidMap[item.video_id] ?? {}),
  }));

  return (
    <PlaylistClient
      playlist={{ id: playlist.id, title: playlist.title, visibility: playlist.visibility, created_at: playlist.created_at }}
      items={enriched}
      isOwner={isOwner}
    />
  );
}
