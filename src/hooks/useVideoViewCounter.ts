"use client";

import { useEffect, useRef } from "react";

// Fires a single view-count request once playback passes the watch threshold.
//
// Threshold: 10 seconds of playback, or 25% of the video for anything shorter
// than 40s, so a 15-second clip is not impossible to "view". Because this keys
// off real playback time, a crawler fetching the page for its link preview and
// a viewer refreshing the page both count for nothing.
//
// The request is sent at most once per mount; the server and the database
// dedupe properly (one view per viewer per video per day), so a repeat here
// would be harmless -- this just avoids the pointless round-trip.
export function useVideoViewCounter(
  videoId: string,
  currentTime: number,
  duration: number,
) {
  const sentRef = useRef(false);

  // Reset when the player moves to a different video.
  useEffect(() => {
    sentRef.current = false;
  }, [videoId]);

  useEffect(() => {
    if (sentRef.current || !videoId || duration <= 0) return;

    const threshold = duration < 40 ? duration * 0.25 : 10;
    if (currentTime < threshold) return;

    sentRef.current = true;
    // Best-effort: a failed view count should never surface to the viewer.
    fetch(`/api/videos/${videoId}/view`, { method: "POST" }).catch(() => {});
  }, [videoId, currentTime, duration]);
}
