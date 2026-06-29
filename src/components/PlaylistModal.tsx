"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

type Playlist = {
  id: string;
  title: string;
  count: number;
  thumbnail: string | null;
};

export default function PlaylistModal({
  videoId,
  videoTitle,
  onClose,
}: {
  videoId: string;
  videoTitle: string;
  onClose: () => void;
}) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newTitle, setNewTitle]   = useState("");
  const [creating, setCreating]   = useState(false);
  const [saving, setSaving]       = useState<string | null>(null);
  const [done, setDone]           = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/playlists")
      .then(r => r.json())
      .then(d => { setPlaylists(d.playlists ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function addToPlaylist(pid: string) {
    setSaving(pid);
    const res = await fetch(`/api/playlists/${pid}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_id: videoId }),
    });
    if (res.ok || res.status === 409) setDone(prev => new Set([...prev, pid]));
    setSaving(null);
  }

  async function createPlaylist() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const { playlist } = await res.json();
      setPlaylists(prev => [playlist, ...prev]);
      setNewTitle("");
      await addToPlaylist(playlist.id);
    }
    setCreating(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-edge bg-panel p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-bold text-foam">Save to playlist</h2>
            <p className="mt-0.5 line-clamp-1 text-sm text-mist">{videoTitle}</p>
          </div>
          <button onClick={onClose} className="ml-3 shrink-0 text-mist hover:text-foam">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <p className="py-4 text-center text-sm text-mist">Loading…</p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-1">
            {playlists.length === 0 && (
              <p className="py-2 text-sm text-mist">No playlists yet. Create one below.</p>
            )}
            {playlists.map(pl => {
              const added = done.has(pl.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => !added && addToPlaylist(pl.id)}
                  disabled={saving === pl.id || added}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                    added ? "bg-teal/10 text-teal" : "hover:bg-edge text-foam"
                  }`}
                >
                  <div className="h-9 w-16 shrink-0 overflow-hidden rounded-lg border border-edge bg-black">
                    {pl.thumbnail && (
                      <img src={pl.thumbnail} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pl.title}</p>
                    <p className="text-xs text-mist">{pl.count} video{pl.count !== 1 ? "s" : ""}</p>
                  </div>
                  {added && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  )}
                  {saving === pl.id && <span className="text-xs text-mist">…</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex gap-2 border-t border-edge pt-4">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createPlaylist()}
            placeholder="New playlist name…"
            className="min-w-0 flex-1 rounded-lg border border-edge bg-base px-3 py-1.5 text-sm text-foam placeholder-mist/60 focus:border-teal focus:outline-none"
          />
          <button
            onClick={createPlaylist}
            disabled={creating || !newTitle.trim()}
            className="shrink-0 rounded-lg bg-teal px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-40"
          >
            {creating ? "…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
