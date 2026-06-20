# LoonyTube

A hybrid video + social platform — long-form video (YouTube-style), short text **Posts**, longform **Articles**, and real-time **Direct Messages**, all sharing one conversation model. Northwoods loon brand. Part of the **Loon Suite**; shares the **Loonatic** design system.

**Stack:** Next.js 15 (App Router, TypeScript, Tailwind) · Supabase (auth + Postgres + RLS + Realtime + Storage) · Cloudflare Stream (video ingest / transcode / adaptive CDN).

The core loop works end to end: sign up → onboarding → upload → Cloudflare transcodes → signed adaptive-bitrate playback → likes, comments, posts, threads, search, DMs, notifications, and a full creator Studio with inline upload.

---

## The content model (read this first)

LoonyTube deliberately avoids the word-overloading of Twitter ("tweet" = unit *and* reply *and* thread) and Meta Threads. **Names map to positions in a tree, not to separate types.**

```
Thread                     ← top-level container. Exists from creation.
 ├─ Post (the OP)          ← the originating content INSIDE the thread
 └─ Comment                ← continuation of that same thread
     └─ Comment            ← comments can have comments
```

- **Thread** — the wrapper / the conversation. The only thing that lives at the root. It exists the instant it's created, not once replies appear.
- **Post** — *only* ever means the Original Post: the root content of a Thread. Never a top-level object sitting "next to" Threads.
- **Comment** — a continuation node. Structurally identical to a Post (a body + owner + children), so it can itself be commented on.

Because Post and Comment are the **same shape**, every node can do everything: be liked, replied to, reposted, and quoted.

### Repost & Quote
A **Repost** re-surfaces any node back at the top level as a Post again:
- **Repost** — re-share as-is, attributed ("reposted by X"). No new body.
- **Quote** — wrap the target node inside your own new Post (your commentary is the root; the target is embedded).

Reposting/quoting a **Comment** promotes it into the top-level position, so it heads its **own** Thread — while still being a Comment in its origin. (The thread page already renders *any* node as a root, which is what makes this work.)

