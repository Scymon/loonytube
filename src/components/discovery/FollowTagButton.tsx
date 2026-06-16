"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FollowTagButton({
  tag, signedIn, initialFollowing,
}: { tag: string; signedIn: boolean; initialFollowing: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [on, setOn] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) { router.push("/login"); return; }
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    const me = data.user?.id;
    if (!me) { setBusy(false); router.push("/login"); return; }
    if (on) { setOn(false); await supabase.from("tag_follows").delete().eq("user_id", me).eq("tag", tag); }
    else { setOn(true); await supabase.from("tag_follows").insert({ user_id: me, tag }); }
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy}
      className={on
        ? "rounded-full border border-teal/60 bg-teal/10 px-5 py-2 text-sm font-bold text-teal"
        : "rounded-full bg-teal px-5 py-2 text-sm font-bold text-ink hover:brightness-110"}>
      {on ? `Following #${tag}` : `Follow #${tag}`}
    </button>
  );
}
