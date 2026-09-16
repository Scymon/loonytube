-- LoonyTube — visibility enforcement (authoritative). Safe to re-run.
--
-- Run this AFTER schema.sql / posts.sql / studio.sql. It is the single source of
-- truth for how `visibility` is enforced at the row level.
--
-- Semantics:
--   public   -> readable by anyone once ready; appears in discovery.
--   unlisted -> readable by anyone once ready (direct link only); excluded from
--               feeds/search/discovery at the query layer; media stays unsigned.
--   private  -> readable ONLY by the owner, and the media itself is protected by
--               Cloudflare signed URLs (requireSignedURLs, set by the app).
--
-- HISTORY / WHY THIS FILE EXISTS:
--   schema.sql used to define "videos read" as (status = 'ready' or auth.uid() = owner),
--   which ignores visibility entirely. Re-running schema.sql after privacy.sql
--   silently reverted private videos to world-readable. schema.sql has since been
--   corrected, but run this file to guarantee the correct policy is in place.

-- Belt and braces: make sure the column and its constraint exist.
alter table public.videos add column if not exists visibility text not null default 'public';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'videos_visibility_chk') then
    alter table public.videos add constraint videos_visibility_chk
      check (visibility in ('public','unlisted','private'));
  end if;
end $$;

-- Any row with a NULL/unknown visibility is treated as private until corrected,
-- rather than leaking. (No-op on a healthy DB.)
update public.videos
   set visibility = 'private'
 where visibility is null or visibility not in ('public','unlisted','private');

alter table public.videos enable row level security;

drop policy if exists "videos read" on public.videos;
create policy "videos read" on public.videos for select using (
  (status = 'ready' and visibility in ('public', 'unlisted'))
  or auth.uid() = owner
);

-- Owner-only writes. `with check` is stated explicitly so an UPDATE can never
-- hand a row to another owner.
drop policy if exists "videos insert" on public.videos;
create policy "videos insert" on public.videos for insert with check (auth.uid() = owner);

drop policy if exists "videos update" on public.videos;
create policy "videos update" on public.videos for update
  using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "videos delete" on public.videos;
create policy "videos delete" on public.videos for delete using (auth.uid() = owner);

create index if not exists videos_visibility_status_idx
  on public.videos (visibility, status, created_at desc);
