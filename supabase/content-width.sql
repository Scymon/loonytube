-- Add full_width setting to app_settings
-- true  = Full Width (content stretches to fill the window)
-- false = Readable Width (content capped at 1440px, centred)
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS full_width boolean NOT NULL DEFAULT true;
