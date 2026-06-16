"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX = 2000;

export default function PostComposer({ mode }: { mode: "post" | "thread" }) {
  const supabase = createClient();
  const router = useRouter();
  const [parts, setParts] = useState<string[]>([""]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setPart = (i: number, v: string) =>
    setParts((p) => p.map((x, idx) => (idx === i ? v.slice(0, MAX) : x)));

  async function submit() {
    const filled = parts.map((p) => p.trim()).filter(Boolean);
    if (filled.length === 0) return setErr("Write something first.");
    setBusy(true);
    setErr(null);

    // Chain parts as a thread via parent_id; a single post is just the first call.
    let parent: string | null = null;
    let firstId: string | null = null;
    for (const body of filled) {
      const { data, error } = await supabase.rpc("create_post", {
        p_body: body,
        p_video_id: null,
        p_parent_id: parent,
      });
      if (error) {
        setBusy(false);
        return setErr(error.message);
      }
      const id = data as string;
      firstId = firstId ?? id;
      parent = id;
    }
    router.push(`/post/${firstId}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {parts.map((p, i) => (
        <div key={i}>
          {mode === "thread" && <p className="lt-label">Part {i + 1}</p>}
          <textarea
            value={p}
            onChange={(e) => setPart(i, e.target.value)}
            placeholder={i === 0 ? "What's happening? Use #hashtags to reach more people." : "Continue the thread…"}
            className="lt-input min-h-[140px]"
          />
          <div className="mt-1 text-right text-xs text-mist">{p.length}/{MAX}</div>
        </div>
      ))}

      {mode === "thread" && parts.length < 6 && (
        <button type="button" onClick={() => setParts((p) => [...p, ""])} className="text-sm font-semibold text-teal hover:underline">
          ＋ Add another part
        </button>
      )}

      {err && <p className="text-sm text-loonred">{err}</p>}

      <div className="flex justify-end pt-2">
        <button onClick={submit} disabled={busy} className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? "Posting…" : mode === "thread" ? "Post Thread" : "Post"}
        </button>
      </div>
    </div>
  );
}
