# Changelog

All notable changes to **LoonyTube**. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
Entries are milestone deliveries, newest first. Each lists the delivery zip(s) and any required SQL migration.

---

## [Unreleased] — next up
- **Public channel page** (`/@handle`). Surfaces banner/avatar/bio/socials; gives follow-notifications, the "People you might like" rail, and a profile **Message** button real destinations. *(keystone — unblocks several pending links)*
- **Step 3 — Comment unification + Repost/Quote.** Converge video comments onto `posts` nodes (one universal Comment node), add `host_type`/`host_id`, add a `reposts` table, and wire repost/quote actions + the feed/thread union. *(carries a migration)*
- **Monetization tier system.** Platform-level toggle (off / tiers_active / legacy). Two competing models in featurelist §10a: recurring tiers ($2 commenter / $5 creator) vs freemium + one-time creator activation ($5). Stripe integration, role-sync webhook, Studio monetization settings. *No migration until model is chosen.*

---

## [0.16] Watch page overhaul + Playlists + Infinite queue + Live streaming — 2026-06-29
_No migration required_

### Added
- **Watch page overhaul** (`WatchLayout`, `WatchPlayer`, `WatchMeta`, `WatchSidebar`, `WatchIcons`) — full rewrite of the watch experience. Theatre mode with lights-out, fill/crop toggle, and persistent mode preference. Portrait video detection from poster thumbnail with height-capped container. Prev/Next navigation with double-tap-to-go-back behaviour. Autoplay countdown (5 s). Sidebar open/collapsed state persisted via `localStorage`.
- **Volume slider** — added to both `WatchPlayer` and `DashHero`.
- **Infinite queue** (`/api/queue/refill`) — returns up to 20 video IDs. Context-aware: `home` serves subscriptions first then trending; `profile` serves liked videos first; all others get shuffled trending. Exclude list (last 50 played) prevents re-serving recently watched content. `WatchLayout` prefetches when within 2 videos of the end.
- **Playlist system** — `PlaylistModal`, `/api/playlists` (GET/POST), `/api/playlists/[id]/items` (POST), `PlaylistClient`, `/playlist/[id]/page.tsx`. Users can create playlists, add videos, and play a playlist from its page. Playlist items feed directly into the play queue via `usePlayQueue`.
- **`usePlayQueue` hook** — shared queue state backed by `localStorage`. Supports addToQueue, addToQueueNext, shiftQueue, moveUp/Down, clearQueue.
- **Live streaming** — `/studio/live` creation page, `/api/live/create` route, `StreamPlayer` component, `LiveStreamsTable` in Studio. Live streams are routed through the watch page by ID; active streams show a LIVE badge and the Cloudflare Stream player.
- **`PlayerContextMenu`** — right-click context menu on the video player.

### Changed
- **DashHero playlist mode** — ambient overlay title link now correctly points to the currently playing video (`currentVideo?.id`) in both ambient and theatre modes.
- **Controls auto-hide** — fixed on unpause and mouse-leave in `WatchPlayer` and `DashHero`.
- **Video progress reset** — resets to 0 on completion so the next play always restarts from the beginning.
- **`resumePointRef` sync** — synced on unmute so theatre mode always resumes from the correct position.
- **Teal glow** applied consistently to all nav icons including the notification bell; lights-out overlay correctly dims the nav bar.
- **StreamPlayer import** — fixed missing import on live stream watch page and live stream routing.
- **Ribbon playlists section** — replaced "Playlists coming soon." stub with a link to the live Playlists page.

---

## [0.15] Thumbnail system unification + Studio upload flow — 2026-06-20
_No migration required_

### Added
- **`ThumbnailPicker` shared component** (`src/components/ThumbnailPicker.tsx`) — single component used by both VideoComposer and the ContentTable edit modal. Owns the 4-pane selector grid, film-icon scrubber toggle, 16:9 preview container, scrubber panel, and custom upload button. Data source differences handled via render props (`previewContent`, `scrubberContent`).
- **`StudioUploadsShell`** (`src/components/studio/StudioUploadsShell.tsx`) — wraps `/studio/content`. Adds an "+ Upload video" button that renders `VideoComposer` inline in the Studio, then switches back to the content list on completion and calls `router.refresh()` to surface the new row.
- **`ProcessingToast`** (`src/components/ProcessingToast.tsx`) — fixed bottom-right corner toast shown after upload. Pulsing blue dot + "Processing… View" link (→ `/studio/content`) + ✕. Auto-dismisses after 8 s.

