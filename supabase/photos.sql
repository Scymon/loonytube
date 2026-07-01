-- LoonyTube — Photos / image library
-- Shared asset store used by posts, articles, and CMS pages.
-- Run in Supabase SQL Editor

-- ---------- STORAGE BUCKET ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', true,
  20971520,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos read"   on storage.objects;
drop policy if exists "photos insert" on storage.objects;
drop policy if exists "photos update" on storage.objects;
drop policy if exists "photos delete" on storage.objects;

create policy "photos read"   on storage.objects for select using (bucket_id = 'photos');
create policy "photos insert" on storage.objects for insert with check (
  bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "photos update" on storage.objects for update using (
  bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "photos delete" on storage.objects for delete using (
  bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]
);

-- ---------- PHOTOS TABLE ----------
-- Asset library: images owned by a user, referenceable from posts/articles/pages.
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  url         text not null,
  visibility  text not null default 'public'
              check (visibility in ('public', 'unlisted', 'private')),
  created_at  timestamptz default now()
);

create index if not exists photos_owner_idx   on public.photos (owner);
create index if not exists photos_created_idx on public.photos (created_at desc);

alter table public.photos enable row level security;

drop policy if exists "photos read"   on public.photos;
drop policy if exists "photos insert" on public.photos;
drop policy if exists "photos update" on public.photos;
drop policy if exists "photos delete" on public.photos;

create policy "photos read"   on public.photos for select
  using (visibility in ('public', 'unlisted') or auth.uid() = owner);
create policy "photos insert" on public.photos for insert
  with check (auth.uid() = owner);
create policy "photos update" on public.photos for update
  using (auth.uid() = owner);
create policy "photos delete" on public.photos for delete
  using (auth.uid() = owner);
