"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProcessingWatcher({ videoId }: { videoId: string }) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("videos")
        .select("status")
        .eq("id", videoId)
        .maybeSingle();
      if (data?.status === "ready") {
        clearInterval(t);
        router.refresh();
      }
    }, 4000);
    return () => clearInterval(t);
  }, [supabase, videoId, router]);

  return null;
}
