-- LoonyTube — discovery migration. Only needed for the "Follow #tag" button.
-- Search and the hashtag feeds are pure reads and work WITHOUT running this.
-- Paste into the Supabase SQL Editor and run. Safe to re-run.

create table if not exists public.tag_follows (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tag        text not null,   -- not FK to hashtags so you can follow a tag before it's used
  created_at timestamptz default now(),
  primary key (user_id, tag)
);

alter table public.tag_follows enable row level security;

drop policy if exists "tag_follows read"   on public.tag_follows;
drop policy if exists "tag_follows insert" on public.tag_follows;
drop policy if exists "tag_follows delete" on public.tag_follows;
create policy "tag_follows read"   on public.tag_follows for select using (auth.uid() = user_id);
create policy "tag_follows insert" on public.tag_follows for insert with check (auth.uid() = user_id);
create policy "tag_follows delete" on public.tag_follows for delete using (auth.uid() = user_id);
