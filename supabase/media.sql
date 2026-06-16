-- LoonyTube — media storage bucket (custom video thumbnails; reused later for
-- article covers/inline images). Safe to re-run.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- world-readable; users may write only inside their own uid folder ("<uid>/...")
drop policy if exists "media read"   on storage.objects;
drop policy if exists "media insert" on storage.objects;
drop policy if exists "media update" on storage.objects;
drop policy if exists "media delete" on storage.objects;

create policy "media read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media insert" on storage.objects
  for insert with check (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "media update" on storage.objects
  for update using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "media delete" on storage.objects
  for delete using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);
