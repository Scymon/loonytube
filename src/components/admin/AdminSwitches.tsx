"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Settings = { invite_only: boolean; signups_enabled: boolean; uploads_enabled: boolean };

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} disabled={disabled} role="switch" aria-checked={on}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-teal" : "bg-edge"} ${disabled ? "opacity-40" : ""}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function AdminSwitches({ initial, canInviteOnly }: { initial: Settings; canInviteOnly: boolean }) {
  const supabase = createClient();
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState<keyof Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function flip(key: keyof Settings) {
    const next = { ...s, [key]: !s[key] };
    setS(next); setMsg(null);
    const { error } = await supabase.from("app_settings").update({ [key]: next[key] }).eq("id", 1);
    if (error) { setS(s); setMsg(error.message); return; }
    setSaved(key);
    setTimeout(() => setSaved((cur) => (cur === key ? null : cur)), 1600);
  }

  const rows: { key: keyof Settings; label: string; desc: string; locked?: boolean }[] = [
    { key: "invite_only", label: "Invite-only onboarding", desc: "New users must redeem an invite code to onboard. SuperAdmin only.", locked: !canInviteOnly },
    { key: "signups_enabled", label: "Signups enabled", desc: "Allow new account creation." },
    { key: "uploads_enabled", label: "Uploads enabled", desc: "Allow new video uploads platform-wide." },
  ];

  return (
    <div className="divide-y divide-edge rounded-xl border border-edge bg-surface">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-semibold text-foam">{r.label} {r.locked && <span className="ml-1 text-xs text-mist">(locked)</span>}</p>
            <p className="text-sm text-mist">{r.desc}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold text-teal transition-opacity duration-300 ${saved === r.key ? "opacity-100" : "opacity-0"}`}>Saved ✓</span>
            <Toggle on={s[r.key]} disabled={r.locked} onChange={() => flip(r.key)} />
          </div>
        </div>
      ))}
      {msg && <p className="p-4 text-sm text-loonred">{msg}</p>}
    </div>
  );
}
