-- LoonyTube — Articles: longform content with embedded media. Safe to re-run.
-- Body is stored as an ordered list of blocks (text / image) in JSONB, so media
-- embeds inline without needing a markdown parser.

create table if not exists public.articles (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  cover_url  text,
  blocks     jsonb not null default '[]'::jsonb,   -- [{type:'text',value} | {type:'image',url}]
  created_at timestamptz not null default now()
);
create index if not exists articles_owner_idx on public.articles(owner, created_at desc);

alter table public.articles enable row level security;
drop policy if exists "articles read"   on public.articles;
drop policy if exists "articles insert" on public.articles;
drop policy if exists "articles update" on public.articles;
drop policy if exists "articles delete" on public.articles;
create policy "articles read"   on public.articles for select using (true);                 -- public for v1
create policy "articles insert" on public.articles for insert with check (owner = auth.uid());
create policy "articles update" on public.articles for update using (owner = auth.uid());
create policy "articles delete" on public.articles for delete using (owner = auth.uid());
