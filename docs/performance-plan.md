# LoonyTube — Performance Plan (load quick, feel smooth)

*Written 2026-07-01. Companion to `architecture-plan.md`. Ordered by user-visible impact per unit of work. Every claim below was verified against the code, not assumed.*

---

## P0 — Kill the server waterfalls *(biggest TTFB win, `fixes` branch)*

Server pages run Supabase queries **sequentially**; each is a network round-trip from Vercel to Supabase (~20–80 ms each).

- **`watch/[id]/page.tsx` — ~10 sequential awaits**: live check → video → `auth.getUser()` → channel → `cfStreamToken()` → related → follows → suggested → trending tags. After the `video` row arrives, *everything else is independent* and belongs in one `Promise.all`. Expected: watch TTFB drops by roughly the sum of 7 round-trips.
- **`(app)/page.tsx` (home) — ~8 sequential blocks**, only two already parallelized. Hero, feed, latest post, latest article, categories are independent.
- Same review for `[handle]`, `explore`, `dashboard` after the big two.

**Pattern:** fetch the one row that gates 404/redirect first, then `Promise.all` the rest.

## P1 — Stop paying a Supabase auth round-trip on every request *(middleware)*

`src/middleware.ts` → `updateSession()` → `await supabase.auth.getUser()` — a **network call to Supabase Auth on every matched request**, and the matcher only excludes `_next/static`, `_next/image`, `favicon.ico`, and the stream webhook. Every page nav, every API call, every file in `/public` (logo, onboarding images) pays it.

1. Exclude static assets by extension in the matcher: `"/((?!_next/static|_next/image|favicon.ico|api/stream-webhook|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|woff2?)$).*)"`.
2. Then evaluate replacing per-request `getUser()` with local JWT verification (`supabase.auth.getClaims()` with asymmetric signing keys enabled in the Supabase dashboard) — validates the session without a network hop, refreshing only near expiry. This is the single largest per-navigation latency line item after P0.

## P2 — Cache the layout config *(2 queries on every navigation)*

`(app)/layout.tsx` fetches `app_settings` + `site_config` on **every request** (all pages are `force-dynamic`). Site name, logo, nav slots, and ribbon shortcuts change ~never. Wrap both reads in `unstable_cache(..., { revalidate: 60, tags: ["site-config"] })` and call `revalidateTag("site-config")` from the admin console save paths. Same treatment later for trending tags on watch (a 200-row scan per watch view).

## P3 — Right-size and lazy-load images

- Cloudflare thumbnails accept size params, but almost nowhere are they used: the home grid loads default-size frames (1280 px+), and `ContentTable` requests `height=720` for a ~64 px-tall table cell. Add `width=320` (cards) / `width=640` (hero) at URL-construction time — one helper in `lib/cloudflare.ts`.
- Only **2** `loading="lazy"` attributes exist in the whole app. Add `loading="lazy" decoding="async"` to every below-fold `<img>` (shelf cards, sidebar thumbs, avatars in lists) and `fetchpriority="high"` on the LCP image (home hero / watch poster).
- `next/image` migration is *not* required for this win; URL params + lazy attrs get ~90 % of it with zero risk.

## P4 — Perceived smoothness

- **`(app)/template.tsx` remounts a 120 ms opacity fade on every navigation.** With the new route-level skeletons (added today), the fade now *delays* perceived paint instead of masking a blank screen. Recommend deleting the template (or dropping to 50–60 ms) — navigation will feel immediately snappier.
- Keep `Link` prefetch defaults (already on).
- The reduced-motion CSS added today already prevents animation jank for those users.

## P5 — Client bundle trims

- **`hls.js` (+ `@types/hls.js`) is in `package.json` but imported nowhere** (verified by grep — the Cloudflare `<Stream>` component and raw iframes handle playback). Remove both (`chore` branch, run `pnpm install`, commit lockfile).
- `Ribbon.tsx` (562-line client component) ships on every page; the network-carousel and settings panels can become `next/dynamic` imports when it gets split in architecture-plan Phase 4.
- Watch for `"use client"` creep: server-render display components, keep interactivity in leaves.

## P6 — Database-side (verify in Supabase dashboard, not this repo)

Confirm indexes exist for the hot query shapes: `comments(video_id, created_at)`, `videos(status, visibility, created_at)`, `videos(owner)`, `follows(follower)`, `post_hashtags(tag)`. Any of these missing turns P0's parallel queries into parallel *slow* queries. Check the Supabase query-performance page after P0 ships.

---

## Suggested order & measurement

1. P4 template removal + P5 hls.js removal — trivial, immediate feel win.
2. P0 watch page, then home — measure TTFB before/after in Vercel analytics (or `curl -w "%{time_starttransfer}"` against the preview URL).
3. P1 matcher fix (safe) → P1 getClaims (needs a dashboard setting + test).
4. P2 layout cache, P3 image sizing.
5. P6 index audit once real traffic data exists.

**Baseline first:** capture Lighthouse (mobile) + Vercel Speed Insights for `/`, `/watch/[id]`, `/explore` before starting, so each phase shows its receipt.