### Changed
- **VideoComposer post-upload flow** — removed the full done screen and the Cloudflare status-polling loop. On upload success the form now resets to blank immediately and fires `onComplete(videoId)` to the parent. `CreateTabs` and `StudioUploadsShell` both show `ProcessingToast` in response.
- **Cloudflare thumbnail URL format** — fixed `cfThumb` in ContentTable from `?time=Np` (invalid, CF ignores it and returns the same default frame for every request) to `?time=Xs` (seconds). This was the root cause of all 3 suggestion panes showing identical images and the scrubber appearing frozen.
- **`pctToSecs(pct, duration)`** helper — converts 0–100 slider percentage to real seconds using `videos.duration`. Falls back to `pct * 1.2` when duration is null.
- **`duration` added to Studio content query** — `page.tsx` selects and maps it through the `Row` type so `pctToSecs` has real data from the DB.
- **Scrubber preview freeze fixed** — removed the `scrubDisplaySrc ?? cfThumb(...)` short-circuit bug: once `scrubDisplaySrc` was non-null the `??` operator swallowed all subsequent slider changes. Preview src is now computed inline; `key={src}` on `<img>` forces remount on each URL change.
- **`CreateTabs`** — wired `onComplete` → `processingId` → `ProcessingToast`. Tab stays open after upload so the user can immediately start another.

### Removed
- `uploadedId / uploadedTitle / uploadedThumb / uploadedStatus` states from VideoComposer.
- Cloudflare status-polling `useEffect` from VideoComposer.
- Done screen (`if (uploadedId) { return <...> }`) from VideoComposer.
- `FILM_ICON` SVG and `thumbFileInput` ref from VideoComposer and ContentTable (now owned by `ThumbnailPicker`).
- Percentage labels overlaid on thumbnail suggestion panes.

---

## [0.14] Admin switch enforcement — 2026-06-18
_`loonytube-admin-switches.zip` · migration: `admin-switches.sql`_

The `signups_enabled` / `uploads_enabled` switches were editable in the admin console but checked nowhere. Now enforced server-side.

### Fixed
- **Uploads kill switch** — `/api/upload-url` rejects with `403` when `uploads_enabled` is off, before any Cloudflare URL or video row is created. Admins bypass it (via `is_admin()`) so they can still operate while public uploads are paused.
- **Signups kill switch** — enforced at the database layer: a `BEFORE INSERT` trigger on `auth.users` (`guard_signups_enabled`) rejects new accounts when `signups_enabled` is off, so even a direct GoTrue `signUp` that skips the page fails. The `/signup` page also renders a clean "Sign-ups are paused" state.

---

## [0.13] Video privacy enforcement — 2026-06-18
_`loonytube-privacy.zip` · migration: `privacy.sql`_

Ready videos were readable and streamable regardless of `visibility`, and playback was unsigned. Privacy now holds at every layer.

### Fixed
- **`videos read` RLS** tightened: `private` rows are owner-only; `public`/`unlisted` remain readable once ready.
- **Discovery filters** — home hero/feed/category shelves, search, hashtag feeds, and the post-page "more from creator" rail now require `visibility = 'public'`, so `unlisted` and `private` never leak into discovery.
- **Cloudflare signed playback for private videos** — created with `requireSignedURLs` (TUS metadata); the watch page mints a short-lived signed token server-side **only after** the RLS-gated read succeeds, so the media itself (not just the DB row) is protected.

### Added
- `src/lib/cloudflare.ts` (`cfStreamToken`, `cfSetRequireSignedURLs`).
- `/api/video/visibility` — owner-only route that flips Cloudflare's `requireSignedURLs` **first**, then updates the row, so visibility and media protection never drift. Studio's visibility edits route through it.

### Known follow-up
- A private video's **auto-generated** Cloudflare thumbnail also requires signing, so the owner may see a broken thumb in Studio (custom uploaded thumbnails are unaffected). Cosmetic, owner-only.

---

## [0.12] Nav search — mobile + covert polish — 2026-06-18
_`loonytube-mobile-search.zip`, `loonytube-search-autofill.zip`, `loonytube-search-autofill-font.zip` · no migration_

### Fixed
- The covert search field was `hidden … md:flex`, so it was missing on mobile. It now renders at every breakpoint, filling the space between the logo and the magnifier exactly as on desktop.
- Suppressed Chromium's autofill paint on the covert field (`#nav-search`): the pale box and black text are gone (deferred background animation + `-webkit-text-fill-color`), and the autofill/autocomplete **preview** now stays 18px cyan instead of dropping to the browser default. Native autocomplete suggestions are untouched.

---

## [0.11] Notifications — 2026-06-18
_`loonytube-notifications.zip` (migration: `notifications.sql`) · `loonytube-dm-notif-dropdown.zip` (migration: `notifications-dm.sql`)_

