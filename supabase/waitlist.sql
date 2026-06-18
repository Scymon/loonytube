-- LoonyTube — waitlist + pre-signup invite validation. Safe to re-run.
-- Requires roles.sql (uses public.is_admin()).

-- Waitlist: emails captured when invite-only is on and a visitor has no code.
create table if not exists public.waitlist (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;

drop policy if exists "waitlist insert"     on public.waitlist;
drop policy if exists "waitlist admin read" on public.waitlist;
create policy "waitlist insert"     on public.waitlist for insert with check (true);          -- anyone (incl. anon) may join
create policy "waitlist admin read" on public.waitlist for select using (public.is_admin());  -- only admins can see the list

-- Validate an invite code WITHOUT redeeming it (callable by anonymous visitors,
-- before an account exists). Redemption still happens post-signup via redeem_invite().
create or replace function public.invite_is_valid(p_code text) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.invites
    where code = p_code
      and redeemed_by is null
      and (expires_at is null or expires_at > now())
  );
$$;
