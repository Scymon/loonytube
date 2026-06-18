"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRow = { id: string; username: string | null; full_name: string | null; role: string };
const ROLES = ["superadmin", "admin", "creator", "guest"] as const;

export default function RoleManager({ initial, selfId }: { initial: UserRow[]; selfId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function setRole(id: string, role: string) {
    setErr(null);
    const prev = rows;
    setRows((r) => r.map((u) => (u.id === id ? { ...u, role } : u)));
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) { setRows(prev); setErr(error.message); }
  }

  const filtered = rows.filter((u) =>
    !q || (u.username ?? "").toLowerCase().includes(q.toLowerCase()) || (u.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or handle…" className="lt-input mb-3 max-w-sm" />
      {err && <p className="mb-2 text-sm text-loonred">{err}</p>}
      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-panel px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foam">{u.full_name || u.username || "—"}</p>
              <p className="truncate text-xs text-mist">@{u.username ?? "—"}</p>
            </div>
            <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} disabled={u.id === selfId}
              className="lt-input max-w-[150px] disabled:opacity-50" title={u.id === selfId ? "You can't change your own role" : ""}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
        {filtered.length === 0 && <p className="py-4 text-center text-sm text-mist">No users match.</p>}
      </div>
    </div>
  );
}
