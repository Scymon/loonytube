-- LoonyTube — brand theme overrides (safe to re-run).
-- Stores the Styleguide tab's token overrides. NULL = stock Loonatic theme.
-- Values are validated server-side (hex allow-list) before being emitted as
-- CSS variables in the root layout.

alter table public.site_config
  add column if not exists theme jsonb;

comment on column public.site_config.theme is
  'Brand overrides: { colors: { token: "#hex" }, gradPrimary: ["#hex","#hex"], font: "system|humanist|geometric|serif" }. NULL = defaults.';
