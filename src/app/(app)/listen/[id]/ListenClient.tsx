"use client";

import { useEffect } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { useAudio, type AudioTrackMeta } from "@/contexts/AudioContext";

type TrackRow = {
  id: string;
  title: string;
  description: string | null;
  chapters: string | null;
  cover_url: string | null;
  url: string;
  duration: number | null;
  views: number;
  created_at: string;
  profiles: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
  audio_categories: { name: string; slug: string } | null;
};

function fmt(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ListenClient({ track }: { track: TrackRow }) {
  const { play, track: current } = useAudio();

  const ownerName = track.profiles?.full_name ?? track.profiles?.username ?? null;

  const meta: AudioTrackMeta = {
    id:        track.id,
    title:     track.title,
    ownerName,
    coverUrl:  track.cover_url,
    duration:  track.duration,
    url:       track.url,
  };

  // Auto-play when navigating to the page (if not already playing this track)
  useEffect(() => {
    if (current?.id !== track.id) {
      play(meta);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-10">
      {/* Player */}
      <AudioPlayer description={track.chapters ?? track.description} />

      {/* Track info */}
      <div className="space-y-3 border-t border-edge pt-8">
        <div className="flex items-center gap-3 text-xs text-mist/50">
          {track.audio_categories && (
            <span className="rounded-full border border-edge px-2.5 py-1 font-medium text-mist/70">
              {track.audio_categories.name}
            </span>
          )}
          {track.duration && <span>{fmt(track.duration)}</span>}
          <span>{track.views.toLocaleString()} plays</span>
          <span>{new Date(track.created_at).toLocaleDateString()}</span>
        </div>

        {track.description && (
          <p className="whitespace-pre-wrap text-sm text-mist leading-relaxed">
            {track.description}
          </p>
        )}
      </div>
    </div>
  );
}
