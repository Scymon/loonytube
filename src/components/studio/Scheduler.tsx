"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ago } from "@/lib/format";

export type SchedRow = { id: string; title: string; thumbnail: string | null; status: string; scheduled_at: string | null };

const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function Scheduler({ initial }: { initial: SchedRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initial);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function setDate(id: string, local: string) {
    const iso = toIso(local);
    setSavingId(id);
    const { error } = await supabase.from("videos").update({ scheduled_at: iso }).eq("id", id);
    setSavingId(null);
    if (!error) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, scheduled_at: iso } : r)));
  }

  const upcoming = rows
    .filter((r) => r.scheduled_at && new Date(r.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-bold text-foam">Upcoming releases</h2>
        {upcoming.length ? (
          <div className="divide-y divide-edge rounded-xl border border-edge bg-surface">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky/15 text-sky">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 6h16v15H4z" /><path d="M4 10h16M8 3v4M16 3v4" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foam">{r.title}</p>
                  <p className="text-xs text-sky">{fmt(r.scheduled_at!)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="rounded-xl border border-edge bg-surface px-4 py-8 text-center text-sm text-mist">Nothing scheduled. Set a release date for any video below.</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-foam">All videos</h2>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-surface p-3">
              <div className="aspect-video w-24 shrink-0 overflow-hidden rounded border border-edge bg-black">
                {r.thumbnail
                  ? // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumbnail} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
              </div>
              <p className="min-w-0 flex-1 truncate font-semibold text-foam">{r.title}</p>
              <input
                type="datetime-local"
                defaultValue={toLocal(r.scheduled_at)}
                onChange={(e) => setDate(r.id, e.target.value)}
                className="lt-input max-w-[220px]"
              />
              {savingId === r.id && <span className="text-xs text-mist">saving…</span>}
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-mist">No videos to schedule yet.</p>}
        </div>
        <p className="mt-3 text-xs text-mist/70">Setting a date stores the planned release. Auto-publishing at that time is coming with the live/scheduling backend.</p>
      </section>
    </div>
  );
}
