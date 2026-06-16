"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FollowUserButton({
  targetId, signedIn, initialFollowing, variant = "link",
}: { targetId: string; signedIn: boolean; initialFollowing: boolean; variant?: "link" | "solid" }) {
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
    if (on) { setOn(false); await supabase.from("follows").delete().eq("follower", me).eq("followee", targetId); }
    else { setOn(true); await supabase.from("follows").insert({ follower: me, followee: targetId }); }
    setBusy(false);
  }

  if (variant === "solid") {
    return (
      <button onClick={toggle} disabled={busy}
        className={on
          ? "rounded-full bg-teal px-4 py-1.5 text-sm font-bold text-ink"
          : "rounded-full px-4 py-1.5 text-sm font-bold text-ink"}
        style={on ? undefined : { backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
        {on ? "Following" : "Follow"}
      </button>
    );
  }
  return (
    <button onClick={toggle} disabled={busy} className={`text-sm font-semibold ${on ? "text-mist" : "text-link"} hover:underline`}>
      {on ? "Following" : "Follow"}
    </button>
  );
}
