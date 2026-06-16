-- LoonyTube — onboarding & social-graph migration.
-- Paste into the Supabase SQL Editor and run. Safe to re-run.

-- ---------- PROFILES: new columns ----------
alter table public.profiles add column if not exists full_name   text;
alter table public.profiles add column if not exists avatar_url  text;
alter table public.profiles add column if not exists onboarded_at timestamptz;

-- ---------- handle_new_user: safe unique username + full_name from metadata ----------
-- The chosen username is claimed by the signup flow AFTER auth (so a duplicate
-- can be reported without failing the auth signup). Here we only seed a
-- guaranteed-unique placeholder + carry full_name through from metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    'user_' || left(replace(new.id::text, '-', ''), 12),
    nullif(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------- INTERESTS catalog ----------
create table if not exists public.interests (
  slug text primary key,
  label text not null,
  sort int not null default 0
);

insert into public.interests (slug, label, sort) values
  ('gaming','Gaming',1),
  ('tech','Tech',2),
  ('music','Music',3),
  ('sports','Sports',4),
  ('comedy','Comedy',5),
  ('news','News',6),
  ('science','Science',7),
  ('design','Design',8),
  ('food','Food',9),
  ('finance','Finance',10)
on conflict (slug) do nothing;

-- ---------- PROFILE_INTERESTS (join) ----------
create table if not exists public.profile_interests (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  interest_slug text not null references public.interests(slug) on delete cascade,
  created_at    timestamptz default now(),
  primary key (profile_id, interest_slug)
);
create index if not exists profile_interests_profile_idx on public.profile_interests (profile_id);

-- ---------- FOLLOWS (social graph — subscriptions read from this later) ----------
create table if not exists public.follows (
  follower   uuid not null references public.profiles(id) on delete cascade,
  followee   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists follows_followee_idx on public.follows (followee);
create index if not exists follows_follower_idx on public.follows (follower);

-- ---------- RLS ----------
alter table public.interests         enable row level security;
alter table public.profile_interests enable row level security;
alter table public.follows           enable row level security;

-- interests: world-readable catalog (managed via SQL / service role only)
drop policy if exists "interests read" on public.interests;
create policy "interests read" on public.interests for select using (true);

-- profile_interests: each user manages their own
drop policy if exists "pi read"   on public.profile_interests;
drop policy if exists "pi insert" on public.profile_interests;
drop policy if exists "pi delete" on public.profile_interests;
create policy "pi read"   on public.profile_interests for select using (auth.uid() = profile_id);
create policy "pi insert" on public.profile_interests for insert with check (auth.uid() = profile_id);
create policy "pi delete" on public.profile_interests for delete using (auth.uid() = profile_id);

-- follows: graph is publicly readable; only the follower writes their own edges
drop policy if exists "follows read"   on public.follows;
drop policy if exists "follows insert" on public.follows;
drop policy if exists "follows delete" on public.follows;
create policy "follows read"   on public.follows for select using (true);
create policy "follows insert" on public.follows for insert with check (auth.uid() = follower);
create policy "follows delete" on public.follows for delete using (auth.uid() = follower);
