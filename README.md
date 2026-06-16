# LoonyTube

A hybrid video + social platform — long-form video (YouTube-style), short text **Posts**, and longform **Articles**, all sharing one conversation model. Northwoods loon brand. Part of the **Loon Suite**; shares the **Loonatic** design system.

**Stack:** Next.js 15 (App Router, TypeScript, Tailwind) · Supabase (auth + Postgres + RLS + Storage) · Cloudflare Stream (video ingest / transcode / CDN).

The core loop works end to end: sign up → onboarding → upload → Cloudflare transcodes → adaptive-bitrate playback → likes, comments, posts, threads, search, and a full creator Studio.

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
   | 4 | `supabase/discovery.sql` | `tag_follows` (only needed for Follow #tag) |
   | 5 | `supabase/studio.sql` | `videos.scheduled_at`, `profiles.bio`, back-fills video metadata cols, video delete policy |
   | 6 | `supabase/profile.sql` | `profiles.banner_url/website/location/social_*`, **`profiles` storage bucket** + RLS |
   | 7 | `supabase/media.sql` | **`media` storage bucket** + RLS (custom thumbnails; future article images) |

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
```

### 5. Run
```powershell
pnpm dev   # http://localhost:3000
```

### 6. Webhook (required for videos to become watchable)
Cloudflare transcodes asynchronously and calls `/api/stream-webhook` when ready (flips status → `ready`). It can't reach `localhost`, so tunnel in dev:
```powershell
cloudflared tunnel --url http://localhost:3000   # or: ngrok http 3000
```
Then **Stream → Settings → Webhooks** → `https://<tunnel>/api/stream-webhook`.
> Stopgap without a tunnel: flip the `videos` row `status` to `ready` in the Supabase table editor.

---

## What's built

**Auth & onboarding** — welcome, login (email *or* username), signup, forgot/reset password, 3-step onboarding (interests → follow suggestions → done), `/auth/callback`.

**Core video loop** — TUS direct browser→Cloudflare upload, server-issued upload URL, webhook status flips, adaptive-bitrate playback (orientation-aware player: landscape vs. portrait/shorts), views, likes, comments.

**Create** (`/create`) — **Video** (drag-drop, category, visibility, not-for-kids, **custom thumbnail upload**) and **Post** (writing a Post starts a Thread).

**Social** — home feed, Thread page (`/post/[id]`, renders any node as root + parent breadcrumb + comments), `/search` (videos/posts/people/tags), `/hashtag/[tag]`, follows, bookmarks.

**Creator Studio** (`/studio`, own sidebar; uses the main site nav with a "Studio" wordmark) —
- **Dashboard** — real stats + recent uploads.
- **Uploads** — editable table: title, description, visibility, schedule, **custom thumbnail**, delete.
- **Threads** — every row is a thread; comment + like counts; view/delete.
- **Scheduler** — set planned release dates per video.
- **Edit Profile** — cover banner + avatar (real Storage uploads), display name, handle, bio, website, location, social links (X/Instagram/YouTube), sticky save bar.

---

## Architecture notes

- **`videos.id` *is* the Cloudflare Stream UID** — no mapping table.
- **RLS**: ready videos world-readable; owners see/edit/delete their own at any status. The webhook uses the **service-role** key to bypass RLS.
- **Custom thumbnails**: uploaded to the `media` bucket; URL stored on `videos.thumbnail` (which every card/watch surface reads). The webhook only fills `thumbnail` **when it's empty**, so a custom thumbnail is never clobbered when transcoding finishes. Cloudflare's auto-frame is the fallback.
- **Storage buckets** (public, per-user-folder RLS — write only under `<uid>/...`): `profiles` (avatar/banner), `media` (thumbnails, future article images).
- **PostgREST embed caveat**: never rely on `profiles(...)` foreign-table embeds on `videos`/`posts` — once `posts` linked both `videos` and `profiles` it became an ambiguous junction and embeds error. **Fetch the author profile in a separate query by id.**
- **Threads** = `posts` rows where `parent_id IS NULL`; Comments = rows with `parent_id` set. `create_post()` parses `#hashtags` server-side.

---

## Project structure

```
src/app/
  (app)/        # main shell: full-width top Nav + Discord-style ribbon
    page.tsx              home feed
    create/  watch/[id]/  post/[id]/  search/  hashtag/[tag]/
  (auth)/       # full-bleed auth + onboarding screens
  studio/       # top-level; own internal sidebar, renders the main Nav
    page  content  posts(threads)  scheduler  profile
  api/          upload-url · stream-webhook · login
src/components/  Nav, Ribbon, AppShell, StreamPlayer, create/*, post/*, studio/*, home/*, discovery/*
supabase/        schema + 6 feature migrations (see Setup)
```

---

## Roadmap (sequenced)

1. ✅ **Thread-model alignment** — vocabulary + any-node-as-root thread page. *(done)*
2. ✅ **Custom thumbnails** — real uploads at create + in Studio. *(done)*
3. **Comment unification + Repost/Quote** — converge video comments onto `posts` nodes (one universal Comment), add `host_type/host_id`, add a `reposts` table, wire repost/quote actions + feed/thread union. *(carries a migration)*
4. **Articles** — own table, own feed card, own reading page with its own comments; embeddable as an Article card in a Post.
5. **Public channel page** (`/@handle`) — surfaces banner/avatar/bio/socials so creator links have a destination.
6. **Scheduled-release enforcement** (auto-publish / hide-until), **notifications**, **explore**, and **live streaming** (CF Stream Live + chat).

### Known follow-ups
- Revert-to-auto thumbnail control (auto URL is deterministic).
- Verify the webhook `Webhook-Signature` (HMAC) — currently unverified.
- Signed playback URLs (`requireSignedURLs`) for truly private/unlisted videos.
- Direct avatar/banner via the editor is live; "last updated" timestamp on profile is not tracked yet.
