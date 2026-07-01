-- Navigation slot overrides: reassign the 3 non-fixed nav slots (explore, threads, dashboard)
ALTER TABLE site_config
  ADD COLUMN IF NOT EXISTS nav_slot_overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ribbon_shortcuts   JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_sections    JSONB NOT NULL DEFAULT '[]'::jsonb;
