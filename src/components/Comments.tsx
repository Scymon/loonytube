"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  owner: string;
  profiles: { username: string | null } | null;
};

export default function Comments({ videoId }: { videoId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState("");

  async function load() {
    const { data } = await supabase
      .from("comments")
      .select("id, body, created_at, owner, profiles(username)")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as Comment[]);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
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
    setBody("");
    await supabase.from("comments").insert({ video_id: videoId, owner: uid, body: text });
    load();
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-gray-300">{items.length} comments</h2>
      <div className="mb-6 flex gap-2">
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
      <ul className="space-y-4">
        {items.map((c) => (
          <li key={c.id} className="border-b border-edge pb-3">
            <p className="text-xs text-loon">{c.profiles?.username ?? "someone"}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">{c.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
