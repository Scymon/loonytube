"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReplyBox({ parentId, signedIn }: { parentId: string; signedIn: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!signedIn) { router.push("/login"); return; }
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { error } = await supabase.rpc("create_post", { p_body: text, p_video_id: null, p_parent_id: parentId });
    setBusy(false);
    if (!error) { setBody(""); router.refresh(); }
  }

  return (
    <div id="comment-box" className="mt-6 flex gap-2">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder={signedIn ? "Add a comment…" : "Sign in to comment"}
        className="lt-input flex-1"
      />
      <button onClick={send} disabled={busy} className="rounded-[10px] px-5 text-sm font-bold text-ink disabled:opacity-50"
        style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
        Comment
      </button>
    </div>
  );
}
