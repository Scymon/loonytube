-- LoonyTube — Edit Profile fields + image storage. Safe to re-run.

-- extra profile fields shown on the Edit Profile page
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists social_x text;
alter table public.profiles add column if not exists social_instagram text;
alter table public.profiles add column if not exists social_youtube text;

-- public bucket for avatar + cover images (objects live under "<uid>/...")
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

-- storage RLS: world-readable; users may write only inside their own uid folder
drop policy if exists "profiles img read"   on storage.objects;
drop policy if exists "profiles img insert" on storage.objects;
drop policy if exists "profiles img update" on storage.objects;
drop policy if exists "profiles img delete" on storage.objects;

create policy "profiles img read" on storage.objects
  for select using (bucket_id = 'profiles');
create policy "profiles img insert" on storage.objects
  for insert with check (bucket_id = 'profiles' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "profiles img update" on storage.objects
  for update using (bucket_id = 'profiles' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "profiles img delete" on storage.objects
  for delete using (bucket_id = 'profiles' and auth.uid()::text = (storage.foldername(name))[1]);
