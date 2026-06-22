-- Add notification-level preference to follows.
-- Values: 'all' | 'personalized' | 'none'  (YouTube-style bell)
-- Default 'all' so existing follows keep the behaviour they had.

alter table public.follows
  add column if not exists notif_level text not null default 'all'
  check (notif_level in ('all', 'personalized', 'none'));
