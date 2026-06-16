"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/auth/PasswordField";
import SocialButtons from "@/components/auth/SocialButtons";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function SignupForm() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    setNotice(null);
    const uname = username.trim().replace(/^@/, "");

    if (!USERNAME_RE.test(uname)) {
      setErr("Username must be 3–20 characters: letters, numbers, or underscores.");
      return;
    }
    if (!email.includes("@")) return setErr("Enter a valid email.");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords don't match.");

    setBusy(true);

    // 1. Username availability pre-check (profiles.username is world-readable).
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", uname)
      .maybeSingle();
    if (taken) {
      setBusy(false);
      return setErr("That username is taken. Try another.");
    }

    // 2. Create the auth user. full_name rides in metadata; the trigger seeds a
    //    safe unique placeholder username we overwrite below.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/interests`,
      },
    });
    if (error) {
      setBusy(false);
      return setErr(error.message);
    }

    // 3. No session => email confirmation is on. Tell them to check inbox.
    if (!data.session) {
      setBusy(false);
      setNotice("Account created! Check your inbox to confirm, then you'll continue setup.");
      return;
    }

    // 4. Claim the chosen username + name now that we're authenticated.
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ username: uname, full_name: fullName.trim() })
      .eq("id", data.user!.id);
    if (upErr) {
      setBusy(false);
      return setErr("That username was just taken. Pick another.");
    }

    router.push("/onboarding/interests");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-foam">Create your account</h1>
      <p className="mt-2 text-mist">Start your journey with us today.</p>

      <div className="mt-6">
        <SocialButtons next="/onboarding/interests" />
      </div>
      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-mist">
        <span className="h-px flex-1 bg-edge" /> Or <span className="h-px flex-1 bg-edge" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="lt-label">Full Name</label>
          <input className="lt-input" placeholder="Alex Rivers" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="lt-label">Username</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist">@</span>
            <input
              className="lt-input pl-8"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
            />
          </div>
        </div>
        <div>
          <label className="lt-label">Email</label>
          <input className="lt-input" type="email" placeholder="alex@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="lt-label">Password</label>
          <PasswordField value={password} onChange={setPassword} meter />
        </div>
        <div>
          <label className="lt-label">Confirm Password</label>
          <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm password" onEnter={submit} />
        </div>

        {err && <p className="text-sm text-loonred">{err}</p>}
        {notice && <p className="text-sm text-teal">{notice}</p>}

        <button onClick={submit} disabled={busy} className="lt-btn-primary">
          {busy ? "Creating…" : "Create Account"}
        </button>
      </div>

      <p className="mt-5 text-center text-[13px] text-mist">
        Already have an account? <Link href="/login" className="lt-link">Log In</Link>
      </p>
    </>
  );
}