### Added
- **Trigger-generated notifications** — DB triggers fan out a notification the instant the underlying action happens (follow, post like, video like, comment on a thread, comment on a video), so they can't be forged by clients and fire regardless of surface. Self-actions are skipped.
- **`/notifications` page** — actor avatar + message + relative time, unread highlight, mark-all-read on open, realtime prepend. Links to the relevant `/post/[id]` or `/watch/[id]`.
- **Nav bell** (was "coming soon") — now a **dropdown** previewing the 8 most recent notifications with a live unread badge; "See all" / "Open notifications" link to the full page. Opening it marks read and clears the badge.
- **DM notifications** — a new message fans out a `dm` notification (deduped to one unread per conversation). Opening the conversation clears it; the bell links to `/messages?to=<sender>`.
- Shared `src/lib/notif.ts` (`NOTIF_VERB`, `notifHref`) so the dropdown and full page render identically.

---

## [0.10] Direct Messages — 2026-06-18
_`loonytube-dms.zip` · migration: `messages.sql`_

### Added
- **1:1 DMs** at `/messages` (chat icon in the nav, was "coming soon"): conversation list with avatar/last-message/unread badge, realtime thread with optimistic send, Enter-to-send, mark-read, and a people-search to start new conversations.
- **`get_or_create_dm()`** RPC (finds-or-creates a 1:1, no duplicate threads) and **`my_conversations()`** RPC (one-call list with the other participant + last message + unread count).
- Deep-link entry `/messages?to=<userId>` to open or start a DM (one-liner for a future profile "Message" button).

### Security
- RLS via a `SECURITY DEFINER` membership helper (`is_conversation_member`) so policies don't recurse; you can only read/send in conversations you belong to. Realtime respects the same RLS. Schema supports groups (`is_group` + multi-member); UI is 1:1.

---

## [0.9] Roles, admin console & invites — 2026-06-17
_`loonytube-roles-admin.zip` + `loonytube-admin-saved.zip` (migration: `roles.sql`) · `loonytube-invite-gate.zip` (migration: `waitlist.sql`)_

### Added
- **Role ladder** — `superadmin > admin > creator > guest` on `profiles.role`, guarded so only a superadmin can change roles. `SECURITY DEFINER` helpers `app_role()` / `is_admin()` / `is_superadmin()`.
- **`/settings`** — account, role badge, sign-out, and an Admin card for admins.
- **`/admin` console** (gated) — feature switches (`invite_only` superadmin-locked), invite generator (`LOON-XXXXX` codes), role manager (superadmin-only), and a waitlist viewer. Instant-save with a transient "Saved ✓ / Created ✓" flash.
- **Invite + waitlist funnel** — `app_settings` singleton, `invites` table + `redeem_invite()` / `has_onboarding_access()`, and a `waitlist` table. `/signup` reads `invite_only` and front-loads an invite-code **or** waitlist capture before the form; off = normal signup.

---

## [0.8] Custom thumbnails — 2026-06-16
_`loonytube-thumbnails.zip` · migration: `media.sql`_

### Added
- Real **custom video thumbnails** (YouTube-style — any image, not just a video frame). Uploaded to a new public `media` Storage bucket and stored on `videos.thumbnail`, which every card / watch / dashboard surface already reads.
- Thumbnail uploader on the **Create → Video** form (live 16:9 preview; URL carried through at publish).
- Thumbnail uploader in **Studio → Uploads → Edit** (uploads + previews instantly; persists on Save; works on already-published videos).

### Changed
- `/api/upload-url` accepts an optional `thumbnail` and stores it on the video row at insert.

### Fixed
- Stream webhook no longer overwrites `thumbnail` on every callback — it now fills it **only when empty**, so a custom thumbnail is never clobbered when transcoding finishes. Cloudflare's auto-frame remains the fallback.

---

## [0.7] Thread-model alignment — 2026-06-16
_`loonytube-thread-model.zip` · no migration_

Codifies the content philosophy: **names are positions, not types.** `Thread` = top-level wrapper (exists from creation), `Post` = the Original Post inside it, `Comment` = continuation. (See README → "The content model.")

### Changed
- **Create**: removed the separate multi-part "Thread" composer. Tabs are now **Video / Post**; writing a Post starts a Thread.
- **Studio**: "Posts" → **Threads**. Every row is a thread (removed the Post-vs-Thread toggle and Type column); count column is **Comments**.
- **Thread page** (`/post/[id]`): now renders **any node as a root** (hand it a comment id → it heads its own thread), shows a **"↑ View parent thread"** breadcrumb when the node is itself a comment, labels children as **Comments**, and gives each comment a **"View thread →"** link. *(Foundation for repost-a-comment.)*
- Relabeled "Replies" → **Comments** across the post actions and reply box.

