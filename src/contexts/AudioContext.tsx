"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

/* ── Types ─────────────────────────────────────────────────────────────── */
export type AudioTrackMeta = {
  id: string;
  title: string;
  ownerName: string | null;
  coverUrl: string | null;
  duration: number | null;
  url: string;
};

export type SleepTimer = 15 | 30 | 45 | 60 | null;

export type VideoMeta = {
  id:       string;
  title:    string;
  ownerName: string | null;
  posterUrl: string | null;
};

type AudioState = {
  track:         AudioTrackMeta | null;
  queue:         AudioTrackMeta[];
  playing:       boolean;
  position:      number;
  duration:      number;
  speed:         number;
  sleepTimer:    SleepTimer;
  sleepLeft:     number | null;
  videoMiniMode:   "mini" | "mini-float" | null;
  videoMeta:       VideoMeta | null;
  videoPosition:   number;
  videoDuration:   number;
  videoIsPlaying:  boolean;
};

type AudioActions = {
  play:        (track: AudioTrackMeta, queue?: AudioTrackMeta[]) => void;
  pause:       () => void;
  resume:      () => void;
  seek:        (t: number) => void;
  seekFraction:(pct: number) => void;
  setSpeed:    (s: number) => void;
  setSleep:    (t: SleepTimer) => void;
  skipForward: (s?: number) => void;
  skipBack:    (s?: number) => void;
  playNext:    () => void;
  playPrev:    () => void;
  dismiss:          () => void;
  setVideoMiniMode:    (m: "mini" | "mini-float" | null) => void;
  setVideoMeta:        (m: VideoMeta | null) => void;
  setVideoProgress:    (pos: number, dur: number) => void;
  setVideoIsPlaying:   (v: boolean) => void;
  registerVideoSeek:   (fn: ((frac: number) => void) | null) => void;
  seekVideoFraction:   (frac: number) => void;
  registerVideoToggle: (fn: (() => void) | null) => void;
  toggleVideoPlay:     () => void;
};

export type AudioCtxValue = AudioState & AudioActions;

/* ── Context ────────────────────────────────────────────────────────────── */
const Ctx = createContext<AudioCtxValue | null>(null);

export function useAudio(): AudioCtxValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudio must be used inside <AudioProvider>");
  return ctx;
}

