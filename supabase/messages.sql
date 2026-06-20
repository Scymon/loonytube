-- LoonyTube — Direct Messages (1:1, extensible to groups). Safe to re-run.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conv_members_user_idx on public.conversation_members(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender uuid references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);

-- Body-length cap (<= 4000 chars). Applied as a standalone, guarded ALTER rather
-- than an inline CHECK in the CREATE above: `create table if not exists` is a
-- no-op on an already-existing table, so an inline constraint would never reach a
-- live database where `messages` predates it. This block lands the constraint on
-- both fresh and existing databases, and is safe to re-run.
-- NOTE: if any existing row has body length > 4000 the ALTER will fail; the UI has
-- always capped input at 4000, so existing rows should comply.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'messages_body_len_chk') then
    alter table public.messages add constraint messages_body_len_chk check (char_length(body) <= 4000);
  end if;
end $$;

-- Membership check as SECURITY DEFINER so policies don't recurse.
create or replace function public.is_conversation_member(p_conv uuid, p_uid uuid default auth.uid())
  returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conv and user_id = p_uid);
$$;

alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;

drop policy if exists "conv read"   on public.conversations;
drop policy if exists "conv insert" on public.conversations;
create policy "conv read"   on public.conversations for select using (public.is_conversation_member(id));
create policy "conv insert" on public.conversations for insert with check (created_by = auth.uid());

drop policy if exists "cm read"        on public.conversation_members;
drop policy if exists "cm self update" on public.conversation_members;
create policy "cm read"        on public.conversation_members for select using (public.is_conversation_member(conversation_id));
create policy "cm self update" on public.conversation_members for update using (user_id = auth.uid());

drop policy if exists "msg read"   on public.messages;
drop policy if exists "msg insert" on public.messages;
create policy "msg read"   on public.messages for select using (public.is_conversation_member(conversation_id));
create policy "msg insert" on public.messages for insert with check (sender = auth.uid() and public.is_conversation_member(conversation_id));

-- Keep conversations ordered by recency.
create or replace function public.bump_conversation() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end; $$;
drop trigger if exists bump_conversation on public.messages;
create trigger bump_conversation after insert on public.messages for each row execute function public.bump_conversation();

-- Find-or-create a 1:1 DM with another user; returns the conversation id.
create or replace function public.get_or_create_dm(p_other uuid) returns uuid
  language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_me uuid := auth.uid();
begin
  if v_me is null or p_other is null or p_other = v_me then
    raise exception 'invalid participants';
  end if;
  select c.id into v_id
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = v_me
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = p_other
  where c.is_group = false
  limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.conversations (is_group, created_by) values (false, v_me) returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id) values (v_id, v_me), (v_id, p_other);
  return v_id;
end; $$;

-- One-call conversation list for the signed-in user (other participant + last msg + unread).
create or replace function public.my_conversations()
returns table (
  conversation_id uuid, other_id uuid, other_username text, other_name text,
  other_avatar text, last_body text, last_at timestamptz, unread int
) language sql security definer stable set search_path = public as $$
  with mine as (
    select cm.conversation_id, cm.last_read_at
    from public.conversation_members cm where cm.user_id = auth.uid()
  )
  select c.id, op.id, op.username, op.full_name, op.avatar_url, lm.body, c.last_message_at,
    coalesce((select count(*) from public.messages m
              where m.conversation_id = c.id and m.sender <> auth.uid() and m.created_at > mine.last_read_at), 0)::int
  from mine
  join public.conversations c on c.id = mine.conversation_id
  left join lateral (
    select p.id, p.username, p.full_name, p.avatar_url
    from public.conversation_members cm2
    join public.profiles p on p.id = cm2.user_id
    where cm2.conversation_id = c.id and cm2.user_id <> auth.uid() limit 1
  ) op on true
  left join lateral (
    select body from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  order by c.last_message_at desc;
$$;

-- Enable realtime for live message delivery.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
