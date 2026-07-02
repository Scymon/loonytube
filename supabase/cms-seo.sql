-- LoonyTube — CMS SEO fields (safe to re-run).
-- Adds per-page SEO description + social share image, read by generateMetadata
-- in /p/[slug] and by the sitemap.

alter table public.pages
  add column if not exists description text,
  add column if not exists og_image_url text;

comment on column public.pages.description is
  'SEO meta description / link-preview text (aim for <= 160 chars).';
comment on column public.pages.og_image_url is
  'Absolute URL used as og:image / twitter:image for link previews.';
