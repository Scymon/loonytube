-- LoonyTube — Loon Posts (hybrid feed) + content metadata migration.
-- Paste into the Supabase SQL Editor and run. Safe to re-run.

-- ───────── VIDEOS: content metadata (compose Video tab + categories/shelves) ─────────
alter table public.videos add column if not exists category text;
alter table public.videos add column if not exists visibility text not null default 'public';
alter table public.videos add column if not exists made_for_kids boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'videos_visibility_chk') then
    alter table public.videos add constraint videos_visibility_chk
      check (visibility in ('public','unlisted','private'));
  end if;
end $$;
create index if not exists videos_category_idx on public.videos (category);

-- ───────── POSTS (text/media + threaded replies via parent_id) ─────────
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.posts(id) on delete cascade,   -- reply / thread link
  body       text not null check (char_length(body) between 1 and 2000),
  video_id   text references public.videos(id) on delete set null, -- optional attached video
  created_at timestamptz default now()
);
create index if not exists posts_owner_idx   on public.posts (owner);
create index if not exists posts_parent_idx  on public.posts (parent_id);
create index if not exists posts_created_idx  on public.posts (created_at desc);

-- ───────── POST LIKES ─────────
create table if not exists public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
create index if not exists post_likes_post_idx on public.post_likes (post_id);

-- ───────── BOOKMARKS (save posts) ─────────
create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ───────── HASHTAGS (normalized so #feeds / trending / search are real queries) ─────────
create table if not exists public.hashtags (
  tag text primary key,
  created_at timestamptz default now()
);
create table if not exists public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag     text not null references public.hashtags(tag) on delete cascade,
  primary key (post_id, tag)
);
create index if not exists post_hashtags_tag_idx on public.post_hashtags (tag);

-- ───────── create_post RPC: atomic insert + hashtag parsing (SECURITY DEFINER) ─────────
create or replace function public.create_post(
  p_body text,
  p_video_id text default null,
  p_parent_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  t text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.posts (owner, body, video_id, parent_id)
  values (uid, p_body, p_video_id, p_parent_id)
  returning id into new_id;

  for t in
    select distinct lower(m[1]) from regexp_matches(p_body, '#([A-Za-z0-9_]{1,50})', 'g') as m
  loop
    insert into public.hashtags (tag) values (t) on conflict do nothing;
    insert into public.post_hashtags (post_id, tag) values (new_id, t) on conflict do nothing;
  end loop;

  return new_id;
end; $$;
grant execute on function public.create_post(text, text, uuid) to authenticated;

-- ───────── RLS ─────────
alter table public.posts         enable row level security;
alter table public.post_likes    enable row level security;
alter table public.bookmarks     enable row level security;
alter table public.hashtags      enable row level security;
alter table public.post_hashtags enable row level security;

drop policy if exists "posts read"   on public.posts;
drop policy if exists "posts insert" on public.posts;
drop policy if exists "posts update" on public.posts;
drop policy if exists "posts delete" on public.posts;
create policy "posts read"   on public.posts for select using (true);
create policy "posts insert" on public.posts for insert with check (auth.uid() = owner);
create policy "posts update" on public.posts for update using (auth.uid() = owner);
create policy "posts delete" on public.posts for delete using (auth.uid() = owner);

drop policy if exists "post_likes read"   on public.post_likes;
drop policy if exists "post_likes insert" on public.post_likes;
drop policy if exists "post_likes delete" on public.post_likes;
create policy "post_likes read"   on public.post_likes for select using (true);
create policy "post_likes insert" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "post_likes delete" on public.post_likes for delete using (auth.uid() = user_id);

drop policy if exists "bookmarks read"   on public.bookmarks;
drop policy if exists "bookmarks insert" on public.bookmarks;
drop policy if exists "bookmarks delete" on public.bookmarks;
create policy "bookmarks read"   on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks delete" on public.bookmarks for delete using (auth.uid() = user_id);

-- hashtags + post_hashtags are populated by the SECURITY DEFINER RPC; world-readable
drop policy if exists "hashtags read" on public.hashtags;
create policy "hashtags read" on public.hashtags for select using (true);
drop policy if exists "post_hashtags read" on public.post_hashtags;
create policy "post_hashtags read" on public.post_hashtags for select using (true);
