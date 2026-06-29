-- LoonyTube — Saves (Watch Later) + Playlists. Safe to re-run.

-- ── SAVES / WATCH LATER ──────────────────────────────────────────────────────
create table if not exists public.saves (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  video_id   text not null references public.videos(id)   on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index if not exists saves_user_idx on public.saves (user_id, created_at desc);
alter table public.saves enable row level security;
drop policy if exists "saves read"   on public.saves;
drop policy if exists "saves insert" on public.saves;
drop policy if exists "saves delete" on public.saves;
create policy "saves read"   on public.saves for select using (auth.uid() = user_id);
create policy "saves insert" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves delete" on public.saves for delete using (auth.uid() = user_id);

-- ── PLAYLISTS ────────────────────────────────────────────────────────────────
create table if not exists public.playlists (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  visibility text not null default 'private'
             check (visibility in ('public', 'unlisted', 'private')),
  created_at timestamptz not null default now()
);
create index if not exists playlists_owner_idx on public.playlists (owner, created_at desc);
alter table public.playlists enable row level security;
drop policy if exists "playlists read"   on public.playlists;
drop policy if exists "playlists insert" on public.playlists;
drop policy if exists "playlists update" on public.playlists;
drop policy if exists "playlists delete" on public.playlists;
create policy "playlists read"   on public.playlists for select
  using (visibility = 'public' or auth.uid() = owner);
create policy "playlists insert" on public.playlists for insert
  with check (auth.uid() = owner);
create policy "playlists update" on public.playlists for update
  using (auth.uid() = owner);
create policy "playlists delete" on public.playlists for delete
  using (auth.uid() = owner);

-- ── PLAYLIST ITEMS ───────────────────────────────────────────────────────────
create table if not exists public.playlist_items (
  id          uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  video_id    text not null references public.videos(id)    on delete cascade,
  position    integer not null default 0,
  added_at    timestamptz not null default now(),
  unique (playlist_id, video_id)
);
create index if not exists pi_playlist_idx on public.playlist_items (playlist_id, position);
alter table public.playlist_items enable row level security;
drop policy if exists "pi read"   on public.playlist_items;
drop policy if exists "pi insert" on public.playlist_items;
drop policy if exists "pi delete" on public.playlist_items;
create policy "pi read" on public.playlist_items for select
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id
    and (p.visibility = 'public' or auth.uid() = p.owner)
  ));
create policy "pi insert" on public.playlist_items for insert
  with check (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and auth.uid() = p.owner
  ));
create policy "pi delete" on public.playlist_items for delete
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and auth.uid() = p.owner
  ));
