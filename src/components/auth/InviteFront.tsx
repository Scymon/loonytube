"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function InviteFront({ onValid }: { onValid: (code: string) => void }) {
  const supabase = createClient();
  const [mode, setMode] = useState<"code" | "waitlist">("code");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  async function checkCode() {
    const c = code.trim();
    if (!c) return setErr("Enter your invite code.");
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("invite_is_valid", { p_code: c });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data === true) onValid(c);
    else setErr("That code is invalid, already used, or expired.");
  }

  async function join() {
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) return setErr("Enter a valid email.");
    setBusy(true); setErr(null);
    const { error } = await supabase.from("waitlist").insert({ email: e });
    setBusy(false);
    if (error && error.code !== "23505") return setErr(error.message); // 23505 = already listed
    setJoined(true);
  }

  if (joined) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-foam">You&apos;re on the list 🪶</h1>
        <p className="mt-2 text-mist">We&apos;ll email you the moment LoonyTube opens up. Thanks for the early interest.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-teal hover:underline">Back home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-bold text-foam">LoonyTube is invite-only</h1>
      <p className="mt-2 text-mist">Enter your invite code to create an account — or join the waitlist for launch.</p>

      <div className="mt-6 flex gap-2 rounded-full bg-surface p-1 text-sm font-semibold">
        <button onClick={() => { setMode("code"); setErr(null); }} className={`flex-1 rounded-full py-2 transition ${mode === "code" ? "bg-edge text-foam" : "text-mist"}`}>I have a code</button>
        <button onClick={() => { setMode("waitlist"); setErr(null); }} className={`flex-1 rounded-full py-2 transition ${mode === "waitlist" ? "bg-edge text-foam" : "text-mist"}`}>Join waitlist</button>
      </div>

      {mode === "code" ? (
        <div className="mt-5">
          <label className="lt-label">Invite code</label>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="LOON-XXXXX"
            className="lt-input font-mono tracking-wider" onKeyDown={(e) => e.key === "Enter" && checkCode()} />
          {err && <p className="mt-2 text-sm text-loonred">{err}</p>}
          <button onClick={checkCode} disabled={busy} className="lt-btn-primary mt-5">{busy ? "Checking…" : "Continue"}</button>
        </div>
      ) : (
        <div className="mt-5">
          <label className="lt-label">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com"
            className="lt-input" onKeyDown={(e) => e.key === "Enter" && join()} />
          {err && <p className="mt-2 text-sm text-loonred">{err}</p>}
          <button onClick={join} disabled={busy} className="lt-btn-primary mt-5">{busy ? "Joining…" : "Join the waitlist"}</button>
        </div>
      )}

      <p className="mt-5 text-center text-[13px] text-mist">
        Already have an account? <Link href="/login" className="lt-link">Log In</Link>
      </p>
    </div>
  );
}
