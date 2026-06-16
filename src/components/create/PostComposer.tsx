"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX = 2000;

// Writing a Post starts a Thread (a root node). Comments continue it later.
export default function PostComposer() {
  const supabase = createClient();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const text = body.trim();
    if (!text) return setErr("Write something first.");
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("create_post", { p_body: text, p_video_id: null, p_parent_id: null });
    if (error) { setBusy(false); return setErr(error.message); }
    router.push(`/post/${data as string}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX))}
        placeholder="What's happening? Use #hashtags to reach more people."
        className="lt-input min-h-[160px]"
      />
      <div className="text-right text-xs text-mist">{body.length}/{MAX}</div>

      {err && <p className="text-sm text-loonred">{err}</p>}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-mist">Starts a new thread — others continue it with comments.</p>
        <button onClick={submit} disabled={busy} className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
