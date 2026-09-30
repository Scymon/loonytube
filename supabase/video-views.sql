-- LoonyTube — video view counting. Safe to re-run.
--
-- A "view" is recorded only after real playback (the client calls the API once
-- the player passes a watch threshold), deduped per viewer per video per UTC
-- day. Link-preview crawlers (X, Facebook, Slack, iMessage) never count,
-- because they never play the video.
--
-- viewer_key is either:
--   'u:<user-uuid>'  for a signed-in viewer, or
--   'a:<hash>'       for an anonymous one -- a salted hash of IP + user-agent,
--                    rotated daily. No raw IP is ever stored.

create table if not exists public.video_views (
  video_id   text not null references public.videos(id) on delete cascade,
  viewer_key text not null,
  viewed_on  date not null default (now() at time zone 'utc')::date,
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  -- This PK IS the dedupe rule: one view per viewer per video per day.
  primary key (video_id, viewer_key, viewed_on)
);

create index if not exists video_views_video_day_idx
  on public.video_views (video_id, viewed_on desc);

-- No policies are defined on purpose: the table is written only by the
-- security-definer function below and read only by the service role. With RLS
-- enabled and no policy, anon/authenticated clients can neither read nor write
-- it, so raw view logs are never exposed through the REST API.
alter table public.video_views enable row level security;

-- Records a view and bumps videos.views ONLY when the insert actually happened
-- (i.e. this viewer had not already been counted for this video today).
-- Returns true when a new view was counted.
create or replace function public.record_video_view(
  p_video_id   text,
  p_viewer_key text,
  p_user_id    uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  insert into public.video_views (video_id, viewer_key, user_id)
  values (p_video_id, p_viewer_key, p_user_id)
  on conflict do nothing;

  get diagnostics v_rows = row_count;

  if v_rows > 0 then
    update public.videos set views = coalesce(views, 0) + 1 where id = p_video_id;
    return true;
  end if;

  return false;
end;
$$;

-- Callable only by the server (service role). Revoked from browser roles so a
-- client cannot inflate counts by calling the RPC directly.
revoke all on function public.record_video_view(text, text, uuid) from public;
revoke all on function public.record_video_view(text, text, uuid) from anon, authenticated;
