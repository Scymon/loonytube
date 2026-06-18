-- LoonyTube — enforce the app_settings kill switches server-side. Safe to re-run.
-- Requires roles.sql (app_settings table). uploads_enabled is enforced in the
-- upload API route; signups_enabled is enforced here at the database level so it
-- holds even against a direct GoTrue signUp call that bypasses our signup page.

-- Reject new auth users while signups are disabled. BEFORE INSERT so the row
-- never persists; runs ahead of the AFTER-INSERT handle_new_user trigger.
create or replace function public.guard_signups_enabled() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((select signups_enabled from public.app_settings where id = 1), true) then
    raise exception 'Signups are currently disabled';
  end if;
  return new;
end; $$;

drop trigger if exists guard_signups_enabled on auth.users;
create trigger guard_signups_enabled before insert on auth.users
  for each row execute function public.guard_signups_enabled();
