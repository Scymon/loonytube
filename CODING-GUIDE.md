# LoonyTube — Idiot's Coder Guide

A plain-English reference for building new features onto this system without breaking things.

---

## The Big Picture — How the App Is Wired

```
Browser
  └─ Next.js (src/app/)
       ├─ Pages fetch data from Supabase (server components)
       ├─ Client components handle UI state and user actions
       ├─ API routes (/api/) talk to Cloudflare and Supabase with the service key
       └─ Supabase handles auth, database, storage, and realtime
```

**The rule of thumb:** If it needs the user's session → use the Supabase client. If it needs to bypass RLS or touch Cloudflare → use an API route with the service key.

---

## The File System — Where Things Live

```
src/
  app/
    (app)/          ← Every page the logged-in user sees
    (auth)/         ← Login, signup, onboarding (no nav)
    studio/         ← Creator Studio (own sidebar)
    api/            ← Server-only API endpoints

  components/
    create/         ← VideoComposer, PostComposer, ArticleComposer
    studio/         ← ContentTable, StudioShell, etc.
    home/           ← Feed cards, shelves, rails
    post/           ← Thread/comment components
    messages/       ← DM components
    notifications/  ← Bell, notification list
    auth/           ← Login/signup forms
    onboarding/     ← Interest picker, follow list
    admin/          ← Admin console panels

  lib/
    supabase/
      server.ts     ← Use this in server components and API routes
      client.ts     ← Use this in "use client" components
    cloudflare.ts   ← CF Stream helpers
    format.ts       ← nfmt(), ago(), formatTime()
    notif.ts        ← Notification verbs and hrefs
    upload-limits.ts ← TITLE_MAX, DESCRIPTION_MAX constants

supabase/           ← SQL migrations (run these in order, see README)
```

---

## Adding a New Page

### 1. Server page (fetches data, no interactivity)

Create `src/app/(app)/your-page/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";

export default async function YourPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("your_table")
    .select("id, title")
    .eq("owner", user!.id);

  return (
    <div>
      {data?.map((row) => <p key={row.id}>{row.title}</p>)}
    </div>
  );
}
```

### 2. Client page (needs state, user interaction)

```tsx
"use client";

import { useState } from "react";

export default function YourPage() {
  const [value, setValue] = useState("");

  return (
    <input value={value} onChange={(e) => setValue(e.target.value)} />
  );
}
```

**Rule:** Only add `"use client"` when you actually need it (onClick, useState, useEffect). Server components are faster and simpler.

---

## Module Size Rule — 300 Line Hard Limit

**No component or page file should exceed 300 lines.**

This is the primary defence against file corruption (the Edit tool's null-byte bug only appears on large files) and the main driver of code reuse.

When a file hits 250 lines:
- Extract visual sub-components into their own files (`MessageBubble.tsx`, `EmbedCard.tsx`)
- Extract stateful logic into hooks (`src/hooks/useConversation.ts`)
- Extract shared types into `src/types/<domain>.ts`

The components built so far follow this pattern: `DmList`, `DmShell`, `ThreadsSidebar`, `ThreadsShell` are all separate files under 150 lines. Continue this pattern for every new feature.

---

## Adding a New Component

Create `src/components/your-section/YourComponent.tsx`.

If it needs browser APIs (state, events, refs) → `"use client"` at the top.
If it just renders data passed as props → no directive needed (server component by default).

```tsx
// Pure display component — no directive needed
export default function VideoCard({ title, thumb }: { title: string; thumb: string | null }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      {thumb && <img src={thumb} alt="" className="w-full rounded-lg" />}
      <p className="mt-2 font-semibold text-foam">{title}</p>
    </div>
  );
}
```

---

## Adding a New API Route

Create `src/app/api/your-endpoint/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Do your thing
  const { error } = await supabase
    .from("your_table")
    .insert({ owner: user.id, title: body.title });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

Call it from the client:
```ts
const res = await fetch("/api/your-endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Hello" }),
});
const json = await res.json();
```

---

## Adding a New Database Table

### 1. Write the migration SQL

Create `supabase/your-feature.sql`:

```sql
-- Your new table
create table if not exists your_table (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references profiles(id) on delete cascade,
  title       text not null check (char_length(title) <= 200),
  created_at  timestamptz not null default now()
);

-- Row Level Security (always add this)
alter table your_table enable row level security;

-- Who can read it
create policy "public read" on your_table
  for select using (true);

-- Owner can insert
create policy "owner insert" on your_table
  for insert with check (auth.uid() = owner);

-- Owner can update
create policy "owner update" on your_table
  for update using (auth.uid() = owner);

-- Owner can delete
create policy "owner delete" on your_table
  for delete using (auth.uid() = owner);
