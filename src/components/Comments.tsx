"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ago } from "@/lib/format";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  owner: string;
  username: string | null;
  pending?: boolean;
};

export default function Comments({ videoId }: { videoId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [items, setItems] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data: comments, error: loadErr } = await supabase
      .from("comments")
      .select("id, body, created_at, owner")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });
    if (loadErr) {
      setError("Couldn't load comments.");
      setLoading(false);
      return;
    }
    const rows = comments ?? [];
    // Usernames fetched separately — never embed profiles() (see CODING-GUIDE mistake #1)
    const owners = Array.from(new Set(rows.map((c) => c.owner)));
    const names: Record<string, string | null> = {};
    if (owners.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", owners);
      for (const p of profiles ?? []) names[p.id] = p.username;
    }
    setItems(rows.map((c) => ({ ...c, username: names[c.owner] ?? null })));
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUid(id);
      if (id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", id)
          .maybeSingle();
        setMyUsername(p?.username ?? null);
      }
    });
    setLoading(true);
    setError(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function post() {
    if (!uid) {
      router.push("/login");
      return;
    }
    const text = body.trim();
    if (!text) return;
    setError(null);
    setBody("");

    // Optimistic: show immediately, reconcile with the server row after insert
    const tempId = `temp-${Date.now()}`;
    const optimistic: CommentRow = {
      id: tempId,
      body: text,
      created_at: new Date().toISOString(),
      owner: uid,
      username: myUsername,
      pending: true,
    };
    setItems((prev) => [optimistic, ...prev]);

    const { data, error: insErr } = await supabase
      .from("comments")
      .insert({ video_id: videoId, owner: uid, body: text })
      .select("id, created_at")
      .single();

    if (insErr || !data) {
      setItems((prev) => prev.filter((c) => c.id !== tempId));
      setBody(text); // restore the draft so nothing is lost
      setError("Couldn't post your comment. Try again.");
      return;
    }
    setItems((prev) =>
      prev.map((c) =>
        c.id === tempId
          ? { ...optimistic, id: data.id, created_at: data.created_at, pending: false }
          : c
      )
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-foam">
        {loading ? "Comments" : `${items.length} comment${items.length === 1 ? "" : "s"}`}
      </h2>
      <div className="mb-2 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && post()}
          placeholder={uid ? "Add a comment…" : "Sign in to comment"}
          className="flex-1 rounded border border-edge bg-panel px-3 py-2 text-sm outline-none focus:border-loon"
        />
        <button
          onClick={post}
          className="rounded bg-loon px-4 py-2 text-sm font-semibold text-ink hover:opacity-90"
        >
          Post
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-loonred">{error}</p>}

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading comments">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-b border-edge pb-3">
              <div className="h-3 w-24 animate-pulse rounded bg-edge/50" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-edge/40" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-4 text-sm text-mist">No comments yet — be the first.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => (
            <li key={c.id} className={`border-b border-edge pb-3 ${c.pending ? "opacity-60" : ""}`}>
              <p className="text-xs text-loon">
                {c.username ?? "someone"}
                <span className="ml-2 text-mist/60">{c.pending ? "posting…" : ago(c.created_at)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foam">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
