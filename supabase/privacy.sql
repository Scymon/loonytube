-- LoonyTube — enforce video privacy. Safe to re-run. Run after schema.sql + posts.sql.
--
-- Semantics:
--   public   → readable by anyone once ready; appears in discovery.
--   unlisted → readable by anyone once ready (direct link), but excluded from
--              feeds/search/discovery at the query layer; media stays unsigned.
--   private  → readable ONLY by the owner (this policy), and the media itself is
--              protected by Cloudflare signed URLs (requireSignedURLs, set by the app).
--
-- Owner can always read their own rows at any status/visibility.

drop policy if exists "videos read" on public.videos;
create policy "videos read" on public.videos for select using (
  (status = 'ready' and visibility in ('public', 'unlisted'))
  or auth.uid() = owner
);
