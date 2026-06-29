-- LoonyTube — DM embed cards (internal videos + X posts). Safe to re-run.

-- 1. Add embeds column (JSONB array of embed objects).
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'embeds'
  ) then
    alter table public.messages add column embeds jsonb default null;
  end if;
end $$;

-- 2. Drop any existing non-empty body constraints so embed-only messages work.
do $$ begin
  alter table public.messages drop constraint if exists messages_nonempty;
exception when others then null; end $$;

do $$ begin
  alter table public.messages drop constraint if exists messages_body_len_chk;
exception when others then null; end $$;

do $$ begin
  alter table public.messages drop constraint if exists messages_content_chk;
exception when others then null; end $$;

-- 3. Make body nullable (for embed-only or image-only messages).
do $$ begin
  alter table public.messages alter column body drop not null;
exception when others then null; end $$;

-- 4. Replace with a single check: at least one of body/images/embeds must be present.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'messages_content_chk') then
    alter table public.messages
      add constraint messages_content_chk
      check (
        (body is not null and char_length(body) > 0)
        or (images is not null)
        or (embeds is not null)
      );
  end if;
end $$;
