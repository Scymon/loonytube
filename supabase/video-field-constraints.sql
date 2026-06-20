-- LoonyTube — DB-level length constraints on videos.title and videos.description.
-- Mirrors the application-layer limits in src/lib/upload-limits.ts.
-- Safe to re-run (drops & re-adds constraints idempotently).
-- Run after schema.sql.

alter table public.videos drop constraint if exists videos_title_len;
alter table public.videos drop constraint if exists videos_description_len;

alter table public.videos
  add constraint videos_title_len       check (char_length(title) between 1 and 100),
  add constraint videos_description_len check (char_length(coalesce(description, '')) <= 5000);
