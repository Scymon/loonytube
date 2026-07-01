import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListenClient from "./ListenClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("audio_tracks").select("title").eq("id", id).single();
  return { title: data ? `${data.title} · LoonyTube` : "Listen · LoonyTube" };
}

export default async function ListenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: track } = await supabase
    .from("audio_tracks")
    .select(`
      id, title, description, chapters, cover_url, url, duration, views, created_at, visibility, status,
      owner,
      profiles!audio_tracks_owner_fkey ( username, full_name, avatar_url ),
      audio_categories ( name, slug )
    `)
    .eq("id", id)
    .single();

  if (!track || track.status === "failed") notFound();

  // Increment views (best-effort)
  await supabase.rpc("increment_audio_views", { track_id: id }).maybeSingle();

  return <ListenClient track={track as unknown as Parameters<typeof ListenClient>[0]['track']} />;
}
