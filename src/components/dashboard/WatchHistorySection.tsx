"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type HistoryRow = {
  video_id: string;
  watched_at: string;
  progress_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  title: string;
  thumbnail: string | null;
  channel: string;
};

function fmtDur(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function agoLabel(iso: string) {
  const secs = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 3600)  return `${Math.floor(secs / 60) || 1}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function WatchHistorySection() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: hist } = await supabase
        .from("watch_history")
        .select("video_id, watched_at, progress_seconds, completed")
        .eq("user_id", user.id)
        .order("watched_at", { ascending: false })
        .limit(12);
      if (!hist?.length) return;

      const ids = hist.map((h: { video_id: string }) => h.video_id);
      const { data: vids } = await supabase
        .from("videos").select("id, title, thumbnail, owner").in("id", ids);
      const { data: prog } = await supabase
        .from("video_progress").select("video_id, duration_seconds")
        .eq("user_id", user.id).in("video_id", ids);

      const owners = [...new Set((vids ?? []).map((v: { owner: string }) => v.owner))];
      const { data: profs } = await supabase
        .from("profiles").select("id, username, full_name").in("id", owners);

      const vidMap  = new Map((vids ?? []).map((v: { id: string; title: string; thumbnail: string | null; owner: string }) => [v.id, v]));
      const profMap = new Map((profs ?? []).map((p: { id: string; username: string | null; full_name: string | null }) => [p.id, p]));
      const durMap  = new Map((prog ?? []).map((p: { video_id: string; duration_seconds: number | null }) => [p.video_id, p.duration_seconds]));

      setRows(hist.map((h: { video_id: string; watched_at: string; progress_seconds: number; completed: boolean }) => {
        const v = vidMap.get(h.video_id);
        const p = v ? profMap.get(v.owner) : null;
        return {
          video_id: h.video_id, watched_at: h.watched_at,
          progress_seconds: h.progress_seconds, completed: h.completed,
          duration_seconds: durMap.get(h.video_id) ?? null,
          title: v?.title ?? "Unknown",
          thumbnail: v?.thumbnail ?? null,
          channel: p?.full_name || p?.username || "Unknown",
        };
      }));
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rows.length) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-foam">Continue Watching</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {rows.map(r => {
          const pct = r.duration_seconds && r.duration_seconds > 0
            ? Math.min(100, (r.progress_seconds / r.duration_seconds) * 100) : 0;
          return (
            <Link key={r.video_id} href={`/watch/${r.video_id}`} className="group flex flex-col gap-1.5">
              <div className="relative overflow-hidden rounded-xl bg-surface aspect-video">
                {r.thumbnail
                  ? <img src={r.thumbnail} alt={r.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  : <div className="h-full w-full bg-edge/40" />}
                {r.completed && (
                  <span className="absolute top-1.5 right-1.5 rounded bg-teal/90 px-1.5 py-0.5 text-[9px] font-bold text-ink">✓</span>
                )}
                {/* Progress bar */}
                {pct > 0 && !r.completed && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                    <div className="h-full bg-teal rounded-r" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {r.progress_seconds > 0 && !r.completed && (
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1 text-[9px] text-white">
                    {fmtDur(r.progress_seconds)}
                  </span>
                )}
              </div>
              <p className="truncate text-xs font-semibold text-foam group-hover:text-teal">{r.title}</p>
              <p className="truncate text-[10px] text-mist">{r.channel} · {agoLabel(r.watched_at)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
