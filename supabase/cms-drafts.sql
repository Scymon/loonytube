-- LoonyTube — CMS draft/publish separation + revisions (safe to re-run).
-- The builder autosaves into page_drafts (admin-only RLS); the public page keeps
-- reading pages.blocks. Publishing copies the draft -> blocks and snapshots a revision.
--
-- v2 note: drafts originally lived in a pages.draft_blocks column, but the
-- "pages public read" policy is row-level, so any client could select unpublished
-- draft content on published rows straight from the REST API. Drafts now live in
-- their own admin-only table; the DO block below migrates any existing column
-- data and drops the column. Safe to run whether or not v1 was ever applied.

alter table public.pages
  add column if not exists published_at timestamptz,
  add column if not exists updated_by uuid references public.profiles(id);

comment on column public.pages.published_at is
  'When blocks were last promoted from the page''s draft.';

-- Stamp updated_at + updated_by on every pages write (replaces stamp_pages from cms.sql)
create or replace function public.stamp_pages() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists stamp_pages on public.pages;
create trigger stamp_pages before update on public.pages
  for each row execute function public.stamp_pages();

-- ─────────────────────────────────────────────────────────────────────────────
-- DRAFTS — work-in-progress blocks, admin-only (never publicly readable)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.page_drafts (
  page_id    uuid primary key references public.pages(id) on delete cascade,
  blocks     jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.page_drafts enable row level security;
drop policy if exists "page_drafts admin all" on public.page_drafts;
create policy "page_drafts admin all" on public.page_drafts
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.stamp_page_drafts() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists stamp_page_drafts on public.page_drafts;
create trigger stamp_page_drafts before insert or update on public.page_drafts
  for each row execute function public.stamp_page_drafts();

-- Migrate any drafts out of the old pages.draft_blocks column, then drop it
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pages' and column_name = 'draft_blocks'
  ) then
    insert into public.page_drafts (page_id, blocks)
      select id, draft_blocks from public.pages where draft_blocks is not null
      on conflict (page_id) do nothing;
    alter table public.pages drop column draft_blocks;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- REVISIONS — snapshot of blocks at each publish, newest 20 kept per page
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.page_revisions (
  id        uuid primary key default gen_random_uuid(),
  page_id   uuid not null references public.pages(id) on delete cascade,
  blocks    jsonb not null,
  saved_at  timestamptz not null default now(),
  saved_by  uuid references public.profiles(id)
);
create index if not exists page_revisions_page_idx
  on public.page_revisions (page_id, saved_at desc);

alter table public.page_revisions enable row level security;
drop policy if exists "page_revisions admin all" on public.page_revisions;
create policy "page_revisions admin all" on public.page_revisions
  for all using (public.is_admin());

-- Keep only the newest 20 revisions per page
create or replace function public.prune_page_revisions() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  delete from page_revisions
  where page_id = new.page_id
    and id not in (
      select id from page_revisions
      where page_id = new.page_id
      order by saved_at desc
      limit 20
    );
  return new;
end;
$$;
drop trigger if exists prune_page_revisions on public.page_revisions;
create trigger prune_page_revisions after insert on public.page_revisions
  for each row execute function public.prune_page_revisions();
