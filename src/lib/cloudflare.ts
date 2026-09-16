// Server-only Cloudflare Stream helpers. Never import from a client component.
const ACCT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/stream`;

export type CfResult = { ok: boolean; error?: string };

// Toggle whether a video requires a signed token to stream/preview.
// We turn this ON for private videos and OFF for public/unlisted.
//
// Cloudflare can answer HTTP 200 with { success: false, errors: [...] }, so a bare
// res.ok check reports success on a failed write. We inspect the body and return
// the real message so the caller can surface it instead of a generic 502.
export async function cfSetRequireSignedURLs(uid: string, required: boolean): Promise<CfResult> {
  if (!ACCT || !TOKEN) {
    return { ok: false, error: "Cloudflare credentials are not configured on the server" };
  }
  try {
    const res = await fetch(`${BASE}/${uid}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requireSignedURLs: required }),
    });

    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; errors?: { code?: number; message?: string }[]; result?: { requireSignedURLs?: boolean } }
      | null;

    if (!res.ok || json?.success === false) {
      const msg =
        json?.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
        `Cloudflare returned ${res.status}`;
      console.error("cfSetRequireSignedURLs failed", uid, required, res.status, msg);
      return { ok: false, error: msg };
    }

    // Confirm Cloudflare actually applied the flag before we trust it.
    const applied = json?.result?.requireSignedURLs;
    if (typeof applied === "boolean" && applied !== required) {
      console.error("cfSetRequireSignedURLs not applied", uid, { wanted: required, got: applied });
      return { ok: false, error: "Cloudflare did not apply the signed-URL setting" };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error talking to Cloudflare";
    console.error("cfSetRequireSignedURLs threw", uid, msg);
    return { ok: false, error: msg };
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

// --- Thumbnails on private videos -------------------------------------------
// Once requireSignedURLs is on, https://videodelivery.net/<uid>/thumbnails/... is
// a 401. The signed form swaps the uid for a token: .../<token>/thumbnails/...
// Custom thumbnails live in Supabase public storage and are returned untouched.

const CF_THUMB_HOSTS = ["videodelivery.net", "cloudflarestream.com"];

export function isCfMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return CF_THUMB_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** Build a Cloudflare thumbnail URL. `pathId` is the uid, or a signed token. */
export function cfThumbnailUrl(pathId: string, seconds = 0, height = 720): string {
  const t = Math.max(0, Math.round(seconds));
  return `https://videodelivery.net/${pathId}/thumbnails/thumbnail.jpg?time=${t}s&height=${height}`;
}

/**
 * Swap the uid in a stored Cloudflare media URL for a signed token so it loads
 * for a private video. Returns the URL unchanged when it is not a Cloudflare URL
 * (custom thumbnails) or when no token could be minted.
 */
export function signCfMediaUrl(url: string, uid: string, token: string | null): string {
  if (!token || !isCfMediaUrl(url)) return url;
  return url.replace(uid, token);
}

/**
 * Server-side convenience: returns a display-ready thumbnail for one video,
 * minting a token only when the video is private AND its thumbnail is a
 * Cloudflare URL. Public/unlisted videos and custom thumbnails cost nothing.
 */
export async function cfDisplayThumbnail(
  uid: string,
  thumbnail: string | null,
  visibility: string | null | undefined,
): Promise<string | null> {
  if (!thumbnail || visibility !== "private" || !isCfMediaUrl(thumbnail)) return thumbnail;
  const token = await cfStreamToken(uid);
  return signCfMediaUrl(thumbnail, uid, token);
}
