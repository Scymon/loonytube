"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordField from "@/components/auth/PasswordField";
import SocialButtons from "@/components/auth/SocialButtons";

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!identifier || !password) {
      setErr("Enter your email/username and password.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Could not sign in.");
      return;
    }
    router.push(json.onboarded ? "/" : "/onboarding/interests");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foam">Welcome back</h1>
          <p className="mt-2 text-mist">We&apos;ve missed you.</p>
        </div>
        <p className="pt-2 text-[13px] text-mist">
          New to LoonyTube? <Link href="/signup" className="lt-link">Sign Up</Link>
        </p>
      </div>

      <div className="mt-7 space-y-3">
        <input
          type="text"
          autoComplete="username"
          placeholder="Email or Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="lt-input"
        />
        <PasswordField value={password} onChange={setPassword} onEnter={submit} />
        <div>
          <Link href="/forgot-password" className="text-[13px] font-semibold text-teal hover:underline">
            Forgot Password?
          </Link>
        </div>

        {err && <p className="text-sm text-loonred">{err}</p>}

        <button onClick={submit} disabled={busy} className="lt-btn-primary">
          {busy ? "Signing in…" : "Log In"}
        </button>

        {/* Passkey / biometric — UI placeholder until WebAuthn is wired */}
        <div className="flex justify-center gap-3 pt-1">
          {["passkey", "biometric"].map((k) => (
            <button
              key={k}
              type="button"
              title="Coming soon"
              className="grid h-11 w-11 place-items-center rounded-full border border-edge bg-surface text-mist hover:border-hair"
            >
              {k === "passkey" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="9" cy="9" r="4" /><path d="M9 13c-3 0-5 2-5 4v1h6M15 11l5 5M18 13l-2 2M20 16l-2 2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 4a6 6 0 016 6v2M6 10a6 6 0 016-6M7 13v1a5 5 0 0010 0M9 19a3 3 0 006 0" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-mist">
        <span className="h-px flex-1 bg-edge" /> Social Log In <span className="h-px flex-1 bg-edge" />
      </div>
      <SocialButtons next="/" />
    </>
  );
}
