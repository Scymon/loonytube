"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/auth/PasswordField";

export default function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // The /auth/callback route exchanges the recovery code and sets the session
  // before bouncing here, so a logged-in recovery session should already exist.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setReady(!!data.user));
  }, [supabase]);

  async function submit() {
    setErr(null);
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1400);
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-foam">Set a new password</h1>
      <p className="mt-2 text-mist">Choose a strong password you haven&apos;t used before.</p>

      {!ready ? (
        <p className="mt-6 text-sm text-mist">
          This page opens from the link in your reset email. If you got here another way,
          request a new link from <a href="/forgot-password" className="lt-link">Forgot Password</a>.
        </p>
      ) : done ? (
        <p className="mt-6 text-teal">Password updated — taking you in…</p>
      ) : (
        <div className="mt-6 space-y-4">
          <div>
            <label className="lt-label">New Password</label>
            <PasswordField value={password} onChange={setPassword} meter />
          </div>
          <div>
            <label className="lt-label">Confirm Password</label>
            <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm password" onEnter={submit} />
          </div>
          {err && <p className="text-sm text-loonred">{err}</p>}
          <button onClick={submit} disabled={busy} className="lt-btn-primary">
            {busy ? "Updating…" : "Update Password"}
          </button>
        </div>
      )}
    </div>
  );
}