```

### 2. Run it in Supabase

Go to **Supabase → SQL Editor → New query** → paste → Run.

### 3. Add to the README migration table

Open `README.md`, find the migration table in Setup, add a new row.

---

## The Design System — Colors and Classes

These are the Loonatic CSS variables. Use them instead of raw colors.

| Variable | Meaning |
|----------|---------|
| `text-foam` | Primary text (near white) |
| `text-mist` | Secondary/muted text |
| `text-ink` | Dark text (on light backgrounds) |
| `bg-surface` | Card/panel background |
| `border-edge` | Standard border color |
| `border-hair` | Lighter hover border |
| `text-teal` | Brand accent (links, CTAs) |
| `text-sky` | Blue accent (selected state) |
| `text-loonred` | Error/destructive |

**Common patterns:**
```tsx
// Card
<div className="rounded-xl border border-edge bg-surface p-4">

// Primary button
<button className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-ink"
  style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>

// Secondary button
<button className="rounded-[10px] border border-edge bg-surface px-5 py-2.5 text-sm font-semibold text-foam hover:bg-edge/40">

// Muted label
<p className="text-xs uppercase tracking-wide text-mist">

// Error text
<p className="text-sm text-loonred">
```

---

## Reading Data in a Server Component

```tsx
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Simple select
const { data, error } = await supabase
  .from("videos")
  .select("id, title, thumbnail, status")
  .eq("owner", user!.id)
  .order("created_at", { ascending: false });

// Select with limit
const { data: recent } = await supabase
  .from("videos")
  .select("id, title")
  .eq("status", "ready")
  .limit(10);
```

**NEVER do this:** `profiles(...)` as an embed on `videos` or `posts` — it breaks due to ambiguous foreign keys. Fetch the profile separately by id.

---

## Writing Data from a Client Component

```tsx
"use client";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// Insert
const { error } = await supabase
  .from("your_table")
  .insert({ title: "Hello", owner: userId });

// Update
const { error } = await supabase
  .from("videos")
  .update({ title: newTitle })
  .eq("id", videoId);

// Delete
const { error } = await supabase
  .from("videos")
  .delete()
  .eq("id", videoId);
```

---

## Realtime (Live Updates)

```tsx
"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const supabase = createClient();

useEffect(() => {
  const channel = supabase
    .channel("my-channel")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      setMessages((prev) => [...prev, payload.new as Message]);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [conversationId]);
```

---

## Common Mistakes to Avoid

**1. Don't embed profiles via foreign key join**
```tsx
// WRONG — breaks with ambiguous junction error
.select("id, title, profiles(username)")

// RIGHT — fetch separately
const { data: video } = await supabase.from("videos").select("id, title, owner").single();
const { data: profile } = await supabase.from("profiles").select("username").eq("id", video.owner).single();
```

**2. Don't use `%` format for Cloudflare thumbnails**
```ts
// WRONG — CF ignores this, returns same frame every time
`https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=25p`

// RIGHT
`https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=30s`
```

**3. Don't read/write files in large chunks with the Edit tool**
Use Python `str.replace()` for surgical changes to large files. The Edit tool silently truncates files over a certain size.

**4. Don't forget RLS**
Every new table needs `alter table x enable row level security` and at least one policy, or nobody (including you) can read it.

**5. Don't commit directly to `main`**
See `GIT-WORKFLOW.md`.

**6. Don't put secrets in client components**
`SUPABASE_SERVICE_ROLE_KEY`, `CLOUDFLARE_STREAM_API_TOKEN` — server/API routes only. The `NEXT_PUBLIC_` prefix means it's exposed to the browser.

---

## Before You Push — Checklist

```powershell
# Type check — zero errors before pushing
npx tsc --noEmit

# Make sure the app actually runs
pnpm dev

# Check for null bytes in any file you edited (they break builds)
python -c "
import os, glob
for f in glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True):
    d = open(f,'rb').read()
    if b'\x00' in d:
        print('NULL BYTES:', f)
"
```

---

## Adding a New Nav Link

Open `src/components/Nav.tsx` and find the nav items array. Add your route there.

For the **Studio sidebar**, open `src/components/studio/StudioShell.tsx` and find the `NAV` array.

---

## Useful Utility Functions

```ts
import { nfmt, ago, formatTime } from "@/lib/format";

nfmt(1500000)    // → "1.5M"
ago("2026-06-01") // → "19 days ago"
formatTime(125)   // → "2:05"
```

---

## When Something Breaks on Vercel But Works Locally

1. Check the build logs — Vercel shows the exact error.
2. Run `npx tsc --noEmit` locally — type errors that TypeScript catches in strict mode.
3. Check for null bytes — they appear silently and cause `pnpm install` failures.
4. Check the `.next/types/routes.d.ts` file — Next.js sometimes writes null bytes into it when you add new API routes. Strip with:
```powershell
python -c "
d = open('.next/types/routes.d.ts','rb').read()
open('.next/types/routes.d.ts','wb').write(d.rstrip(b'\x00'))
"
```
5. If it's a lockfile error (`ERR_PNPM_OUTDATED_LOCKFILE`) — run `pnpm install` locally and push the updated `pnpm-lock.yaml`.
