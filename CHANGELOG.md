# Changelog

All notable changes to **LoonyTube**. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).
Entries are milestone deliveries, newest first. Each lists the delivery zip(s) and any required SQL migration.

---

## [Unreleased] — next up
- **Step 3 — Comment unification + Repost/Quote.** Converge video comments onto `posts` nodes (one universal Comment node), add `host_type`/`host_id`, add a `reposts` table, and wire repost/quote actions + the feed/thread union. *(carries a migration)*
- Then: **Articles**, **public channel page** (`/@handle`), scheduled-release enforcement, notifications, explore, live streaming.

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
