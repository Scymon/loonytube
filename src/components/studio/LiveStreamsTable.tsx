"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type LiveStream = {
  id: string;
  title: string;
  status: "created" | "live" | "ended";
  started_at: string | null;
  viewer_count: number;
  created_at: string;
};

export default function LiveStreamsTable() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchStreams() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("live_streams")
      .select("id, title, status, started_at, viewer_count, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) setStreams(data as LiveStream[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchStreams();
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete live stream "${title}"? This cannot be undone.`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("live_streams").delete().eq("id", id);

    if (error) {
      alert("Failed to delete live stream");
      console.error(error);
    } else {
      setStreams((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function handleEdit(stream: LiveStream) {
    const newTitle = prompt("Edit stream title:", stream.title);
    if (!newTitle || newTitle === stream.title) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("live_streams")
      .update({ title: newTitle.trim() })
      .eq("id", stream.id);

    if (error) {
      alert("Failed to update title");
    } else {
      setStreams((prev) =>
        prev.map((s) => (s.id === stream.id ? { ...s, title: newTitle.trim() } : s))
      );
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-mist">Loading live streams...</div>;
  }

  if (streams.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-panel p-8 text-center">
        <p className="text-mist">No live streams yet.</p>
        <Link href="/studio/live" className="mt-3 inline-block text-sm text-loon hover:underline">
          Start your first live stream →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-edge bg-panel">
      <table className="w-full text-sm">
        <thead className="border-b border-edge text-left text-mist">
          <tr>
            <th className="w-16 px-4 py-3"></th>
            <th className="px-2 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Started</th>
            <th className="px-4 py-3 font-medium text-right">Viewers</th>
            <th className="w-40 px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge text-foam">
          {streams.map((stream) => (
            <tr key={stream.id} className="hover:bg-edge/30">
              {/* Thumbnail */}
              <td className="px-4 py-3">
                <Link href={`/watch/${stream.id}`}>
                  <div className="h-10 w-16 rounded bg-[#11151c] flex items-center justify-center border border-edge">
                    {stream.status === "live" ? (
                      <span className="text-[10px] font-bold text-red-400 tracking-widest">LIVE</span>
                    ) : (
                      <span className="text-[10px] text-mist">REC</span>
                    )}
                  </div>
                </Link>
              </td>

              {/* Title (clickable) */}
              <td className="px-2 py-3 font-medium">
                <Link href={`/watch/${stream.id}`} className="hover:text-loon hover:underline">
                  {stream.title}
                </Link>
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
                  stream.status === "live" ? "bg-red-500/20 text-red-400" :
                  stream.status === "ended" ? "bg-gray-500/20 text-gray-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {stream.status.toUpperCase()}
                </span>
              </td>

              <td className="px-4 py-3 text-mist text-xs">
                {stream.started_at 
                  ? new Date(stream.started_at).toLocaleDateString([], { month: "short", day: "numeric" }) 
                  : "—"}
              </td>

              <td className="px-4 py-3 text-right text-mist font-mono text-xs">{stream.viewer_count}</td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  {stream.status === "live" && (
                    <Link 
                      href={`/watch/${stream.id}`} 
                      className="rounded border border-edge px-3 py-1 text-xs hover:border-loon hover:text-loon"
                    >
                      Watch
                    </Link>
                  )}

                  <button
                    onClick={() => handleEdit(stream)}
                    className="rounded border border-edge px-3 py-1 text-xs hover:border-loon hover:text-loon"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(stream.id, stream.title)}
                    className="rounded border border-red-500/40 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                  >
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