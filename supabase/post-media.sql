-- LoonyTube — image/GIF attachments on posts. Safe to re-run. Run after posts.sql.

-- Store up to 4 public image URLs (from the `media` bucket) per post.
alter table public.posts add column if not exists images text[];

-- Allow image-only posts (empty body) by relaxing the body length CHECK (was 1..2000).
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.posts'::regclass and contype = 'c'
  loop execute format('alter table public.posts drop constraint %I', c); end loop;
end $$;
alter table public.posts add constraint posts_body_len check (char_length(body) <= 2000);

-- Replace create_post with a 4-arg version (adds p_images, caps at 4, allows
-- image-only posts). Drop the old 3-arg first to avoid overload ambiguity.
drop function if exists public.create_post(text, text, uuid);
create or replace function public.create_post(
  p_body text,
  p_video_id text default null,
  p_parent_id uuid default null,
  p_images text[] default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  imgs text[];
  t text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- keep at most the first 4 images, preserving order
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

  for t in
    select distinct lower(m[1]) from regexp_matches(coalesce(p_body, ''), '#([A-Za-z0-9_]{1,50})', 'g') as m
  loop
    insert into public.hashtags (tag) values (t) on conflict do nothing;
    insert into public.post_hashtags (post_id, tag) values (new_id, t) on conflict do nothing;
  end loop;

  return new_id;
end; $$;
grant execute on function public.create_post(text, text, uuid, text[]) to authenticated;
