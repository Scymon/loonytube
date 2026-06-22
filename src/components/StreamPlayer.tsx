"use client";

import { Stream } from "@cloudflare/stream-react";
import { useRef, useState } from "react";
import { useVideoProgress } from "@/hooks/useVideoProgress";

export default function StreamPlayer({ uid, token }: { uid: string; token?: string | null }) {
  const streamRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [portrait, setPortrait] = useState(false);
  const { resumeTime, ready, onTimeUpdate } = useVideoProgress(uid);

  function handleTimeUpdate() {
    const t   = streamRef.current?.currentTime ?? 0;
    const dur = streamRef.current?.duration    ?? 0;
    onTimeUpdate(t, dur);
  }

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
        {ready ? (
          <Stream
            src={token || uid}
            controls
            responsive
            streamRef={streamRef}
            onLoadedMetaData={detectOrientation}
            onTimeUpdate={handleTimeUpdate}
            letterboxColor="#000000"
            startTime={resumeTime ?? undefined}
            className="!static !p-0"
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-black/60" />
        )}
      </div>
    </div>
  );
}
