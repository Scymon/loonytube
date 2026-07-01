-- LoonyTube — CMS: site config (white-labeling) + custom pages. Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- SITE CONFIG  (single-row, id = 1)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.site_config (
  id               int primary key default 1 check (id = 1),
  site_name        text not null default 'LoonyTube',
  site_tagline     text not null default 'Watch. Post. Stream. All in one.',
  logo_url         text,                                          -- custom logo; NULL = use default
  favicon_url      text,
  featured_video_id text references public.videos(id) on delete set null,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles(id)
);
insert into public.site_config (id) values (1) on conflict (id) do nothing;

alter table public.site_config enable row level security;
drop policy if exists "site_config read"   on public.site_config;
drop policy if exists "site_config update" on public.site_config;
create policy "site_config read"   on public.site_config for select using (true);
create policy "site_config update" on public.site_config for update using (public.is_admin());

-- Stamp updated_at / updated_by on every write
create or replace function public.stamp_site_config() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists stamp_site_config on public.site_config;
create trigger stamp_site_config before update on public.site_config
  for each row execute function public.stamp_site_config();

-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOM PAGES  (CMS-authored pages, rendered at /p/[slug])
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null check (char_length(title) between 1 and 200),
  body         text not null default '',
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists pages_slug_idx on public.pages (slug);

alter table public.pages enable row level security;
drop policy if exists "pages public read"  on public.pages;
drop policy if exists "pages admin read"   on public.pages;
drop policy if exists "pages admin write"  on public.pages;
-- Published pages are world-readable; admins can see all
create policy "pages public read" on public.pages
  for select using (is_published = true or public.is_admin());
create policy "pages admin write" on public.pages
  for all using (public.is_admin());

-- Stamp updated_at
create or replace function public.stamp_pages() returns trigger
  language plpgsql security definer set search_path = public as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists stamp_pages on public.pages;
create trigger stamp_pages before update on public.pages
  for each row execute function public.stamp_pages();
