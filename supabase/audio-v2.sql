-- LoonyTube — Audio v2 migration
-- Switches audio storage from Cloudflare Stream → Supabase Storage.
-- Run in Supabase SQL Editor AFTER audio.sql has been run once.
--
-- What changes:
--   • New `audio-files` storage bucket (500 MiB per file, public)
--   • audio_tracks.id   text → uuid (no longer the Cloudflare UID)
--   • audio_tracks.url  new column — Supabase Storage public URL
--   • audio_tracks.status simplified to ready | failed (no uploading / processing)
--   • audio_likes / audio_progress re-created with uuid FK
--   • increment_audio_views() updated to accept uuid

-- ---------- STORAGE BUCKET ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-files', 'audio-files', true,
  524288000,   -- 500 MiB
  array[
    'audio/mpeg','audio/mp4','audio/x-m4a',
    'audio/wav','audio/x-wav',
    'audio/flac','audio/x-flac',
    'audio/ogg','audio/aac','audio/webm'
  ]
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "audio-files read"   on storage.objects;
drop policy if exists "audio-files insert" on storage.objects;
drop policy if exists "audio-files delete" on storage.objects;

create policy "audio-files read" on storage.objects
  for select using (bucket_id = 'audio-files');

create policy "audio-files insert" on storage.objects
  for insert with check (
    bucket_id = 'audio-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "audio-files delete" on storage.objects
  for delete using (
    bucket_id = 'audio-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------- RE-CREATE audio_tracks ----------
-- Drop dependents first so FK constraints don't block the drop.
drop table if exists public.audio_progress cascade;
drop table if exists public.audio_likes    cascade;
drop table if exists public.audio_tracks   cascade;

create table public.audio_tracks (
  id          uuid    primary key default gen_random_uuid(),
  owner       uuid    not null references public.profiles(id) on delete cascade,
  title       text    not null,
  description text,
  category_id uuid    references public.audio_categories(id) on delete set null,
  cover_url   text,                          -- Supabase Storage URL (thumbnails bucket)
  url         text    not null,              -- Supabase Storage public URL (audio-files bucket)
  duration    real,                          -- seconds; populated client-side after upload
  status      text    not null default 'ready'
              check (status in ('ready', 'failed')),
  visibility  text    not null default 'public'
              check (visibility in ('public', 'unlisted', 'private')),
  chapters    text,                          -- "0:00 Intro\n5:30 Act 1" format
  views       bigint  not null default 0,
  created_at  timestamptz default now()
);

create index if not exists audio_tracks_created_idx  on public.audio_tracks (created_at desc);
create index if not exists audio_tracks_owner_idx    on public.audio_tracks (owner);
create index if not exists audio_tracks_category_idx on public.audio_tracks (category_id);

-- ---------- RE-CREATE DEPENDENT TABLES ----------
create table public.audio_likes (
  user_id    uuid not null references public.profiles(id)     on delete cascade,
  track_id   uuid not null references public.audio_tracks(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, track_id)
);

create table public.audio_progress (
  user_id    uuid not null references public.profiles(id)     on delete cascade,
  track_id   uuid not null references public.audio_tracks(id) on delete cascade,
  position   real not null default 0,   -- seconds
  duration   real,
  updated_at timestamptz default now(),
  primary key (user_id, track_id)
);

-- ---------- RLS ----------
alter table public.audio_tracks    enable row level security;
alter table public.audio_likes     enable row level security;
alter table public.audio_progress  enable row level security;

drop policy if exists "audio_tracks read"   on public.audio_tracks;
drop policy if exists "audio_tracks insert" on public.audio_tracks;
drop policy if exists "audio_tracks update" on public.audio_tracks;
drop policy if exists "audio_tracks delete" on public.audio_tracks;

create policy "audio_tracks read"   on public.audio_tracks for select
  using (
    (status = 'ready' and visibility in ('public', 'unlisted'))
    or auth.uid() = owner
  );
create policy "audio_tracks insert" on public.audio_tracks for insert
  with check (auth.uid() = owner);
create policy "audio_tracks update" on public.audio_tracks for update
  using (auth.uid() = owner);
create policy "audio_tracks delete" on public.audio_tracks for delete
  using (auth.uid() = owner);

drop policy if exists "audio_likes read"   on public.audio_likes;
drop policy if exists "audio_likes insert" on public.audio_likes;
drop policy if exists "audio_likes delete" on public.audio_likes;
create policy "audio_likes read"   on public.audio_likes for select using (true);
create policy "audio_likes insert" on public.audio_likes for insert with check (auth.uid() = user_id);
create policy "audio_likes delete" on public.audio_likes for delete using (auth.uid() = user_id);

drop policy if exists "audio_progress rw" on public.audio_progress;
create policy "audio_progress rw" on public.audio_progress for all using (auth.uid() = user_id);

-- ---------- VIEWS HELPER ----------
-- Recreated with uuid parameter (was text for the old Cloudflare UID)
create or replace function public.increment_audio_views(track_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.audio_tracks set views = views + 1 where id = track_id;
$$;
