"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useVideoProgress(videoId: string | null) {
  const supabase      = createClient();
  const lastSavedRef  = useRef(0);
  const historyRef    = useRef(false); // have we recorded a history row yet?
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [ready, setReady]             = useState(false);

  // Load resume point from Supabase on mount; fall back to localStorage.
  useEffect(() => {
    if (!videoId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("video_progress")
          .select("progress_seconds, duration_seconds")
          .eq("user_id", user.id)
          .eq("video_id", videoId)
          .maybeSingle();
        if (data?.progress_seconds) {
          const isComplete = data.duration_seconds > 0 && data.progress_seconds / data.duration_seconds >= 0.92;
          setResumeTime(isComplete ? 0 : data.progress_seconds);
          setReady(true); return;
        }
      }
      // localStorage fallback (anonymous / offline)
      const local = localStorage.getItem(`loonytube:resume:${videoId}`);
      if (local) setResumeTime(parseFloat(local));
      setReady(true);
    })();
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called on every timeupdate — saves ~every 10 s.
  const onTimeUpdate = useCallback(async (
    currentSeconds: number,
    durationSeconds: number,
  ) => {
    if (!videoId) return;
    const sec = Math.floor(currentSeconds);
    if (sec <= 0 || sec < lastSavedRef.current + 10) return;
    lastSavedRef.current = sec;

    const completed = durationSeconds > 0 && sec / durationSeconds >= 0.92;

    // Reset to 0 on completion so next play starts from beginning.
    localStorage.setItem(`loonytube:resume:${videoId}`, String(completed ? 0 : sec));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert progress row; save 0 when done so next play restarts.
    await supabase.from("video_progress").upsert({
      user_id: user.id, video_id: videoId,
      progress_seconds: completed ? 0 : sec,
      duration_seconds: durationSeconds > 0 ? Math.floor(durationSeconds) : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,video_id" });

    // Upsert watch_history row (one per user+video; update progress each save).
    if (!historyRef.current) {
      historyRef.current = true;
      await supabase.from("watch_history").upsert({
        user_id: user.id, video_id: videoId,
        watched_at: new Date().toISOString(),
        progress_seconds: sec, completed,
      }, { onConflict: "user_id,video_id" });
    } else {
      await supabase.from("watch_history")
        .update({ progress_seconds: sec, completed })
        .eq("user_id", user.id).eq("video_id", videoId);
    }
    }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { resumeTime, ready, onTimeUpdate };
}
