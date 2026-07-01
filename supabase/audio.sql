-- LoonyTube — Audio content type
-- Run in Supabase SQL Editor after schema.sql

-- ---------- AUDIO CATEGORIES ----------
create table if not exists public.audio_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text,
  created_at  timestamptz default now()
);

-- Seed default categories
insert into public.audio_categories (name, slug, description) values
  ('Podcast',    'podcast',    'Episodic audio shows'),
  ('Music',      'music',      'Songs, albums, and mixes'),
  ('Audiobook',  'audiobook',  'Narrated books and long-form stories'),
  ('Meditation', 'meditation', 'Guided meditation and relaxation'),
  ('News',       'news',       'News briefings and commentary'),
  ('Comedy',     'comedy',     'Stand-up and comedy shows'),
  ('Education',  'education',  'Lectures, courses, and explainers'),
  ('Story',      'story',      'Fictional narratives and drama')
on conflict (slug) do nothing;

-- ---------- AUDIO TRACKS ----------
-- id IS the Cloudflare Stream UID so webhooks can look rows up directly
create table if not exists public.audio_tracks (
  id          text primary key,                                       -- Cloudflare Stream UID
  owner       uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  category_id uuid references public.audio_categories(id) on delete set null,
  cover_url   text,                                                   -- Supabase Storage URL
  duration    real,                                                   -- seconds
  status      text not null default 'uploading'                       -- uploading | processing | ready | failed
              check (status in ('uploading','processing','ready','failed')),
  visibility  text not null default 'public'
              check (visibility in ('public','unlisted','private')),
  chapters    text,                                                   -- same "HH:MM:SS Title" format as videos
  views       bigint not null default 0,
  created_at  timestamptz default now()
);

create index if not exists audio_tracks_created_idx on public.audio_tracks (created_at desc);
create index if not exists audio_tracks_owner_idx   on public.audio_tracks (owner);
create index if not exists audio_tracks_category_idx on public.audio_tracks (category_id);

-- ---------- AUDIO LIKES ----------
create table if not exists public.audio_likes (
  user_id    uuid not null references public.profiles(id)     on delete cascade,
  track_id   text not null references public.audio_tracks(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, track_id)
);

-- ---------- AUDIO PROGRESS ----------
-- Audible-style resume — where the user left off
create table if not exists public.audio_progress (
  user_id    uuid not null references public.profiles(id)     on delete cascade,
  track_id   text not null references public.audio_tracks(id) on delete cascade,
  position   real not null default 0,   -- seconds
  duration   real,
  updated_at timestamptz default now(),
  primary key (user_id, track_id)
);

-- ---------- RLS ----------
alter table public.audio_categories enable row level security;
alter table public.audio_tracks     enable row level security;
alter table public.audio_likes      enable row level security;
alter table public.audio_progress   enable row level security;

-- categories: world-readable, admin-writable (handled by app-level role check)
drop policy if exists "audio_categories read" on public.audio_categories;
create policy "audio_categories read" on public.audio_categories for select using (true);

-- tracks: public sees ready+public tracks; owner sees all their own
drop policy if exists "audio_tracks read"   on public.audio_tracks;
drop policy if exists "audio_tracks insert" on public.audio_tracks;
drop policy if exists "audio_tracks update" on public.audio_tracks;
drop policy if exists "audio_tracks delete" on public.audio_tracks;
create policy "audio_tracks read"   on public.audio_tracks for select
  using (status = 'ready' and visibility = 'public' or auth.uid() = owner);
create policy "audio_tracks insert" on public.audio_tracks for insert with check (auth.uid() = owner);
create policy "audio_tracks update" on public.audio_tracks for update using (auth.uid() = owner);
create policy "audio_tracks delete" on public.audio_tracks for delete using (auth.uid() = owner);

-- likes
drop policy if exists "audio_likes read"   on public.audio_likes;
drop policy if exists "audio_likes insert" on public.audio_likes;
drop policy if exists "audio_likes delete" on public.audio_likes;
create policy "audio_likes read"   on public.audio_likes for select using (true);
create policy "audio_likes insert" on public.audio_likes for insert with check (auth.uid() = user_id);
create policy "audio_likes delete" on public.audio_likes for delete using (auth.uid() = user_id);

-- progress: private to the user
drop policy if exists "audio_progress rw" on public.audio_progress;
create policy "audio_progress rw" on public.audio_progress for all using (auth.uid() = user_id);

-- ---------- VIEWS HELPER ----------
create or replace function public.increment_audio_views(track_id text)
returns void language sql security definer set search_path = public as $$
  update public.audio_tracks set views = views + 1 where id = track_id;
$$;