### Articles
**Articles are content objects, not Threads.** Longform docs with media (markdown body, cover + inline images). They:
- get their **own** feed card and reading page,
- are **commentable directly** (you don't route through a Post to comment),
- can be **embedded as an Article card** inside a shared/quoted Post.

### Comment hosts
Anything with a reading/watch surface — **Posts, Articles, Videos** — can host comments, and a Comment is **one universal node everywhere** (same like/reply/repost/quote behavior regardless of what it hangs off). This is the target end-state; see Roadmap for the unification migration.

---

## Setup

### 1. Install
```powershell
pnpm install
```

### 2. Supabase
1. Create a project at https://supabase.com.
2. **Settings → API**: copy the Project URL, `anon` key, and `service_role` key.
3. **SQL Editor**: run the migrations **in this order** (each is idempotent / safe to re-run):

   | # | File | Adds |
   |---|------|------|
   | 1 | `supabase/schema.sql` | `profiles`, `videos`, `likes`, `comments`, RLS, `handle_new_user` trigger, `increment_views` RPC |
   | 2 | `supabase/onboarding.sql` | `profiles.full_name/avatar_url/onboarded_at`, `interests`, `profile_interests`, `follows` |
   | 3 | `supabase/posts.sql` | `posts`, `post_likes`, `bookmarks`, `hashtags`, `post_hashtags`, `create_post()` RPC; `videos.category/visibility/made_for_kids` |
   | 4 | `supabase/discovery.sql` | `tag_follows` |
   | 5 | `supabase/studio.sql` | `videos.scheduled_at`, `profiles.bio`, video delete policy |
   | 6 | `supabase/profile.sql` | `profiles.banner_url/website/location/social_*`, `profiles` storage bucket + RLS |
   | 7 | `supabase/media.sql` | `media` storage bucket + RLS (custom thumbnails, article images) |
   | 8 | `supabase/roles.sql` | `profiles.role` ladder (`superadmin/admin/creator/guest`), `app_role()` / `is_admin()` / `is_superadmin()` helpers, `app_settings` singleton (feature switches) |
   | 9 | `supabase/waitlist.sql` | `invites` + `redeem_invite()` / `has_onboarding_access()` RPCs, `waitlist` table |
   | 10 | `supabase/messages.sql` | `conversations`, `conversation_members`, `messages`, `get_or_create_dm()` + `my_conversations()` RPCs, RLS via `is_conversation_member` helper |
   | 11 | `supabase/notifications.sql` | `notifications` table, DB triggers for follow / post like / video like / comment |
   | 12 | `supabase/notifications-dm.sql` | Extends notification triggers to cover DM receipt |
   | 13 | `supabase/privacy.sql` | Tightened `videos` RLS (private = owner-only), discovery filters, `cfStreamToken` / `cfSetRequireSignedURLs` helpers for signed playback |
   | 14 | `supabase/admin-switches.sql` | Enforces `signups_enabled` / `uploads_enabled` switches server-side; `guard_signups_enabled` BEFORE INSERT trigger on `auth.users` |
   | 15 | `supabase/video-field-constraints.sql` | CHECK constraints on `videos.title` / `videos.description` length |
   | 16 | `supabase/post-media-hardening.sql` | Image URL origin check + rate-limit on `create_post()` |
   | 17 | `supabase/articles.sql` | `articles` table, storage, RLS |

4. **Authentication → Providers → Email**: for fast local testing, turn **off** "Confirm email" so signups log in immediately. (Re-enable before launch.)

### 3. Cloudflare Stream
1. Enable **Stream** (Workers Paid plan, ~$5/mo entry).
2. **Account ID** — Stream page sidebar/URL.
3. **API token** — My Profile → API Tokens → "Stream" template (Edit). Copy it.
4. **Customer code** — upload a test video, open it, read `customer-XXXXXXXX.cloudflarestream.com`; `XXXXXXXX` is the code.

### 4. Env (`.env.local`, gitignored)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_STREAM_API_TOKEN=
NEXT_PUBLIC_CLOUDFLARE_STREAM_CODE=
CLOUDFLARE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=        # used for thumbnail origin check; set to http://localhost:3000 in dev
```

### 5. Run
```powershell
pnpm dev   # http://localhost:3000
```

### 6. Webhook (required for videos to become watchable)
Cloudflare transcodes asynchronously and calls `/api/stream-webhook` when ready (flips `status → ready`, stores `duration`). It can't reach `localhost`, so tunnel in dev:
```powershell
cloudflared tunnel --url http://localhost:3000   # or: ngrok http 3000
```
Then **Stream → Settings → Webhooks** → `https://<tunnel>/api/stream-webhook`.
> Stopgap without a tunnel: flip the `videos` row `status` to `ready` and set a `duration` in the Supabase table editor.

---

## What's built

### Auth & onboarding
Welcome, login (email *or* username), signup, forgot/reset password, 3-step onboarding (interests → follow suggestions → done), `/auth/callback`. Invite gate: `/signup` reads the `invite_only` flag from `app_settings` and shows an invite-code input or waitlist capture before the form if active.

### Roles & admin
**Role ladder:** `superadmin > admin > creator > guest` on `profiles.role`. Only superadmins can change roles. `SECURITY DEFINER` helpers (`app_role()`, `is_admin()`, `is_superadmin()`) enforce this at the DB layer.

**`/admin` console** (admin-gated):
- Feature switches: `signups_enabled` / `uploads_enabled` (superadmin-locked) — enforced server-side; `uploads_enabled=off` rejects `/api/upload-url` with 403; `signups_enabled=off` fires a BEFORE INSERT trigger on `auth.users` rejecting new accounts even at the GoTrue layer.
- Invite code generator (`LOON-XXXXX` codes) with one-time redemption.
- Role manager (superadmin-only).
- Waitlist viewer.

**`/settings`** — account overview, role badge, sign-out.

### Core video loop
TUS direct browser→Cloudflare upload, server-issued upload URL (`/api/upload-url`), HMAC-verified webhook status flip (`/api/stream-webhook`), `videos.duration` stored from webhook payload, adaptive-bitrate playback (orientation-aware: landscape `aspect-video`, portrait `aspect-[9/16] h-[80vh]`), views, likes, comments.

**Privacy enforcement** — `private` videos are owner-only in RLS; discovery surfaces (`home`, `search`, `hashtag`, `watch-page related`) filter to `visibility = 'public'`. Private videos get Cloudflare `requireSignedURLs` set at creation; the watch page mints a short-lived CF signed token server-side only after the RLS-gated read succeeds. `/api/video/visibility` is the only route allowed to flip visibility (updates CF first, then the DB row, so they never drift).

### Create (`/create`)
Three tabs — **Video**, **Post**, **Article** — lazy-loaded so tus-js-client only fetches when the tab is first activated.

- **Video** (`VideoComposer`) — drag-drop upload, title/description/category/visibility/not-for-kids. **Thumbnail system:** 3 auto-suggested frames captured locally from the video at 5% / 50% / 95% of duration, plus a film-icon scrubber (seeks the local video, shows live frame). Shared `ThumbnailPicker` component with the Studio edit modal. On publish, form resets immediately and a `ProcessingToast` (bottom-right corner, pulsing dot + "Processing… View" link) provides feedback.
- **Post** (`PostComposer`) — writing a Post starts a Thread; `#hashtags` parsed server-side via `create_post()` RPC.
- **Article** (`ArticleComposer`) — rich markdown editor with cover image upload.

### Social
Home feed, Thread page (`/post/[id]` — renders any node as root + "↑ View parent thread" breadcrumb when node is a comment), `/article/[id]` reading page, `/search` (videos / posts / people / tags), `/hashtag/[tag]`, follows, bookmarks, post likes.

### Direct Messages (`/messages`)
1:1 DMs with real-time updates (Supabase Realtime). Conversation list with avatar / last message / unread badge. Optimistic send, Enter-to-send, mark-read on open. `get_or_create_dm()` RPC prevents duplicate threads. Deep-link entry via `/messages?to=<userId>`. Schema supports groups (`is_group` flag) — UI is 1:1 for now.

### Notifications
DB triggers fan out a notification the instant the action happens (follow, post like, video like, comment, DM received). Nav bell dropdown shows 8 most recent with a live unread badge; opening it marks them read. Full `/notifications` page with actor avatar, message, relative time, and jump links.

### Creator Studio (`/studio`, own left sidebar + main site nav with "Studio" wordmark)
- **Dashboard** — real stats (views, published videos, followers, posts) + recent uploads list.
- **Uploads** — `StudioUploadsShell` wraps the list with an **"+ Upload video"** button that renders `VideoComposer` inline; on completion it switches back to the content list and refreshes server data. Edit modal: title, description, visibility, schedule, **thumbnail** (same `ThumbnailPicker` as upload — 3 CF auto-frames at 5/50/95% of `videos.duration` via `?time=Xs` API, scrubber over 0–100% range, custom upload).
- **Threads** — every row is a Thread; comment + like counts; view/delete.
- **Scheduler** — set planned release dates per video.
- **Edit Profile** — full-bleed cover banner + avatar (real Storage uploads to `profiles` bucket, per-user-folder RLS), display name, handle, bio, website, location, social links (X / Instagram / YouTube), sticky save bar.

---

## Architecture notes

- **`videos.id` *is* the Cloudflare Stream UID** — no mapping table.
- **RLS**: `public` ready videos are world-readable; `private` videos are owner-only; `unlisted` videos are readable by URL but excluded from all discovery surfaces. Owners see/edit/delete their own at any status. The webhook uses the **service-role** key to bypass RLS.
- **Role helpers are `SECURITY DEFINER`** — `app_role()`, `is_admin()`, `is_superadmin()`. Call these in policies and API routes rather than reading `profiles.role` directly from a client.
- **Custom thumbnails** — uploaded to the `media` bucket; URL stored on `videos.thumbnail`. The webhook fills `thumbnail` **only when empty**, so a custom thumbnail is never clobbered by the Cloudflare auto-frame fallback.
- **CF thumbnail URL format** — `?time=Xs` (seconds only). The `?time=Np` percentage syntax is undocumented and ignored by CF (returns the same default frame for every request). Use `pctToSecs(pct, duration)` to convert slider position to seconds.
- **`videos.duration`** — stored from the webhook payload. Used by the Studio edit modal scrubber to convert 0–100% to real seconds. Falls back to `pct * 1.2` when null (videos uploaded before the webhook was wired).
- **Signed playback for private videos** — `cfStreamToken()` mints a short-lived Cloudflare signed URL server-side. The token is generated *after* the RLS-gated DB read succeeds, so media access follows the same gate as the metadata.
- **`app_settings` singleton** — one row, `id = 1`. Feature switches (`signups_enabled`, `uploads_enabled`, `invite_only`) live here. `signups_enabled = false` fires a BEFORE INSERT trigger on `auth.users` rejecting accounts at the GoTrue level.
- **PostgREST embed caveat** — never rely on `profiles(...)` foreign-table embeds on `videos` or `posts`. Once `posts` linked both `videos` and `profiles` it created an ambiguous junction and embeds error. **Always fetch the author profile in a separate query by id.**
- **Threads vs Comments** — `posts` rows where `parent_id IS NULL` are Threads/Posts; rows with `parent_id` set are Comments. `create_post()` parses `#hashtags` server-side and writes to `hashtags` / `post_hashtags`.
- **DM RLS** — enforced via a `SECURITY DEFINER` membership helper (`is_conversation_member`) so policies don't recurse. Realtime respects the same RLS.
- **Storage buckets** (public, per-user-folder RLS — write only under `<uid>/...`): `profiles` (avatar / banner), `media` (thumbnails, article images).

---

## Project structure

```
src/app/
  (app)/                    # main shell: full-width top Nav + Discord-style ribbon
    page.tsx                  home feed
    create/                   Video / Post / Article tabs (lazy-loaded composers)
    watch/[id]/               video player + comments + sidebar
    post/[id]/                thread page (renders any node as root)
    article/[id]/             article reading page
    search/                   videos / posts / people / tags
    hashtag/[tag]/
    messages/                 1:1 DMs with realtime
    notifications/            full notification list
    settings/                 account + role badge + sign-out
    admin/                    feature switches, invites, role manager (admin-gated)
    upload/                   redirects → /create

  (auth)/                   # full-bleed auth + onboarding screens
    welcome/  login/  signup/  forgot-password/  reset-password/
    onboarding/  invite/  (interests → follow → done)

  studio/                   # own internal sidebar, renders the main Nav
    page.tsx                  dashboard (stats + recent uploads)
    content/                  StudioUploadsShell: inline VideoComposer + ContentTable
    posts/                    threads table
    scheduler/
    profile/

  api/
    upload-url/               server-issues TUS upload URL + creates video row
    stream-webhook/           Cloudflare HMAC webhook → flips status + stores duration
    sync-video-status/        on-demand CF status poll (used by VideoStatusPoller)
    video/visibility/         owner-only route to flip visibility + CF requireSignedURLs
    login/                    username-to-email resolution for login form

src/components/
  ThumbnailPicker.tsx         shared thumbnail selector (VideoComposer + Studio edit modal)
  ProcessingToast.tsx         fixed corner toast shown after upload completes
  Nav.tsx                     top nav: logo, search, bell dropdown, avatar menu
  AppShell.tsx                (app) layout wrapper
  Ribbon.tsx                  collapsible left ribbon
  StreamPlayer.tsx            Cloudflare Stream embed (orientation-aware sizing)
  Avatar.tsx  Logo.tsx  RoleBadge.tsx  SearchBar.tsx  LikeButton.tsx  Comments.tsx
  ProcessingWatcher.tsx       VideoStatusPoller wrapper

  create/        VideoComposer  PostComposer  ArticleComposer  CreateTabs  CreateModal
  studio/        ContentTable  StudioUploadsShell  PostsTable  Scheduler
                 ProfileEditor  StudioShell  VideoStatusPoller
  messages/      Messenger  Thread
  notifications/ NotificationBell  NotificationList
  home/          HeroFeature  RealShelf  CategoryShelf  PostCard  VideoRow  (+ stubs)
  discovery/     FollowTagButton  FollowUserButton  ResultCards
  post/          PostActions  PostImages  ReplyBox
  auth/          LoginForm  SignupForm  SignupFlow  AuthHero  InviteFront  (+ helpers)
  onboarding/    InterestPicker  FollowList  AllSet  InviteGate
  admin/         AdminSwitches  InviteManager  RoleManager
  settings/      SignOutButton

supabase/        17 migrations (see Setup table)
src/lib/         supabase/server · supabase/client · format · cloudflare · notif · upload-limits
```

---

## Roadmap

1. ✅ Thread-model alignment — vocabulary + any-node-as-root thread page.
2. ✅ Custom thumbnails — real uploads at create + in Studio.
3. ✅ Roles + admin console — role ladder, feature switches, invite gate, waitlist.
4. ✅ DMs — 1:1 realtime messaging.
5. ✅ Notifications — DB-triggered, bell dropdown, full page.
6. ✅ Privacy enforcement — RLS tightening, CF signed playback, visibility API.
7. ✅ Admin switch enforcement — uploads + signups kill switches enforced server-side.
8. ✅ Thumbnail system unification — shared `ThumbnailPicker`, Studio inline upload, post-upload toast.
9. **Public channel page** (`/@handle`) — banner/avatar/bio/socials/follow; unblocks all "view channel" links. *(next P1)*
10. **Comment unification + Repost/Quote** — converge video comments onto `posts` nodes (one universal Comment), add `host_type/host_id`, `reposts` table, feed/thread union. *(migration required)*
11. **Monetization tier system** — platform-level toggle (off / tiers_active / legacy). Two models under consideration (see featurelist §10a): recurring tiers ($2 commenter / $5 creator) vs. freemium + one-time creator activation ($5). Stripe integration, role-sync webhook, Studio monetization settings.
12. **Articles** — own table, own feed card, reading page with comments; embeddable as Article card in a Post.
13. Scheduled-release enforcement, explore page, live streaming (CF Stream Live + chat).

### Known follow-ups
- Private video thumbnails from CF also require signing (auto-generated frames); owner may see a broken thumbnail in Studio. Custom-uploaded thumbnails are unaffected.
- Revert-to-auto thumbnail control (CF auto URL is deterministic from `videos.id`).
- Webhook `Webhook-Signature` HMAC verification — the secret is wired but verification is currently skipped.
- Videos uploaded before the webhook was registered will have `duration = null`; the Studio scrubber falls back to `pct × 1.2`.
