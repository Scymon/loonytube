-- ── Video Progress ────────────────────────────────────────────────────────────
-- Stores the last playback position per user per video.
-- Upserted client-side every ~10 s during playback.
CREATE TABLE IF NOT EXISTS video_progress (
  user_id          uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  video_id         uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  progress_seconds int  NOT NULL DEFAULT 0,
  duration_seconds int,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON video_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Watch History ─────────────────────────────────────────────────────────────
-- One row per watch session. Upserted on first play; progress + completed
-- updated as the user watches.
CREATE TABLE IF NOT EXISTS watch_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  video_id         uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watched_at       timestamptz NOT NULL DEFAULT now(),
  progress_seconds int  NOT NULL DEFAULT 0,
  completed        boolean NOT NULL DEFAULT false
);
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own history" ON watch_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS watch_history_user_date
  ON watch_history (user_id, watched_at DESC);
-- One active history row per video per user (latest watch session)
CREATE UNIQUE INDEX IF NOT EXISTS watch_history_user_video
  ON watch_history (user_id, video_id);