---

## [0.6] Nav avatar fix — 2026-06-16
_`loonytube-nav-avatar-fix.zip` · no migration_

### Fixed
- The top-right dropdown avatar was rendering the initial fallback because Nav fetched `username/full_name` but not `avatar_url`. It now loads and shows the real avatar, matching the sidebar / posts / uploads.

---

## [0.5] Edit Profile — 2026-06-16
_`loonytube-edit-profile.zip` · migration: `profile.sql`_

### Added
- Full **Edit Profile** page matching the mockup: full-bleed cover banner, avatar with camera-button uploader, Display Name, Handle, Bio, Website, Location, social links (X / Instagram / YouTube), sticky Discard/Save bar.
- **Real image uploads** for avatar + banner to a public `profiles` Storage bucket (per-user-folder RLS).
- New profile fields: `banner_url`, `website`, `location`, `social_x/instagram/youtube`.
- **Edit Profile** link in the avatar dropdown.

### Changed
- Studio now renders the **main site nav** (consistent top bar) with a **"Studio"** wordmark after the logo, replacing the earlier slim custom header.

---

## [0.4] Creator Studio — 2026-06-16
_`loonytube-studio.zip` · migration: `studio.sql`_

### Added
- **Creator Studio** (`/studio`) with its own internal left sidebar:
  - **Dashboard** — real stats (views, published, followers, posts) + recent uploads.
  - **Uploads** — editable table (title, description, visibility, schedule, delete).
  - **Posts/Threads** — table with comment + like counts.
  - **Scheduler** — set planned release dates per video.
  - **Edit Profile** — initial version (name, handle, bio, avatar URL).
- `videos.scheduled_at`, `profiles.bio`; video delete policy; back-fills the video metadata columns so Studio is self-sufficient.
- "Creator Studio" link in the avatar dropdown.

---

## [0.3] Player & watch regression fixes — 2026-06
_`loonytube-watch-fix.zip`, `loonytube-player-fix.zip` · no migration_

### Fixed
- **Watch page "Video not found"**: adding `posts` made `videos↔profiles` an ambiguous PostgREST junction, breaking the `profiles(...)` embed. Decoupled the query to fetch the author separately. **Rule: never rely on `profiles(...)` embeds — fetch by id.**
- **Vertical/shorts overflow**: the Stream library's responsive container forced native aspect ratio (9:16 ≈ 178% tall). Rewrote `StreamPlayer` to detect orientation and bound the player (landscape `aspect-video`, portrait `aspect-[9/16] h-[80vh]`).

---

## [0.2] Brand, ribbon, discovery, posts, home — 2026-06
_`loonytube-posts.zip` (+`posts.sql`), `loonytube-discovery.zip` (+`discovery.sql`), `loonytube-home-cleanup.zip`, `loonytube-ribbon.zip`, `loonytube-logo.zip`_

### Added
- **Loon Posts** keystone: `/create` Post/Thread composers, `/post/[id]` detail with likes/bookmarks/replies + sidebar, real post cards. `posts`, `post_likes`, `bookmarks`, `hashtags`, `post_hashtags`, `create_post()` RPC (server-side `#hashtag` parsing); `videos.category/visibility/made_for_kids`.
- **Discovery**: `/search` (videos/posts/people/tags) and `/hashtag/[tag]` with follow buttons; `tag_follows`.
- **Discord-style ribbon**: full-width topbar; the loon logo opens a collapsible left ribbon (`AppShell` + `Ribbon`), customizable sections.
- Real **loon logo** replacing the placeholder mark.

### Changed
- Home feed: removed all fake/seed data — real videos + latest post, with labeled "coming soon" placeholders where there's nothing yet.

---

## [0.1] Core loop + onboarding — 2026-06
_`loonytube-onboarding.zip` (+`onboarding.sql`), `loonytube-home-nav.zip` · base: `schema.sql`_

### Added
- End-to-end video loop: signup → TUS direct browser→Cloudflare upload → transcode → HMAC webhook → `ready` → adaptive-bitrate playback → feed → likes / comments / views.
- Auth + onboarding: welcome, login (email *or* username), signup, forgot/reset password, 3-step onboarding (interests → follow → done), `/auth/callback`.
- App shell (top Nav) + home feed.
- Base schema: `profiles`, `videos`, `likes`, `comments`, RLS, `handle_new_user` trigger, `increment_views` RPC; `follows`, `interests`, `profile_interests`.