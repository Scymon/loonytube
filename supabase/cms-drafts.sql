-- LoonyTube — CMS draft/publish separation + revisions (safe to re-run).
-- The builder autosaves into draft_blocks; the public page keeps reading blocks.
-- Publishing copies draft_blocks -> blocks and snapshots a revision.

alter table public.pages
  add column if not exists draft_blocks jsonb,
  add column if not exists published_at timestamptz,
  add column if not exists updated_by uuid references public.profiles(id);

comment on column public.pages.draft_blocks is
  'Work-in-progress blocks. NULL = no unpublished changes. Copied into blocks on publish.';
comment on column public.pages.published_at is
  'When blocks were last promoted from draft_blocks.';

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
