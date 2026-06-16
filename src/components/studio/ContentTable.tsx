"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { nfmt, ago } from "@/lib/format";

export type Row = {
  id: string; title: string; description: string | null; thumbnail: string | null;
  status: string; visibility: string; views: number; comments: number; likes: number;
  created_at: string; scheduled_at: string | null;
};

const VIS = ["public", "unlisted", "private"] as const;

// ISO <-> <input type="datetime-local"> value
const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

function VisBadge({ v }: { v: string }) {
  const dot = v === "public" ? "bg-teal" : v === "unlisted" ? "bg-sky" : "bg-mist";
  return <span className="inline-flex items-center gap-1.5 text-sm capitalize text-foam"><span className={`h-2 w-2 rounded-full ${dot}`} />{v}</span>;
}

export default function ContentTable({ initial }: { initial: Row[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>(initial);
  const [edit, setEdit] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  async function uploadThumb(file: File) {
    if (!edit) return;
    setThumbBusy(true); setErr(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setThumbBusy(false); setErr("Sign in to upload a thumbnail."); return; }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/thumb-${edit.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) { setThumbBusy(false); setErr(`Thumbnail upload failed: ${error.message}`); return; }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setEdit((e) => (e ? { ...e, thumbnail: data.publicUrl } : e));
    setThumbBusy(false);
  }

  async function save() {
    if (!edit) return;
    setBusy(true); setErr(null);
    const patch = {
      title: edit.title.trim(),
      description: edit.description,
      visibility: edit.visibility,
      scheduled_at: edit.scheduled_at,
      thumbnail: edit.thumbnail,
    };
    const { error } = await supabase.from("videos").update(patch).eq("id", edit.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === edit.id ? { ...r, ...patch } : r)));
    setEdit(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this video permanently?")) return;
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (!error) setRows((rs) => rs.filter((r) => r.id !== id));
  }

  if (rows.length === 0) {
    return <p className="rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm text-mist">No uploads yet. <Link href="/create" className="text-teal hover:underline">Upload a video</Link>.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-edge">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-edge bg-surface text-left text-xs uppercase tracking-wide text-mist">
            <tr>
              <th className="px-4 py-3 font-semibold">Video</th>
              <th className="px-3 py-3 font-semibold">Visibility</th>
              <th className="px-3 py-3 font-semibold">Date</th>
              <th className="px-3 py-3 text-right font-semibold">Views</th>
              <th className="px-3 py-3 text-right font-semibold">Comments</th>
              <th className="px-3 py-3 text-right font-semibold">Likes</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-edge/30">
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded border border-edge bg-black">
                      {r.thumbnail
                        ? // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.thumbnail} alt="" className="h-full w-full object-cover" />
                        : <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-semibold text-foam">{r.title}</p>
                      <p className="line-clamp-1 text-xs text-mist">{r.description || "No description"}</p>
                      {r.status !== "ready" && <span className="mt-1 inline-block rounded bg-edge px-1.5 py-0.5 text-[10px] uppercase text-mist">{r.status}</span>}
                      {r.scheduled_at && new Date(r.scheduled_at) > new Date() && <span className="mt-1 ml-1 inline-block rounded bg-sky/15 px-1.5 py-0.5 text-[10px] uppercase text-sky">scheduled</span>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3"><VisBadge v={r.visibility} /></td>
                <td className="px-3 py-3 text-mist">{ago(r.created_at)}</td>
                <td className="px-3 py-3 text-right text-foam">{nfmt(r.views)}</td>
                <td className="px-3 py-3 text-right text-foam">{nfmt(r.comments)}</td>
                <td className="px-3 py-3 text-right text-foam">{nfmt(r.likes)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                    <button onClick={() => { setErr(null); setEdit(r); }} className="font-semibold text-teal hover:underline">Edit</button>
                    <Link href={`/watch/${r.id}`} className="text-mist hover:text-foam">View</Link>
                    <button onClick={() => remove(r.id)} className="text-mist hover:text-loonred">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-edge bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foam">Edit video</h3>

            <label className="lt-label mt-4">Title</label>
            <input className="lt-input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />

            <label className="lt-label mt-3">Description</label>
            <textarea className="lt-input min-h-[100px]" value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />

            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="lt-label">Visibility</label>
                <select className="lt-input" value={edit.visibility} onChange={(e) => setEdit({ ...edit, visibility: e.target.value })}>
                  {VIS.map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="lt-label">Schedule release</label>
                <input type="datetime-local" className="lt-input" value={toLocal(edit.scheduled_at)} onChange={(e) => setEdit({ ...edit, scheduled_at: toIso(e.target.value) })} />
              </div>
            </div>

            <div className="mt-3">
              <label className="lt-label">Thumbnail</label>
              <input ref={thumbInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadThumb(e.target.files[0])} />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => thumbInput.current?.click()} disabled={thumbBusy}
                  className="relative aspect-video w-32 shrink-0 overflow-hidden rounded border border-edge bg-black transition hover:border-hair disabled:opacity-60">
                  {edit.thumbnail
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={edit.thumbnail} alt="" className="h-full w-full object-cover" />
                    : <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
                  <span className="absolute inset-0 grid place-items-center bg-black/30 text-xs font-semibold text-foam opacity-0 transition hover:opacity-100">
                    {thumbBusy ? "Uploading…" : "Change"}
                  </span>
                </button>
                <div className="text-xs text-mist">
                  <button type="button" onClick={() => thumbInput.current?.click()} disabled={thumbBusy} className="font-semibold text-teal hover:underline">
                    {thumbBusy ? "Uploading…" : "Upload custom thumbnail"}
                  </button>
                  <p className="mt-1">JPG or PNG, 16:9 recommended.</p>
                </div>
              </div>
            </div>

            {err && <p className="mt-3 text-sm text-loonred">{err}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEdit(null)} className="text-sm font-semibold text-mist hover:text-foam">Cancel</button>
              <button onClick={save} disabled={busy} className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-50" style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
