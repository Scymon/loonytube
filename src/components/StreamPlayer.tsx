"use client";

import { Stream } from "@cloudflare/stream-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function StreamPlayer({ uid }: { uid: string }) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streamRef = useRef<any>(null);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    // Count a view (SECURITY DEFINER RPC, callable by anyone).
    supabase.rpc("increment_views", { vid: uid });
  }, [uid, supabase]);

  // Detect orientation once dimensions are known, so vertical videos get a
  // bounded portrait frame instead of a frame as tall as the video itself.
  function detectOrientation() {
    const p = streamRef.current;
    const w = p?.videoWidth ?? 0;
    const h = p?.videoHeight ?? 0;
    if (w > 0 && h > 0) setPortrait(h > w);
  }

  return (
    <div className="flex justify-center">
      <div
        className={`relative overflow-hidden rounded-lg border border-edge bg-black ${
          portrait ? "aspect-[9/16] h-[80vh] max-w-full" : "aspect-video w-full max-h-[80vh]"
        }`}
      >
        {/* The library's responsive mode sizes the frame to the video's native
            aspect (overflowing for verticals). We neutralize its wrapper
            (!static !p-0) and let the absolutely-positioned iframe fill OUR
            bounded box instead; the player letterboxes to fit. */}
        <Stream
          src={uid}
          controls
          responsive
          streamRef={streamRef}
          onLoadedMetaData={detectOrientation}
          letterboxColor="#000000"
          className="!static !p-0"
        />
      </div>
    </div>
  );
}
