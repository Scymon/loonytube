-- Add visual page builder blocks column to pages table (safe to re-run).
-- Run in Supabase SQL Editor after cms.sql has already been applied.

alter table public.pages
  add column if not exists blocks jsonb not null default '[]'::jsonb;

comment on column public.pages.blocks is
  'JSON array of visual page-builder blocks. Supersedes the body text field for visual pages.';
