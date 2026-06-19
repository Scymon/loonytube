-- LoonyTube — Notifications. Generated server-side by triggers so they can't be
-- forged by clients and fire no matter who performs the action. Safe to re-run.

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,  -- recipient
  actor       uuid references public.profiles(id) on delete cascade,           -- who triggered it
  type        text not null,                  -- follow | post_like | video_like | comment | video_comment
  entity_type text,                            -- profile | post | video
  entity_id   text,                            -- posts.id / videos.id / actor id (text holds both uuid + text)
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "notif read"   on public.notifications;
drop policy if exists "notif update" on public.notifications;
drop policy if exists "notif delete" on public.notifications;
create policy "notif read"   on public.notifications for select using (user_id = auth.uid());
create policy "notif update" on public.notifications for update using (user_id = auth.uid());
create policy "notif delete" on public.notifications for delete using (user_id = auth.uid());
-- (no insert policy: only the SECURITY DEFINER triggers below create rows)

-- follow → notify the followee
create or replace function public.notify_follow() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.follower <> new.followee then
    insert into public.notifications(user_id, actor, type, entity_type, entity_id)
    values (new.followee, new.follower, 'follow', 'profile', new.follower::text);
  end if; return new;
end; $$;
drop trigger if exists notify_follow on public.follows;
create trigger notify_follow after insert on public.follows for each row execute function public.notify_follow();

-- post like → notify the post owner
create or replace function public.notify_post_like() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner into v_owner from public.posts where id = new.post_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications(user_id, actor, type, entity_type, entity_id)
    values (v_owner, new.user_id, 'post_like', 'post', new.post_id::text);
  end if; return new;
end; $$;
drop trigger if exists notify_post_like on public.post_likes;
create trigger notify_post_like after insert on public.post_likes for each row execute function public.notify_post_like();

-- video like → notify the video owner
create or replace function public.notify_video_like() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner into v_owner from public.videos where id = new.video_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications(user_id, actor, type, entity_type, entity_id)
    values (v_owner, new.user_id, 'video_like', 'video', new.video_id);
  end if; return new;
end; $$;
drop trigger if exists notify_video_like on public.likes;
create trigger notify_video_like after insert on public.likes for each row execute function public.notify_video_like();

-- comment (a posts node with a parent) → notify the parent's owner
create or replace function public.notify_comment() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if new.parent_id is not null then
    select owner into v_owner from public.posts where id = new.parent_id;
    if v_owner is not null and v_owner <> new.owner then
      insert into public.notifications(user_id, actor, type, entity_type, entity_id)
      values (v_owner, new.owner, 'comment', 'post', new.parent_id::text);
    end if;
  end if; return new;
end; $$;
drop trigger if exists notify_comment on public.posts;
create trigger notify_comment after insert on public.posts for each row execute function public.notify_comment();

-- video comment → notify the video owner
create or replace function public.notify_video_comment() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner into v_owner from public.videos where id = new.video_id;
  if v_owner is not null and v_owner <> new.owner then
    insert into public.notifications(user_id, actor, type, entity_type, entity_id)
    values (v_owner, new.owner, 'video_comment', 'video', new.video_id);
  end if; return new;
end; $$;
drop trigger if exists notify_video_comment on public.comments;
create trigger notify_video_comment after insert on public.comments for each row execute function public.notify_video_comment();

-- list with actor info (avoids ambiguous double-FK embed to profiles)
create or replace function public.my_notifications(p_limit int default 50)
returns table (id uuid, actor_id uuid, actor_username text, actor_name text, actor_avatar text,
  type text, entity_type text, entity_id text, read boolean, created_at timestamptz)
  language sql security definer stable set search_path = public as $$
  select n.id, p.id, p.username, p.full_name, p.avatar_url, n.type, n.entity_type, n.entity_id, n.read, n.created_at
  from public.notifications n
  left join public.profiles p on p.id = n.actor
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit p_limit;
$$;

-- Note: notify_dm function and trigger live in notifications-dm.sql (applied after this file).

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
