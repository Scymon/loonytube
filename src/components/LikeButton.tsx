"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LikeButton({ videoId }: { videoId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUid(user?.id ?? null);

      const { count: c } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("video_id", videoId);
      setCount(c ?? 0);

      if (user) {
        const { data } = await supabase
          .from("likes")
          .select("video_id")
          .eq("video_id", videoId)
          .eq("user_id", user.id)
          .maybeSingle();
        setLiked(!!data);
      }
    })();
  }, [supabase, videoId]);

  async function toggle() {
    if (!uid) {
      router.push("/login");
      return;
    }
    if (liked) {
      setLiked(false);
      setCount((c) => c - 1);
      await supabase.from("likes").delete().eq("video_id", videoId).eq("user_id", uid);
    } else {
      setLiked(true);
      setCount((c) => c + 1);
      await supabase.from("likes").insert({ video_id: videoId, user_id: uid });
    }
  }

  return (
    <button
      onClick={toggle}
      className={`shrink-0 rounded border px-4 py-2 text-sm font-semibold transition ${
        liked ? "border-loonred text-loonred" : "border-edge text-gray-300 hover:border-loon"
      }`}
    >
      ♥ {count}
    </button>
  );
}
