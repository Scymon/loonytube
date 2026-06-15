"use client";

import { Stream } from "@cloudflare/stream-react";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function StreamPlayer({ uid }: { uid: string }) {
  const supabase = createClient();

  useEffect(() => {
    // Count a view (SECURITY DEFINER RPC, callable by anyone).
    supabase.rpc("increment_views", { vid: uid });
  }, [uid, supabase]);

  return (
    <div className="overflow-hidden rounded-lg border border-edge bg-black">
      <Stream controls responsive src={uid} />
    </div>
  );
}
