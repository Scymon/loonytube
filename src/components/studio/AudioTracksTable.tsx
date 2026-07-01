"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ago } from "@/lib/format";

type Track = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  visibility: string;
  views: number;
  created_at: string;
  cover_url: string | null;
  category: { name: string } | null;
};

function VisBadge({ v }: { v: string }) {
  const dot = v === "public" ? "bg-teal" : v === "unlisted" ? "bg-sky" : "bg-mist";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm capitalize text-foam">
      <span className={`h-2 w-2 rounded-full ${dot}`} />{v}
    </span>
  );
}

function StatusBadge({ s }: { s: string }) {
  const cls = s === "ready" ? "text-teal" : s === "failed" ? "text-red-400" : "text-mist";
  return <span className={`text-xs font-medium capitalize ${cls}`}>{s}</span>;
}

export default function AudioTracksTable() {
  const supabase = createClient();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("audio_tracks")
        .select("id, title, description, status, visibility, views, created_at, cover_url, category:audio_categories(name)")
        .eq("owner", user.id)
        .order("created_at", { ascending: false });
      setTracks((data ?? []) as unknown as Track[]);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteTrack(id: string) {
    if (!confirm("Delete this audio track? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("audio_tracks").delete().eq("id", id);
    setTracks(t => t.filter(x => x.id !== id));
    setDeleting(null);
  }

  if (loading) return <p className="py-10 text-center text-sm text-mist">Loading…</p>;
  if (!tracks.length) return (
    <p className="py-10 text-center text-sm text-mist">No audio tracks yet. Upload your first track above.</p>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-edge">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-edge text-left text-xs font-semibold uppercase tracking-wider text-mist/60">
            <th className="px-4 py-3">Track</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Visibility</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Views</th>
            <th className="px-4 py-3 text-right">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {tracks.map(t => (
            <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {t.cover_url ? (
                    <img src={t.cover_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover bg-surface" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-surface grid place-items-center text-mist/40">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foam max-w-[220px]">{t.title}</p>
                    {t.description && <p className="truncate text-xs text-mist max-w-[220px]">{t.description}</p>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><StatusBadge s={t.status} /></td>
              <td className="px-4 py-3"><VisBadge v={t.visibility} /></td>
              <td className="px-4 py-3 text-mist text-xs">{t.category?.name ?? "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums text-foam">{t.views.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-mist whitespace-nowrap">{ago(t.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`/listen/${t.id}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-mist hover:text-foam transition-colors">View</a>
                  <button onClick={() => deleteTrack(t.id)} disabled={deleting === t.id}
                    className="text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
