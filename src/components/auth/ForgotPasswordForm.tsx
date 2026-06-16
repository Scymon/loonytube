"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function maskEmail(e: string) {
  const [u, d] = e.split("@");
  if (!d) return e;
  const head = u.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}

export default function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.includes("@")) return;
    setBusy(true);
    // Fire the reset; we intentionally show success regardless so the form
    // never reveals whether an address is registered.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    setSent(maskEmail(email));
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border border-teal/50"
           style={{ boxShadow: "0 0 24px -4px rgba(45,212,180,0.5)" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2dd4b4" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-foam">Reset your password</h1>
      <p className="mx-auto mt-3 max-w-sm text-mist">
        Enter your email address and we&apos;ll send a secure link to reset your password.
      </p>

      {sent ? (
        <div className="mx-auto mt-7 max-w-sm rounded-[10px] border border-teal/40 bg-teal/10 p-4 text-left">
          <p className="flex items-center gap-2 font-semibold text-foam">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-teal text-ink">✓</span>
            Check your inbox!
          </p>
          <p className="mt-1 text-[13px] text-mist">A reset link was sent to {sent}</p>
        </div>
      ) : (
        <div className="mt-7 space-y-3">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="lt-input text-center"
          />
          <button onClick={submit} disabled={busy} className="lt-btn-primary">
            {busy ? "Sending…" : "Send Reset Link"}
          </button>
        </div>
      )}

      <Link href="/login" className="mt-6 inline-block text-[13px] font-semibold text-mist hover:text-foam">
        Back to Log In
      </Link>
    </div>
  );
}
