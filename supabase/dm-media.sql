-- LoonyTube — image/GIF attachments on DMs. Safe to re-run. Run after messages.sql.

alter table public.messages add column if not exists images text[];

-- A message must carry text OR at least one image (existing rows all have body).
alter table public.messages drop constraint if exists messages_nonempty;
alter table public.messages add constraint messages_nonempty
  check (char_length(btrim(coalesce(body, ''))) > 0 or (images is not null and array_length(images, 1) >= 1));

-- Refresh the conversation-list RPC so image-only messages preview as "📷 Photo"
-- instead of a blank line. (Same shape as messages.sql; only the last-message label changes.)
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
    select case
             when char_length(btrim(coalesce(body, ''))) > 0 then body
             when images is not null and array_length(images, 1) >= 1 then '📷 Photo'
             else ''
           end as body
    from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  order by c.last_message_at desc;
$$;
