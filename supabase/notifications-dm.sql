-- LoonyTube — DM notifications. Requires messages.sql + notifications.sql. Safe to re-run.
-- One unread "dm" notification per recipient per conversation (refreshed once read),
-- so a burst of messages doesn't flood the bell.
create or replace function public.notify_dm() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, actor, type, entity_type, entity_id)
  select cm.user_id, new.sender, 'dm', 'conversation', new.conversation_id::text
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender
    and not exists (
      select 1 from public.notifications n
      where n.user_id = cm.user_id and n.type = 'dm'
        and n.entity_id = new.conversation_id::text and n.read = false
    );
  return new;
end; $$;
drop trigger if exists notify_dm on public.messages;
create trigger notify_dm after insert on public.messages for each row execute function public.notify_dm();
