// Server-only Cloudflare Stream helpers. Never import from a client component.
const ACCT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/stream`;

// Toggle whether a video requires a signed token to stream/preview.
// We turn this ON for private videos and OFF for public/unlisted.
export async function cfSetRequireSignedURLs(uid: string, required: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/${uid}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requireSignedURLs: required }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Mint a short-lived signed token for a private video. Caller MUST authorize the
// viewer first (we only call this after an RLS-gated read has succeeded).
export async function cfStreamToken(uid: string, expSeconds = 60 * 60 * 6): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/${uid}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSeconds }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.result?.token ?? null;
  } catch {
    return null;
  }
}
