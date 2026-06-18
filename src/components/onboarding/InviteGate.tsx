"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function InviteGate() {
  const supabase = createClient();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function redeem() {
    const c = code.trim();
    if (!c) return setErr("Enter your invite code.");
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("redeem_invite", { p_code: c });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data === true) { router.push("/onboarding/interests"); router.refresh(); }
    else setErr("That invite code is invalid, already used, or expired.");
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-bold text-foam">You&apos;re early 🪶</h1>
      <p className="mt-2 text-mist">LoonyTube is invite-only right now. Enter your code to continue.</p>

      <label className="lt-label mt-6">Invite code</label>
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="LOON-XXXXX"
        className="lt-input font-mono tracking-wider" onKeyDown={(e) => e.key === "Enter" && redeem()} />

      {err && <p className="mt-2 text-sm text-loonred">{err}</p>}

      <button onClick={redeem} disabled={busy} className="mt-5 w-full rounded-[10px] py-3 text-sm font-bold text-ink disabled:opacity-50"
        style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
        {busy ? "Checking…" : "Continue"}
      </button>
    </div>
  );
}
