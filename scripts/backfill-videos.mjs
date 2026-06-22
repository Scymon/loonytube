// scripts/backfill-videos.mjs
// Fetches duration + thumbnail from Cloudflare Stream for any video row
// that is missing either field, then patches Supabase.
//
// Usage:  node scripts/backfill-videos.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── load .env.local ────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const ACCT     = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN    = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ACCT || !TOKEN || !SUPA_URL || !SUPA_KEY) {
  console.error("Missing env vars — check .env.local");
  process.exit(1);
}

// ── 1. Find videos with NULL duration or thumbnail ─────────────────────────
console.log("Fetching videos with NULL duration or thumbnail…");
const listRes = await fetch(
  `${SUPA_URL}/rest/v1/videos?or=(duration.is.null,thumbnail.is.null)&select=id,title,duration,thumbnail,status`,
  { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
);
const videos = await listRes.json();

if (!Array.isArray(videos) || videos.length === 0) {
  console.log("No videos need backfilling. Done.");
  process.exit(0);
}

console.log(`Found ${videos.length} video(s):\n`);
for (const v of videos) {
  console.log(`  ${v.id}  "${v.title}"  status=${v.status}  duration=${v.duration ?? "NULL"}  thumbnail=${v.thumbnail ? "set" : "NULL"}`);
}
console.log();

// ── 2. Fetch from Cloudflare and patch Supabase ────────────────────────────
for (const v of videos) {
  console.log(`\nProcessing: "${v.title}" (${v.id})`);

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCT}/stream/${v.id}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );

  if (!cfRes.ok) {
    console.warn(`  ⚠  Cloudflare ${cfRes.status} — skipping`);
    continue;
  }

  const { result } = await cfRes.json();
  const cfDuration  = result?.duration  ?? null;
  const cfThumbnail = result?.thumbnail ?? null;
  const cfStatus    = result?.status?.state ?? null;

  console.log(`  CF: duration=${cfDuration ?? "null"}  thumbnail=${cfThumbnail ? "set" : "null"}  state=${cfStatus}`);

  const patch = {};
  if (v.duration  == null && cfDuration  != null) patch.duration  = cfDuration;
  if (v.thumbnail == null && cfThumbnail != null) patch.thumbnail = cfThumbnail;
  if (cfStatus === "ready" && v.status !== "ready") patch.status = "ready";

  if (Object.keys(patch).length === 0) {
    console.log("  → Cloudflare has no data yet for this video — nothing to patch");
    continue;
  }

  console.log("  → Patching:", JSON.stringify(patch));

  const patchRes = await fetch(
    `${SUPA_URL}/rest/v1/videos?id=eq.${encodeURIComponent(v.id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
    }
  );

  if (patchRes.ok) {
    console.log("  ✓ Done");
  } else {
    console.error(`  ✗ Failed (${patchRes.status}): ${await patchRes.text()}`);
  }
}

console.log("\nAll done.");
