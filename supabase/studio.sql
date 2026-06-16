-- LoonyTube — Channel Studio migration.
-- Adds scheduling + a profile bio, and back-fills the video metadata columns
-- (so Studio works even if posts.sql was never applied). Safe to re-run.

-- video metadata (idempotent; covers DBs that skipped posts.sql)
alter table public.videos add column if not exists category text;
alter table public.videos add column if not exists visibility text not null default 'public';
alter table public.videos add column if not exists made_for_kids boolean not null default false;
alter table public.videos add column if not exists scheduled_at timestamptz;   -- planned release time
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'videos_visibility_chk') then
    alter table public.videos add constraint videos_visibility_chk
      check (visibility in ('public','unlisted','private'));
  end if;
end $$;
create index if not exists videos_scheduled_idx on public.videos (scheduled_at);

-- profile fields used by the Edit Profile page
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;

-- allow owners to delete their own videos/posts from Studio
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'videos' and policyname = 'videos delete') then
    create policy "videos delete" on public.videos for delete using (auth.uid() = owner);
  end if;
end $$;
