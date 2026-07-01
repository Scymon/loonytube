-- Add ribbon_fixed_hidden column to site_config
-- Stores an array of fixed-item labels that the admin has toggled off
-- e.g. '["Saved","Explore"]'
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS ribbon_fixed_hidden jsonb NOT NULL DEFAULT '[]'::jsonb;
