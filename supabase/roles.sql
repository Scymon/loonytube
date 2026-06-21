-- LoonyTube — user roles, app settings (feature switches), and invite-only onboarding.
-- Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- Roles on profiles: superadmin > admin > creator > guest
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists role text not null default 'creator';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_chk') then
    alter table public.profiles add constraint profiles_role_chk
      check (role in ('superadmin','admin','creator','guest'));
  end if;
end $$;

-- SECURITY DEFINER helpers read profiles bypassing RLS, so policies that need the
-- caller's role don't recurse. auth.uid() is NULL in the SQL editor / service role.
create or replace function public.app_role() returns text
  language sql security definer stable set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select coalesce((select role in ('admin','superadmin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_superadmin() returns boolean
  language sql security definer stable set search_path = public as $$
  select coalesce((select role = 'superadmin' from public.profiles where id = auth.uid()), false);
$$;

-- Guard: a non-superadmin can never change a role (incl. their own). Service/SQL
-- editor (auth.uid() IS NULL) is trusted, so the bootstrap UPDATE below works.
create or replace function public.guard_profile_role() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_superadmin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Superadmins may update any profile (role management UI).
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update using (public.is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- App settings: a single row of top-level feature switches
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  invite_only      boolean not null default false,
  signups_enabled  boolean not null default true,
  uploads_enabled  boolean not null default true,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles(id)
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;
alter table public.app_settings enable row level security;

drop policy if exists "settings read"   on public.app_settings;
drop policy if exists "settings update" on public.app_settings;
create policy "settings read"   on public.app_settings for select using (true);          -- app reads flags
create policy "settings update" on public.app_settings for update using (public.is_admin());

-- invite_only is a SUPERADMIN-only switch (admins can flip the others).
create or replace function public.guard_app_settings() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.invite_only is distinct from old.invite_only and auth.uid() is not null and not public.is_superadmin() then
    new.invite_only := old.invite_only;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists guard_app_settings on public.app_settings;
create trigger guard_app_settings before update on public.app_settings
  for each row execute function public.guard_app_settings();

-- ─────────────────────────────────────────────────────────────────────────────
-- Invites (parallel onboarding funnel)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.invites (
  code        text primary key,
  created_by  uuid references public.profiles(id),
  email       text,
  note        text,
  redeemed_by uuid references public.profiles(id),
  redeemed_at timestamptz,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);
alter table public.invites enable row level security;

drop policy if exists "invites admin read"   on public.invites;
drop policy if exists "invites admin insert" on public.invites;
drop policy if exists "invites admin delete" on public.invites;
create policy "invites admin read"   on public.invites for select using (public.is_admin());
create policy "invites admin insert" on public.invites for insert with check (public.is_admin());
create policy "invites admin delete" on public.invites for delete using (public.is_admin());

-- Atomic redemption (bypasses RLS so a guest can redeem without listing invites).
create or replace function public.redeem_invite(p_code text) returns boolean
  language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  update public.invites
     set redeemed_by = auth.uid(), redeemed_at = now()
   where code = p_code
     and redeemed_by is null
     and (expires_at is null or expires_at > now())
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

-- Does the current user have onboarding access? (invite_only off OR they redeemed one)
create or replace function public.has_onboarding_access() returns boolean
  language sql security definer stable set search_path = public as $$
  select (not coalesce((select invite_only from public.app_settings where id = 1), false))
      or exists (select 1 from public.invites where redeemed_by = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- BOOTSTRAP: make yourself the first superadmin (run once; replace the handle).
-- Works from the SQL editor because auth.uid() is NULL there (trusted context).
-- ─────────────────────────────────────────────────────────────────────────────
-- update public.profiles set role = 'superadmin' where id = '<your-user-id>';
-- WARNING: use your UUID from auth.users, NOT your username.
-- A malicious user could register the username before you run this.
