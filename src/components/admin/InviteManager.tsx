"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Invite = { code: string; note: string | null; redeemed_by: string | null; redeemed_at: string | null; created_at: string; expires_at: string | null };

const gen = () => "LOON-" + Math.random().toString(36).slice(2, 7).toUpperCase();

export default function InviteManager({ initial, uid }: { initial: Invite[]; uid: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initial);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function create() {
    setBusy(true); setErr(null);
    const code = gen();
    const { data, error } = await supabase.from("invites")
      .insert({ code, created_by: uid, note: note.trim() || null }).select().single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setRows((r) => [data as Invite, ...r]); setNote("");
  }
  async function remove(code: string) {
    const { error } = await supabase.from("invites").delete().eq("code", code);
    if (!error) setRows((r) => r.filter((x) => x.code !== code));
  }
  function copy(code: string) { navigator.clipboard?.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1200); }

  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional, e.g. who it's for)" className="lt-input max-w-xs" />
        <button onClick={create} disabled={busy} className="rounded-full px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-50" style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
          {busy ? "Generating…" : "Generate invite"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-loonred">{err}</p>}

      <div className="mt-4 space-y-2">
        {rows.map((i) => {
          const used = !!i.redeemed_by;
          const expired = !used && i.expires_at && new Date(i.expires_at) < new Date();
          return (
            <div key={i.code} className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-panel px-3 py-2">
              <div className="min-w-0">
                <code className="font-mono font-bold text-foam">{i.code}</code>
                {i.note && <span className="ml-2 text-xs text-mist">{i.note}</span>}
              </div>
              <div className="flex items-center gap-3 whitespace-nowrap text-xs">
                <span className={used ? "text-mist" : expired ? "text-loonred" : "text-teal"}>{used ? "Redeemed" : expired ? "Expired" : "Available"}</span>
                {!used && <button onClick={() => copy(i.code)} className="font-semibold text-sky hover:underline">{copied === i.code ? "Copied" : "Copy"}</button>}
                <button onClick={() => remove(i.code)} className="text-mist hover:text-loonred">Delete</button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="py-4 text-center text-sm text-mist">No invites yet.</p>}
      </div>
    </div>
  );
}
