-- LoonyTube schema. Paste this whole file into the Supabase SQL Editor and run.
-- Safe to re-run (drops/recreates policies).

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz default now()
);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- VIDEOS ----------
-- id IS the Cloudflare Stream UID, so the webhook can look rows up directly.
create table if not exists public.videos (
  id text primary key,
  owner uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'uploading',  -- uploading | processing | ready | failed
  duration real,
  thumbnail text,
  views bigint not null default 0,
  created_at timestamptz default now()
);
create index if not exists videos_created_idx on public.videos (created_at desc);
create index if not exists videos_owner_idx on public.videos (owner);

-- ---------- LIKES ----------
create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id text not null references public.videos(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, video_id)
);

-- ---------- COMMENTS ----------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id text not null references public.videos(id) on delete cascade,
  owner uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz default now()
);
create index if not exists comments_video_idx on public.comments (video_id, created_at desc);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.videos   enable row level security;
alter table public.likes    enable row level security;
alter table public.comments enable row level security;

-- profiles: world-readable, self-writable
drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select using (true);
create policy "profiles update" on public.profiles for update using (auth.uid() = id);

-- videos: anyone sees ready videos; owner sees their own at any status
drop policy if exists "videos read"   on public.videos;
drop policy if exists "videos insert" on public.videos;
drop policy if exists "videos update" on public.videos;
drop policy if exists "videos delete" on public.videos;
create policy "videos read"   on public.videos for select using (status = 'ready' or auth.uid() = owner);
create policy "videos insert" on public.videos for insert with check (auth.uid() = owner);
create policy "videos update" on public.videos for update using (auth.uid() = owner);
create policy "videos delete" on public.videos for delete using (auth.uid() = owner);

-- likes: world-readable, self-managed
drop policy if exists "likes read"   on public.likes;
drop policy if exists "likes insert" on public.likes;
drop policy if exists "likes delete" on public.likes;
create policy "likes read"   on public.likes for select using (true);
create policy "likes insert" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes delete" on public.likes for delete using (auth.uid() = user_id);

-- comments: world-readable, author-managed
drop policy if exists "comments read"   on public.comments;
drop policy if exists "comments insert" on public.comments;
drop policy if exists "comments delete" on public.comments;
create policy "comments read"   on public.comments for select using (true);
create policy "comments insert" on public.comments for insert with check (auth.uid() = owner);
create policy "comments delete" on public.comments for delete using (auth.uid() = owner);

-- ---------- VIEW COUNTER ----------
-- Callable by anyone (anon + authed) so a view counts without owner-only RLS getting in the way.
create or replace function public.increment_views(vid text)
returns void language sql security definer set search_path = public as $$
  update public.videos set views = views + 1 where id = vid and status = 'ready';
$$;
grant execute on function public.increment_views(text) to anon, authenticated;
