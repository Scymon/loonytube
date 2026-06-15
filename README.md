# LoonyTube

A small YouTube-style video platform. Northwoods loon brand, MN region.
Stack: **Next.js 15 (App Router) · Supabase (auth + Postgres + RLS) · Cloudflare Stream (ingest/transcode/CDN)**.

The whole core loop works out of the box: sign up → upload → Cloudflare transcodes → watch with adaptive-bitrate player → like + comment.

---

## Setup (≈30–40 min, mostly waiting on account signups)

### 1. Install deps
```powershell
pnpm install
```

### 2. Supabase project
1. Create a project at https://supabase.com → wait for it to provision.
2. **Project Settings → API**: copy the Project URL, the `anon` public key, and the `service_role` key.
3. **SQL Editor → New query**: paste all of `supabase/schema.sql` and run it. (Creates tables, RLS, triggers, the view-counter RPC.)
4. **Authentication → Providers → Email**: for fast local testing, turn **off** "Confirm email" so signups log in immediately. (Turn it back on before launch.)

### 3. Cloudflare Stream
1. In the Cloudflare dashboard, enable **Stream** (Workers Paid plan is required — ~$5/mo entry).
2. **Account ID**: shown on the Stream page URL / dashboard sidebar.
3. **API token**: My Profile → API Tokens → Create Token → use the **"Stream"** template (Edit permission). Copy it.
4. **Customer code**: upload any test video in the dashboard, open it, and look at its HLS/embed URL — `customer-XXXXXXXX.cloudflarestream.com`. The `XXXXXXXX` is your code.

### 4. Env vars
```powershell
Copy-Item .env.local.example .env.local
```
Fill in every value in `.env.local`.

### 5. Run
```powershell
pnpm dev
```
Open http://localhost:3000 → sign up → upload a video.

---

## The webhook (required for videos to become watchable)

Cloudflare transcodes asynchronously and calls `/api/stream-webhook` when a video is ready, which flips its status to `ready`. Cloudflare can't reach `localhost`, so for local dev expose your server with a tunnel:

```powershell
# Cloudflare Tunnel (recommended, free):
cloudflared tunnel --url http://localhost:3000
# ...or ngrok:
ngrok http 3000
```

Then in **Cloudflare dashboard → Stream → Settings → Webhooks**, set the URL to:
```
https://<your-tunnel-domain>/api/stream-webhook
```

> Without a reachable webhook, an uploaded video stays on "Processing…" forever in the UI even though Cloudflare finished. As a stopgap you can manually flip the row's `status` to `ready` in the Supabase table editor to test playback.

---

## How it fits together

```
Upload page ──POST /api/upload-url──► Cloudflare creates direct-upload URL + uid
     │                                 (server inserts videos row, status=uploading)
     └──uploads file straight to Cloudflare (XHR, progress bar)──►
                                       Cloudflare transcodes ──► webhook ──► status=ready
Feed (/)         reads status='ready' videos
Watch (/watch/id) <Stream src={uid}/> adaptive-bitrate player + like + comments
```

- `videos.id` **is** the Cloudflare Stream UID — no mapping table needed.
- RLS: ready videos are world-readable; an owner sees their own at any status.
- The webhook uses the Supabase **service-role** key to bypass RLS.

---

## Next steps (after the loop works)
- Swap the Cloudflare `<Stream>` component for `hls.js` + your own Voltform player skin.
- Real channels/subscriptions, search, watch history.
- Moderation: add a report button + a takedown path before opening uploads to strangers.
- Verify the webhook `Webhook-Signature` (HMAC) — currently a TODO in `api/stream-webhook/route.ts`.
- Signed playback URLs (`requireSignedURLs`) if you want private/unlisted videos.
