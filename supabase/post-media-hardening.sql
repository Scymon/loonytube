-- LoonyTube — Harden create_post: image URL origin check + per-user rate limit.
-- Run after post-media.sql. Safe to re-run.
--
-- Two defenses added:
--   1. Image URLs must originate from our own Supabase Storage bucket (same
--      pattern as the thumbnail check in /api/upload-url). Prevents storing
--      arbitrary external tracking pixels or malicious content in posts.
--   2. Per-user rate limit: max 20 posts per hour. Blocks spam without
--      requiring application-layer enforcement.
--
-- The storage bucket URL is read from app.settings.supabase_url, which must be
-- set once per database:
--   SELECT set_config('app.settings.supabase_url', 'https://<project>.supabase.co', false);
-- Or set it as a Supabase secret and reference it via pg_settings.
-- If not set, the origin check is skipped (degraded gracefully — set it).

create or replace function public.create_post(
  p_body    text,
  p_video_id text  default null,
  p_parent_id uuid default null,
  p_images  text[] default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid       uuid := auth.uid();
  new_id    uuid;
  imgs      text[];
  t         text;
  img_url   text;
  posts_this_hour int;
  supabase_url text;
  expected_prefix text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- ── Rate limit: max 20 posts per hour per user ────────────────────────────
  select count(*) into posts_this_hour
    from public.posts
   where owner = uid
     and created_at > now() - interval '1 hour';
  if posts_this_hour >= 20 then
    raise exception 'Rate limit: max 20 posts per hour';
  end if;

  -- ── Image URL origin check ────────────────────────────────────────────────
  -- Read the Supabase project URL from a GUC set at deploy time.
  -- If not configured, skip the check (log a warning via RAISE NOTICE).
  supabase_url := current_setting('app.settings.supabase_url', true);
  if supabase_url is not null and supabase_url <> '' then
    expected_prefix := supabase_url || '/storage/v1/object/public/media/';
    foreach img_url in array coalesce(p_images, '{}')
    loop
      if img_url is not null and img_url <> '' then
        if not img_url like (expected_prefix || '%') then
          raise exception 'Image URLs must be uploaded to our media storage';
        end if;
      end if;
    end loop;
  else
    raise notice 'app.settings.supabase_url not set — image origin check skipped';
  end if;

  -- ── Keep at most 4 images, preserving order ───────────────────────────────
  imgs := (
    select array_agg(x order by ord)
    from unnest(coalesce(p_images, '{}')) with ordinality as u(x, ord)
    where ord <= 4 and x is not null and length(btrim(x)) > 0
  );

  if coalesce(char_length(btrim(p_body)), 0) = 0
     and (imgs is null or array_length(imgs, 1) is null) then
    raise exception 'empty post';
  end if;

  insert into public.posts (owner, body, video_id, parent_id, images)
  values (uid, coalesce(p_body, ''), p_video_id, p_parent_id, imgs)
  returning id into new_id;

  -- ── Hashtag extraction ────────────────────────────────────────────────────
  for t in
    select distinct lower(m[1])
      from regexp_matches(coalesce(p_body, ''), '#([A-Za-z0-9_]{1,50})', 'g') as m
  loop
    insert into public.hashtags (tag) values (t) on conflict do nothing;
    insert into public.post_hashtags (post_id, tag) values (new_id, t) on conflict do nothing;
  end loop;

  return new_id;
end; $$;

grant execute on function public.create_post(text, text, uuid, text[]) to authenticated;