/* ── Provider ───────────────────────────────────────────────────────────── */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  // Initialize synchronously so the element is ready before any child useEffect fires.
  // (React runs children's effects before parents', so a useEffect-based init would
  //  arrive too late on hard page load when ListenClient tries to call play().)
  const audioRef  = useRef<HTMLAudioElement | null>(
    typeof window !== "undefined" ? new Audio() : null
  );
  const sleepRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const trackRef  = useRef<AudioTrackMeta | null>(null);

  const [track,      setTrack]      = useState<AudioTrackMeta | null>(null);
  const [queue,      setQueue]      = useState<AudioTrackMeta[]>([]);
  const [playing,    setPlaying]    = useState(false);
  const [position,   setPosition]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [speed,      setSpeedState] = useState(1);
  const [sleepTimer, setSleepState] = useState<SleepTimer>(null);
  const [sleepLeft,  setSleepLeft]  = useState<number | null>(null);
  const [videoMiniMode,  setVideoMiniMode]  = useState<"mini" | "mini-float" | null>(null);
  const [videoMeta,      setVideoMeta]      = useState<VideoMeta | null>(null);
  const [videoPosition,  setVideoPosition]  = useState(0);
  const [videoDuration,  setVideoDuration]  = useState(0);
  const [videoIsPlaying, setVideoIsPlaying] = useState(false);
  const videoSeekRef   = useRef<((frac: number) => void) | null>(null);
  const videoToggleRef = useRef<(() => void) | null>(null);

  /* keep trackRef in sync so event handlers don't close over stale track */
  useEffect(() => { trackRef.current = track; }, [track]);

  /* ── Persist progress (debounced 5s) ── */
  const persistProgress = useCallback((pos: number, dur: number) => {
    const t = trackRef.current;
    if (!t) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("audio_progress").upsert(
        { user_id: user.id, track_id: t.id, position: pos, duration: dur, updated_at: new Date().toISOString() },
        { onConflict: "user_id,track_id" }
      );
    }, 5000);
  }, [supabase]);

  /* ── Wire audio events once on mount ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime     = () => {
      setPosition(audio.currentTime);
      // Grab duration each tick. WebM from MediaRecorder has no duration block so
      // audio.duration = Infinity. Fall back to the end of the last buffered range,
      // which grows as the browser downloads the file and eventually reaches the true end.
      let d = audio.duration;
      if (!isFinite(d) && audio.buffered.length > 0) {
        d = audio.buffered.end(audio.buffered.length - 1);
      }
      if (isFinite(d) && d > 0) setDuration(d);
    };
    const onDuration = () => { const d = audio.duration; if (isFinite(d) && d > 0) setDuration(d); };
    const onPlay     = () => setPlaying(true);
    const onPause    = () => setPlaying(false);
    const onEnded    = () => { setPlaying(false); };

    audio.addEventListener("timeupdate",      onTime);
    audio.addEventListener("loadedmetadata",  onDuration);
    audio.addEventListener("durationchange",  onDuration);
    audio.addEventListener("play",            onPlay);
    audio.addEventListener("pause",           onPause);
    audio.addEventListener("ended",           onEnded);

    const interval = setInterval(() => {
      if (!audio.paused) persistProgress(audio.currentTime, audio.duration || 0);
    }, 10_000);

    return () => {
      audio.removeEventListener("timeupdate",      onTime);
      audio.removeEventListener("loadedmetadata",  onDuration);
      audio.removeEventListener("durationchange",  onDuration);
      audio.removeEventListener("play",            onPlay);
      audio.removeEventListener("pause",           onPause);
      audio.removeEventListener("ended",           onEnded);
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Pause audio when video enters mini mode (avoid simultaneous playback) ── */
  useEffect(() => {
    if (videoMiniMode !== null) {
      audioRef.current?.pause();
    }
  }, [videoMiniMode]);

  /* ── Sleep timer countdown ── */
  useEffect(() => {
    if (sleepRef.current) clearInterval(sleepRef.current);
    if (!sleepTimer) { setSleepLeft(null); return; }
    let remaining = sleepTimer * 60;
    setSleepLeft(remaining);
    sleepRef.current = setInterval(() => {
      remaining -= 1;
      setSleepLeft(remaining);
      if (remaining <= 0) {
        audioRef.current?.pause();
        setSleepState(null);
        setSleepLeft(null);
        if (sleepRef.current) clearInterval(sleepRef.current);
      }
    }, 1000);
    return () => { if (sleepRef.current) clearInterval(sleepRef.current); };
  }, [sleepTimer]);

  /* ── Actions ── */
  const play = useCallback((newTrack: AudioTrackMeta, newQueue: AudioTrackMeta[] = []) => {
    const audio = audioRef.current;
    if (!audio) return;

    setTrack(newTrack);
    setQueue(newQueue);
    setPosition(0);
    // Seed from DB duration immediately; durationchange will refine if browser can determine it
    setDuration(newTrack.duration ?? 0);

    const a = audio; // capture before async boundary — audio ref is non-null here
    async function load() {
      a.src = newTrack.url;
      a.playbackRate = speed;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("audio_progress")
          .select("position").eq("user_id", user.id).eq("track_id", newTrack.id).single();
        if (data?.position && data.position > 10) {
          a.currentTime = data.position;
          setPosition(data.position);
        }
      }
      a.play().then(() => setPlaying(true)).catch(() => {});
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, supabase]);

  const pause       = useCallback(() => audioRef.current?.pause(), []);
  const resume      = useCallback(() => { audioRef.current?.play().catch(() => {}); }, []);
  const seek         = useCallback((t: number) => {
    if (!isFinite(t) || t < 0) return;
    if (audioRef.current) { audioRef.current.currentTime = t; setPosition(t); }
  }, []);
  // seekFraction uses the live audio element duration, falling back to DB duration
  const seekFraction = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    // Prefer the actual audio.duration; fall back to the DB-stored duration
    const dur = (isFinite(audio.duration) && audio.duration > 0)
      ? audio.duration
      : (trackRef.current?.duration ?? 0);
    if (dur <= 0) return;
    const t = Math.max(0, Math.min(dur, pct * dur));
    audio.currentTime = t;
    setPosition(t);
  }, []);
  const skipForward = useCallback((s = 15) => {
    const dur = audioRef.current?.duration ?? 0;
    seek(Math.min(dur, (audioRef.current?.currentTime ?? 0) + s));
  }, [seek]);
  const skipBack = useCallback((s = 15) => {
    seek(Math.max(0, (audioRef.current?.currentTime ?? 0) - s));
  }, [seek]);
  const dismiss  = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
    setTrack(null);
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);
  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);
  const setSleep = useCallback((t: SleepTimer) => setSleepState(t), []);

  const setVideoProgress   = useCallback((pos: number, dur: number) => {
    setVideoPosition(pos);
    setVideoDuration(dur);
  }, []);
  const registerVideoSeek  = useCallback((fn: ((frac: number) => void) | null) => {
    videoSeekRef.current = fn;
  }, []);
  const seekVideoFraction  = useCallback((frac: number) => {
    videoSeekRef.current?.(frac);
  }, []);
  const registerVideoToggle = useCallback((fn: (() => void) | null) => {
    videoToggleRef.current = fn;
  }, []);
  const toggleVideoPlay = useCallback(() => {
    videoToggleRef.current?.();
  }, []);

  const playNext = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    setQueue(q => {
      const idx  = q.findIndex(x => x.id === t.id);
      const next = q[idx + 1];
      if (next) play(next, q);
      return q;
    });
  }, [play]);

  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { seek(0); return; }
    const t = trackRef.current;
    if (!t) return;
    setQueue(q => {
      const idx  = q.findIndex(x => x.id === t.id);
      const prev = q[idx - 1];
      if (prev) play(prev, q);
      return q;
    });
  }, [play, seek]);

  return (
    <Ctx.Provider value={{
      track, queue, playing, position, duration, speed, sleepTimer, sleepLeft,
      videoMiniMode, setVideoMiniMode, videoMeta, setVideoMeta,
      videoPosition, videoDuration, videoIsPlaying, setVideoIsPlaying,
      setVideoProgress, registerVideoSeek, seekVideoFraction,
      registerVideoToggle, toggleVideoPlay,
      play, pause, resume, seek, seekFraction, setSpeed, setSleep,
      skipForward, skipBack, playNext, playPrev, dismiss,
    }}>
      {children}
    </Ctx.Provider>
  );
}
