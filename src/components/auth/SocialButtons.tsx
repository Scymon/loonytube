"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "apple" | "twitter";

const ICONS: Record<Provider, React.ReactNode> = {
  google: (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.9z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0012 23z" />
      <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 010-4.2V7.1H2a11 11 0 000 9.8l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.7l3.1-3.1A11 11 0 002 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z" />
    </svg>
  ),
  apple: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.2 5.5c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2-.5 2.8-1.3z" />
    </svg>
  ),
  twitter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 3H22l-7 8 8.2 10h-6.4l-5-6.2L6 21H3l7.5-8.6L2.6 3H9l4.5 5.9L18.9 3zm-1.1 16.2h1.7L7.3 4.7H5.5l12.3 14.5z" />
    </svg>
  ),
};

export default function SocialButtons({ next = "/" }: { next?: string }) {
  const supabase = createClient();
  const [err, setErr] = useState<string | null>(null);

  async function go(provider: Provider) {
    setErr(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      const label = provider === "twitter" ? "X" : provider[0].toUpperCase() + provider.slice(1);
      setErr(`${label} sign-in isn't enabled yet. Add the provider in Supabase → Auth → Providers.`);
    }
  }

  return (
    <div>
      <div className="flex gap-3">
        <button type="button" onClick={() => go("google")} className="lt-social">
          {ICONS.google} Google
        </button>
        <button type="button" onClick={() => go("apple")} className="lt-social">
          {ICONS.apple} Apple
        </button>
        <button type="button" onClick={() => go("twitter")} className="lt-social">
          {ICONS.twitter} X
        </button>
      </div>
      {err && <p className="mt-2 text-[12px] text-mist">{err}</p>}
    </div>
  );
}
